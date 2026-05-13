import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request, { params }: { params: { slug: string; id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    requirePermission(membership.role, "view_workflows");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const runs = await prisma.workflowRun.findMany({
    where: {
      workflowVersion: {
        workflowId: params.id,
        workflow: { organizationId: membership.organizationId },
      },
    },
    include: { events: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(runs);
}
