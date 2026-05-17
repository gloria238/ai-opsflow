import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { slug: string; id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "view_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, organizationId: membership.organizationId },
    include: {
      versions: {
        take: 1,
        orderBy: { version: "desc" },
        include: { nodes: true, edges: true },
      },
    },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(workflow);
}

export async function PUT(request: Request, { params }: { params: { slug: string; id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "manage_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, organizationId: membership.organizationId },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  // If updating graph (nodes + edges), create a new version
  if (body.nodes || body.edges || body.name || body.description) {
    // Sequential ops (no interactive $transaction — compatible with Supabase pgBouncer transaction mode)
    if (body.name || body.description !== undefined) {
      await prisma.workflow.update({
        where: { id: params.id },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
        },
      });
    }

    if (body.nodes && body.edges) {
      // Clean up previous latest version so node IDs can be reused
      const previous = await prisma.workflowVersion.findFirst({
        where: { workflowId: params.id },
        orderBy: { version: "desc" },
        include: { _count: { select: { runs: true } } },
      });

      if (previous) {
        await prisma.workflowEdge.deleteMany({ where: { versionId: previous.id } });
        await prisma.workflowNode.deleteMany({ where: { versionId: previous.id } });
        if (previous._count.runs === 0) {
          await prisma.workflowVersion.delete({ where: { id: previous.id } });
        }
      }

      const newVersion = await prisma.workflowVersion.create({
        data: { workflowId: params.id, version: (previous?.version ?? 0) + 1 },
      });

      await prisma.workflowNode.createMany({
        data: body.nodes.map((node: { id?: string; type: string; label?: string; config?: unknown; positionX?: number; positionY?: number; position?: { x: number; y: number } }) => ({
          id: node.id,
          versionId: newVersion.id,
          type: node.type,
          label: node.label || null,
          config: node.config || {},
          positionX: node.positionX ?? node.position?.x ?? 0,
          positionY: node.positionY ?? node.position?.y ?? 0,
        })),
      });

      await prisma.workflowEdge.createMany({
        data: body.edges.map((edge: { sourceNodeId?: string; source?: string; targetNodeId?: string; target?: string; sourceHandle?: string | null }) => ({
          versionId: newVersion.id,
          sourceNodeId: edge.sourceNodeId ?? edge.source,
          targetNodeId: edge.targetNodeId ?? edge.target,
          sourceHandle: edge.sourceHandle || null,
        })),
      });
    }

    await logAudit({
      organizationId: membership.organizationId,
      userId: session.userId,
      userName: session.name ?? "Unknown",
      action: "workflow.updated",
      targetType: "Workflow",
      targetId: params.id,
      metadata: { nodeCount: body.nodes?.length ?? 0, edgeCount: body.edges?.length ?? 0 },
    });

    const updated = await prisma.workflow.findFirst({
      where: { id: params.id },
      include: {
        versions: {
          take: 1,
          orderBy: { version: "desc" },
          include: { nodes: true, edges: true },
        },
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "No changes provided" }, { status: 400 });
}

export async function DELETE(request: Request, { params }: { params: { slug: string; id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "delete_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, organizationId: membership.organizationId },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade delete manually: runs → events → edges → nodes → versions → workflow
  const versionIds = (await prisma.workflowVersion.findMany({
    where: { workflowId: params.id },
    select: { id: true },
  })).map((v) => v.id);

  const runIds = (await prisma.workflowRun.findMany({
    where: { versionId: { in: versionIds } },
    select: { id: true },
  })).map((r) => r.id);

  await prisma.$transaction([
    prisma.workflowRunEvent.deleteMany({ where: { runId: { in: runIds } } }),
    prisma.workflowRun.deleteMany({ where: { versionId: { in: versionIds } } }),
    prisma.workflowEdge.deleteMany({ where: { versionId: { in: versionIds } } }),
    prisma.workflowNode.deleteMany({ where: { versionId: { in: versionIds } } }),
    prisma.workflowVersion.deleteMany({ where: { workflowId: params.id } }),
    prisma.workflow.delete({ where: { id: params.id } }),
  ]);

  await logAudit({
    organizationId: membership.organizationId,
    userId: session.userId,
    userName: session.name ?? "Unknown",
    action: "workflow.deleted",
    targetType: "Workflow",
    targetId: params.id,
    metadata: { name: workflow.name },
  });

  return new NextResponse(null, { status: 204 });
}
