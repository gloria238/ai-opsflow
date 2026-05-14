import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "view_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const [recentEvent, activeRuns] = await Promise.all([
    prisma.workflowRunEvent.findFirst({
      where: { createdAt: { gte: fiveMinAgo } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.workflowRun.count({ where: { status: "running" } }),
  ]);

  const worker = {
    status: recentEvent ? "running" : "idle",
    lastPoll: recentEvent?.createdAt?.toISOString() ?? null,
    activeRuns,
  };

  const orgFilter = { workflowVersion: { workflow: { organizationId: membership.organizationId } } };
  const [queued, running, dead] = await Promise.all([
    prisma.workflowRun.count({ where: { status: "queued", ...orgFilter } }),
    prisma.workflowRun.count({ where: { status: "running", ...orgFilter } }),
    prisma.workflowRun.count({ where: { status: "dead_letter", ...orgFilter } }),
  ]);

  return NextResponse.json({
    worker,
    queue: { queued, running, dead_letter: dead },
  });
}
