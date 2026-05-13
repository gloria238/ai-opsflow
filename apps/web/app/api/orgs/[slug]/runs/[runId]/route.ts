import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request, { params }: { params: { slug: string; runId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "view_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const run = await prisma.workflowRun.findFirst({
    where: {
      id: params.runId,
      workflowVersion: { workflow: { organizationId: membership.organizationId } },
    },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      workflowVersion: { include: { workflow: { select: { name: true } } } },
    },
  });

  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  return NextResponse.json({
    id: run.id,
    status: run.status,
    workflowName: run.workflowVersion?.workflow?.name ?? "Unknown",
    input: run.input,
    output: run.output,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    events: run.events.map((e) => ({
      id: e.id,
      nodeId: e.nodeId,
      status: e.status,
      input: e.input,
      output: e.output,
      createdAt: e.createdAt,
    })),
  });
}
