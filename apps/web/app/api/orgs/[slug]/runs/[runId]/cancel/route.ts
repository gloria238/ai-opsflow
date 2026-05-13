import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: { slug: string; runId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "manage_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const run = await prisma.workflowRun.findFirst({
    where: { id: params.runId, workflowVersion: { workflow: { organizationId: membership.organizationId } } },
  });
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  if (run.status !== "queued" && run.status !== "running") {
    return NextResponse.json({ error: "Only queued or running runs can be cancelled" }, { status: 400 });
  }

  const updated = await prisma.workflowRun.update({
    where: { id: params.runId },
    data: { status: "failed", finishedAt: new Date() },
  });

  return NextResponse.json(updated);
}
