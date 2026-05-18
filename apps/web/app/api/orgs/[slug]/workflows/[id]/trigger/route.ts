import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";

export async function POST(request: Request, { params }: { params: { slug: string; id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "run_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  // Verify workflow belongs to the org before triggering
  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, organizationId: membership.organizationId },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const latestVersion = await prisma.workflowVersion.findFirst({
    where: { workflowId: params.id },
    orderBy: { version: "desc" },
  });

  if (!latestVersion) {
    return NextResponse.json({ error: "No workflow version found" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  const run = await prisma.workflowRun.create({
    data: {
      versionId: latestVersion.id,
      input: { _orgId: membership.organizationId, ...((body.input as object) || {}) },
      status: "queued",
    },
  });

  // Enqueue the run for BullMQ processing (non-critical — run is already persisted)
  try {
    const { workflowQueue } = await import("@opsflow/worker/queue");
    await workflowQueue.add("execute", { runId: run.id });
  } catch {
    console.warn("Trigger: queue unavailable (REDIS_URL not configured). Run will stay queued.");
  }

  return NextResponse.json(run, { status: 201 });
}
