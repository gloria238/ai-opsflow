import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { callDeepSeekJSON } from "@/lib/ai";
import { NODE_SUGGESTION_SYSTEM, buildNodeSuggestionPrompt } from "@/lib/prompts";
import { isEnabled } from "@/lib/feature-flags";
import { getRequestContext, logWarn } from "@/lib/logger";

const VALID_TYPES = ["trigger", "action", "condition", "delay"];
const VALID_PRIORITIES = ["high", "medium", "low"];

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "manage_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const body = await request.json();
  const nodes = body.nodes ?? [];
  const edges = body.edges ?? [];
  const selectedNodeType: string | undefined = body.nodeConfig?.type;

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return NextResponse.json({ error: "nodes and edges are required" }, { status: 400 });
  }

  if (!isEnabled("ai_suggestions")) {
    logWarn(getRequestContext(request), "AI suggestions disabled by feature flag");
    return NextResponse.json({ error: "AI suggestions are disabled" }, { status: 503 });
  }

  try {
    const prompt = buildNodeSuggestionPrompt(nodes, edges, selectedNodeType);
    const result = await callDeepSeekJSON<{
      suggestions: Array<{
        type: string; label: string; config: Record<string, unknown>;
        reason: string; priority: string;
      }>;
    }>(prompt, NODE_SUGGESTION_SYSTEM, { temperature: 0.5 });

    const rawCount = (result.suggestions || []).length;
    const suggestions = (result.suggestions || [])
      .filter((s) => VALID_TYPES.includes(s.type))
      .map((s) => ({
        type: s.type,
        label: s.label,
        config: s.config ?? {},
        reason: s.reason,
        priority: VALID_PRIORITIES.includes(s.priority) ? s.priority : "medium",
      }))
      .slice(0, 5);

    if (rawCount > 0 && suggestions.length === 0) {
      logWarn(getRequestContext(request), `All ${rawCount} AI suggestions filtered out due to invalid types`);
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI suggestion failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
