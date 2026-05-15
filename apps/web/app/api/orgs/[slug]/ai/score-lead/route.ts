import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { callDeepSeekJSON } from "@/lib/ai";
import { LEAD_SCORING_SYSTEM, buildLeadScoringPrompt } from "@/lib/prompts";
import type { AIScoreResponse } from "@/components/workflow/types";
import { isEnabled } from "@/lib/feature-flags";
import { getRequestContext, logWarn } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "view_leads"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  if (!isEnabled("ai_lead_scoring")) {
    logWarn(getRequestContext(request), "AI lead scoring disabled by feature flag");
    return NextResponse.json({ error: "AI lead scoring is disabled" }, { status: 503 });
  }

  const body = await request.json();

  let lead: { name: string; email?: string | null; stage?: string | null; tags?: Record<string, unknown> | null; createdAt: string };

  if (body.leadId) {
    const dbLead = await prisma.lead.findFirst({
      where: { id: body.leadId, organizationId: membership.organizationId },
    });
    if (!dbLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    lead = {
      name: dbLead.name,
      email: dbLead.email,
      stage: dbLead.stage,
      tags: dbLead.tags as Record<string, unknown> | null,
      createdAt: dbLead.createdAt.toISOString(),
    };
  } else if (body.name) {
    lead = {
      name: body.name,
      email: body.email || null,
      stage: body.stage || null,
      tags: body.tags || null,
      createdAt: body.createdAt || new Date().toISOString(),
    };
  } else {
    return NextResponse.json({ error: "leadId or name required" }, { status: 400 });
  }

  try {
    const prompt = buildLeadScoringPrompt(lead);
    const result = await callDeepSeekJSON<AIScoreResponse>(prompt, LEAD_SCORING_SYSTEM, { temperature: 0.3 });
    const score = Math.max(0, Math.min(100, Math.round(result.score ?? 0)));
    const label = score >= 75 ? "hot" : score >= 40 ? "warm" : "cold";

    return NextResponse.json({
      score,
      label,
      reason: result.reason || "No analysis available",
      nextAction: result.nextAction || "Review lead details",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
