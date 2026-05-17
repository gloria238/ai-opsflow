import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { hashPassword } from "@/lib/password";
import { getRequestContext, logInfo, logError, logWarn } from "@/lib/logger";
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

    // Send verification email via Resend (if configured)
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin") ?? "http://localhost:3000";
        await resend.emails.send({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: "Verify your OpsFlow account",
          html: `<p>Hi ${name},</p><p>Click the link below to verify your account and get started:</p><p><a href="${baseUrl}${verifyUrl}">${baseUrl}${verifyUrl}</a></p><p>This link expires in 10 minutes.</p>`,
        });
        logInfo(ctx, "Verification email sent", { userId: user.id, email });
      } catch (emailErr) {
        logWarn(ctx, "Failed to send verification email", { userId: user.id, error: String(emailErr) });
      }
    } else {
      logWarn(ctx, "Verification email skipped: RESEND_API_KEY or EMAIL_FROM not configured", { userId: user.id });
    }

    logInfo(ctx, "User registered", { userId: user.id, orgSlug: user.orgSlug });

    return NextResponse.json({
      requiresVerification: true,
      verifyUrl, // fallback: shown in UI if email not received
      message: "Account created. Check your email for the verification link.",
    }, { status: 201 });
  } catch (error) {
    logError(ctx, "Register error", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
