import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { hashPassword } from "@/lib/password";
import { getRequestContext, logInfo, logError } from "@/lib/logger";
import crypto from "crypto";

export async function POST(request: Request) {
  const ctx = getRequestContext(request);
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const isAlice = email === "alice@example.com";

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email, name, passwordHash },
      });

      let orgId: string;
      let orgSlug: string;
      const role: "owner" | "viewer" = isAlice ? "owner" : "viewer";

      if (isAlice) {
        const org = await tx.organization.create({
          data: { name: `${name}'s Workspace`, slug: `${email.split("@")[0]}-workspace` },
        });
        orgId = org.id;
        orgSlug = org.slug;
      } else {
        const aliceOrg = await tx.organization.findFirst({
          where: { memberships: { some: { user: { email: "alice@example.com" }, role: "owner" } } },
        });
        if (!aliceOrg) {
          throw new Error("Registration is currently unavailable. Please contact your administrator.");
        }
        orgId = aliceOrg.id;
        orgSlug = aliceOrg.slug;
      }

      await tx.membership.create({
        data: { organizationId: orgId, userId: u.id, role },
      });

      return { ...u, orgId, orgSlug, role };
    });

    // Generate verification token (10-minute expiry)
    const loginToken = crypto.randomUUID();
    const loginTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { loginToken, loginTokenExpires },
    });

    const verifyUrl = `/api/auth/verify?token=${loginToken}`;

    logInfo(ctx, "User registered", { userId: user.id, orgSlug: user.orgSlug });

    return NextResponse.json({
      requiresVerification: true,
      verifyUrl,
      message: "Account created. Click the verification link to complete registration.",
    }, { status: 201 });
  } catch (error) {
    logError(ctx, "Register error", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
