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
    await prisma.$transaction(async (tx) => {
      // Update workflow metadata if provided
      if (body.name || body.description !== undefined) {
        await tx.workflow.update({
          where: { id: params.id },
          data: {
            ...(body.name && { name: body.name }),
            ...(body.description !== undefined && { description: body.description }),
          },
        });
      }

      if (!body.nodes || !body.edges) return;

      // Get current version number
      const latest = await tx.workflowVersion.findFirst({
        where: { workflowId: params.id },
        orderBy: { version: "desc" },
      });

      const newVersion = await tx.workflowVersion.create({
        data: { workflowId: params.id, version: (latest?.version ?? 0) + 1 },
      });

      // Batch create nodes with client-provided IDs so edges can reference them
      await tx.workflowNode.createMany({
        data: body.nodes.map((node: { id?: string; type: string; label?: string; config?: unknown; positionX?: number; positionY?: number; position?: { x: number; y: number } }) => ({
          id: node.id, // use client-provided ID
          versionId: newVersion.id,
          type: node.type,
          label: node.label || null,
          config: node.config || {},
          positionX: node.positionX ?? node.position?.x ?? 0,
          positionY: node.positionY ?? node.position?.y ?? 0,
        })),
      });

      // Batch create edges
      await tx.workflowEdge.createMany({
        data: body.edges.map((edge: { sourceNodeId?: string; source?: string; targetNodeId?: string; target?: string; sourceHandle?: string | null }) => ({
          versionId: newVersion.id,
          sourceNodeId: edge.sourceNodeId ?? edge.source,
          targetNodeId: edge.targetNodeId ?? edge.target,
          sourceHandle: edge.sourceHandle || null,
        })),
      });

      await tx.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          userId: session.userId,
          userName: session.name ?? "Unknown",
          action: "workflow.updated",
          targetType: "Workflow",
          targetId: params.id,
          metadata: { nodeCount: body.nodes.length, edgeCount: body.edges.length },
        },
      });
    });

    // Fetch and return after transaction
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

  try { requirePermission(membership.role, "manage_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, organizationId: membership.organizationId },
  });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.workflow.delete({ where: { id: params.id } });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session.userId,
        userName: session.name ?? "Unknown",
        action: "workflow.deleted",
        targetType: "Workflow",
        targetId: params.id,
        metadata: { name: workflow.name },
      },
    });
  });

  return new NextResponse(null, { status: 204 });
}
