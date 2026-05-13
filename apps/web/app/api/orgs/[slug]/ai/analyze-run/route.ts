import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { callDeepSeekJSON } from "@/lib/ai";
import { ANOMALY_ANALYSIS_SYSTEM, buildAnomalyAnalysisPrompt } from "@/lib/prompts";
import type { AIAnomalyAnalysis } from "@/components/workflow/types";
import { isEnabled } from "@/lib/feature-flags";
import { getRequestContext, logWarn } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "view_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { runId } = await request.json();
  if (!runId) return NextResponse.json({ error: "runId is required" }, { status: 400 });

  const run = await prisma.workflowRun.findFirst({
    where: {
      id: runId,
      workflowVersion: { workflow: { organizationId: membership.organizationId } },
    },
    include: {
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  if (!isEnabled("ai_anomaly_detection")) {
    logWarn(getRequestContext(request), "AI anomaly detection disabled by feature flag");
    return NextResponse.json({ error: "AI anomaly detection is disabled" }, { status: 503 });
  }
  if (run.status !== "failed" && run.status !== "dead_letter") {
    return NextResponse.json({ error: "Run is not in a failed state" }, { status: 400 });
  }

  try {
    const events = run.events.map((e) => ({
      nodeId: e.nodeId,
      status: e.status,
      input: e.input,
      output: e.output,
    }));

    const prompt = buildAnomalyAnalysisPrompt(run.id, run.status, events);
    const analysis = await callDeepSeekJSON<{
      rootCause: string;
      failedNode: string;
      suggestedFix: string;
      isTransient: boolean;
    }>(prompt, ANOMALY_ANALYSIS_SYSTEM, { temperature: 0.3 });

    return NextResponse.json({
      rootCause: analysis.rootCause || "Unknown",
      failedNode: analysis.failedNode || "Unknown",
      suggestedFix: analysis.suggestedFix || "Manual investigation required",
      isTransient: analysis.isTransient ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
