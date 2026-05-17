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
    requirePermission(membership.role, "view_leads");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const stage = url.searchParams.get("stage") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";

  const where: Record<string, unknown> = { organizationId: membership.organizationId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (stage) {
    where.stage = stage;
  }

  const allowedSortFields = ["name", "email", "stage", "createdAt"];
  const actualSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
  const actualSortOrder = sortOrder === "asc" ? "asc" : "desc";

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { [actualSortBy]: actualSortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
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
    requirePermission(membership.role, "manage_leads");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, stage } = await request.json();

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const lead = await prisma.$transaction(async (tx) => {
    const l = await tx.lead.create({
      data: {
        organizationId: membership.organizationId,
        name,
        email,
        stage: stage || "new",
      },
    });

    await tx.leadActivity.create({
      data: {
        leadId: l.id,
        organizationId: membership.organizationId,
        userId: session.userId,
        userName: session.name ?? "Unknown",
        type: "created",
        content: "Lead created",
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session.userId,
        userName: session.name ?? "Unknown",
        action: "lead.created",
        targetType: "Lead",
        targetId: l.id,
        metadata: { name, email, stage: stage || "new" },
      },
    });

    return l;
  });

  return NextResponse.json(lead, { status: 201 });
}
