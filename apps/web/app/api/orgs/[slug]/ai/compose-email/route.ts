import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { callDeepSeekJSON } from "@/lib/ai";
import { COMPOSE_EMAIL_SYSTEM, buildComposeEmailPrompt } from "@/lib/prompts";
import { isEnabled } from "@/lib/feature-flags";
import { getRequestContext, logWarn } from "@/lib/logger";

const VALID_TYPES = ["welcome", "follow-up", "cold-outreach", "re-engagement", "proposal"];

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "manage_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  if (!isEnabled("ai_compose_email")) {
    logWarn(getRequestContext(request), "AI email composition disabled by feature flag");
    return NextResponse.json({ error: "AI email composition is disabled" }, { status: 503 });
  }

  const body = await request.json();
  const emailType = body.emailType || "follow-up";

  if (!VALID_TYPES.includes(emailType)) {
    return NextResponse.json({ error: `Invalid emailType. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }

  let leadContext: Record<string, unknown>;

  if (body.leadId) {
    const dbLead = await prisma.lead.findFirst({
      where: { id: body.leadId, organizationId: membership.organizationId },
    });
    if (!dbLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    leadContext = {
      name: dbLead.name,
      email: dbLead.email,
      stage: dbLead.stage,
      tags: dbLead.tags,
    };
  } else if (body.leadContext) {
    leadContext = body.leadContext;
  } else {
    return NextResponse.json({ error: "leadId or leadContext required" }, { status: 400 });
  }

  try {
    const prompt = buildComposeEmailPrompt({
      emailType,
      leadContext,
      additionalContext: body.additionalContext,
    });
    const result = await callDeepSeekJSON<{ subject: string; body: string }>(
      prompt,
      COMPOSE_EMAIL_SYSTEM,
      { temperature: 0.7 },
    );

    return NextResponse.json({
      subject: result.subject || "No subject generated",
      body: result.body || "No body generated",
      emailType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email composition failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
