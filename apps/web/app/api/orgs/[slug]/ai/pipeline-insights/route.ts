import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { callDeepSeekJSON } from "@/lib/ai";
import { isEnabled } from "@/lib/feature-flags";
import { getRequestContext, logWarn } from "@/lib/logger";

const PIPELINE_INSIGHT_SYSTEM = `You are a sales pipeline analyst AI. Analyze CRM pipeline data and provide actionable insights about conversion health, bottlenecks, and recommendations. Be specific with numbers and stage names.

Respond with a JSON object:
- healthScore: integer 0-100 rating overall pipeline health
- bottleneck: string identifying which stage has the biggest drop-off
- conversionPrediction: string predicting expected closed-won deals in next 30 days
- recommendation: string with the single most impactful action to improve pipeline
- stageInsights: array of { stage: string, leads: number, insight: string } for each stage`;

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "view_leads"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  if (!isEnabled("ai_lead_scoring")) {
    logWarn(getRequestContext(request), "AI pipeline insights disabled");
    return NextResponse.json({ error: "AI analytics are disabled" }, { status: 503 });
  }

  const leadsByStage = await prisma.lead.groupBy({
    by: ["stage"],
    where: { organizationId: membership.organizationId },
    _count: true,
  });
  const totalLeads = await prisma.lead.count({ where: { organizationId: membership.organizationId } });
  const wonCount = await prisma.lead.count({ where: { organizationId: membership.organizationId, stage: "closed-won" } });
  const lostCount = await prisma.lead.count({ where: { organizationId: membership.organizationId, stage: "closed-lost" } });

  const stageData = leadsByStage.map((s) => ({ stage: s.stage || "new", leads: s._count }));

  try {
    const prompt = `Analyze this sales pipeline:

Total leads: ${totalLeads}
Won: ${wonCount}, Lost: ${lostCount}
Stage breakdown: ${JSON.stringify(stageData)}

Pipeline stages are: new → qualified → proposal → negotiation → closed-won (or closed-lost).

Return a JSON object with healthScore (0-100), bottleneck (stage name with biggest drop-off), conversionPrediction (expected wins in 30 days), recommendation (single most impactful action), and stageInsights (array per stage with lead count and brief insight).`;

    const insight = await callDeepSeekJSON<{
      healthScore: number; bottleneck: string; conversionPrediction: string;
      recommendation: string; stageInsights: Array<{ stage: string; leads: number; insight: string }>;
    }>(prompt, PIPELINE_INSIGHT_SYSTEM, { temperature: 0.3 });

    return NextResponse.json({
      healthScore: Math.max(0, Math.min(100, Math.round(insight.healthScore ?? 50))),
      bottleneck: insight.bottleneck || "Unknown",
      conversionPrediction: insight.conversionPrediction || "Insufficient data",
      recommendation: insight.recommendation || "Review pipeline regularly",
      stageInsights: insight.stageInsights || stageData.map((s) => ({ ...s, insight: "No insight available" })),
      totalLeads,
      wonCount,
      lostCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
