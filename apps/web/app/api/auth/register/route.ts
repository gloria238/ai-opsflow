import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email, name, passwordHash },
      });

      const org = await tx.organization.create({
        data: { name: `${name}'s Workspace`, slug: `${email.split("@")[0]}-workspace` },
      });

      await tx.membership.create({
        data: { organizationId: org.id, userId: u.id, role: "owner" },
      });

      return { ...u, orgId: org.id, orgSlug: org.slug };
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      orgSlug: user.orgSlug,
      role: "owner",
    });

    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
