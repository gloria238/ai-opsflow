import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { callDeepSeekJSON } from "@/lib/ai";
import { CLASSIFY_EMAIL_SYSTEM, buildClassifyEmailPrompt } from "@/lib/prompts";
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

  if (!isEnabled("ai_classify_email")) {
    logWarn(getRequestContext(request), "AI email classification disabled by feature flag");
    return NextResponse.json({ error: "AI email classification is disabled" }, { status: 503 });
  }

  const body = await request.json();

  if (!body.subject && !body.body) {
    return NextResponse.json({ error: "subject or body is required" }, { status: 400 });
  }

  try {
    const prompt = buildClassifyEmailPrompt({
      subject: body.subject || "(no subject)",
      body: body.body || "",
      fromEmail: body.fromEmail,
    });
    const result = await callDeepSeekJSON<{
      intent: string; sentiment: string; urgency: string; suggestedAction: string;
    }>(prompt, CLASSIFY_EMAIL_SYSTEM, { temperature: 0.3 });

    const validSentiments = ["positive", "neutral", "negative"];
    const validUrgencies = ["high", "medium", "low"];

    return NextResponse.json({
      intent: result.intent || "other",
      sentiment: validSentiments.includes(result.sentiment) ? result.sentiment : "neutral",
      urgency: validUrgencies.includes(result.urgency) ? result.urgency : "medium",
      suggestedAction: result.suggestedAction || "Review manually",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email classification failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
