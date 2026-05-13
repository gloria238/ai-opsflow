import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { getRequestContext, logInfo, logWarn, logError } from "@/lib/logger";

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logWarn(ctx, "Login failed: user not found", { email });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      logWarn(ctx, "Login failed: wrong password", { email });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      orgId: membership.organizationId,
      orgSlug: membership.organization.slug,
      role: membership.role,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      org: { id: membership.organizationId, slug: membership.organization.slug, name: membership.organization.name },
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    logInfo(ctx, "Login successful", { userId: user.id, orgSlug: membership.organization.slug });
    return response;
  } catch (error) {
    logError(ctx, "Login error", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "Internal server error", detail: message },
      { status: 500 },
    );
  }
}
