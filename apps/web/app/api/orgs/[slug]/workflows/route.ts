import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: { slug: string } }) {
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

  const workflows = await prisma.workflow.findMany({
    where: { organizationId: membership.organizationId },
    include: { versions: { take: 1, orderBy: { version: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(workflows);
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
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
    requirePermission(membership.role, "manage_workflows");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const workflow = await prisma.workflow.create({
    data: {
      organizationId: membership.organizationId,
      name,
      description: description || null,
      versions: { create: { version: 1 } },
    },
    include: { versions: { take: 1, orderBy: { version: "desc" } } },
  });

  await logAudit({
    organizationId: membership.organizationId,
    userId: session.userId,
    userName: session.name ?? "Unknown",
    action: "workflow.created",
    targetType: "Workflow",
    targetId: workflow.id,
    metadata: { name, description },
  });

  return NextResponse.json(workflow, { status: 201 });
}
