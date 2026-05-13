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

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));

  const where: Record<string, unknown> = {
    workflowVersion: { workflow: { organizationId: membership.organizationId } },
  };
  if (status) where.status = status;

  const [runs, total] = await Promise.all([
    prisma.workflowRun.findMany({
      where,
      include: {
        events: { orderBy: { createdAt: "asc" }, take: 5 },
        workflowVersion: { include: { workflow: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.workflowRun.count({ where }),
  ]);

  return NextResponse.json({
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      workflowName: r.workflowVersion?.workflow?.name ?? "Unknown",
      createdAt: r.createdAt,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      eventCount: r.events.length,
      lastEventStatus: r.events[r.events.length - 1]?.status ?? null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
