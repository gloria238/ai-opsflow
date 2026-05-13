import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import { callDeepSeekJSON } from "@/lib/ai";
import { WORKFLOW_GENERATION_SYSTEM, buildWorkflowGenerationPrompt } from "@/lib/prompts";
import { isEnabled } from "@/lib/feature-flags";
import { getRequestContext, logWarn } from "@/lib/logger";

const VALID_TYPES = ["trigger", "action", "condition", "delay"];

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "manage_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const { description } = await request.json();
  if (!description || typeof description !== "string") {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (description.length > 2000) {
    return NextResponse.json({ error: "description too long (max 2000 chars)" }, { status: 400 });
  }

  if (!isEnabled("ai_workflow_generation")) {
    logWarn(getRequestContext(request), "AI workflow generation disabled by feature flag");
    return NextResponse.json({ error: "AI workflow generation is disabled" }, { status: 503 });
  }

  try {
    const prompt = buildWorkflowGenerationPrompt(description);
    const result = await callDeepSeekJSON<{
      nodes: Array<{ type: string; label: string; config: Record<string, unknown>; position: { x: number; y: number } }>;
      edges: Array<{ source: string; target: string; sourceHandle?: string }>;
    }>(prompt, WORKFLOW_GENERATION_SYSTEM, { temperature: 0.4, maxTokens: 4000 });

    const nodes = (result.nodes || [])
      .filter((n) => VALID_TYPES.includes(n.type))
      .map((n, i) => ({
        type: n.type,
        label: n.label || n.type.charAt(0).toUpperCase() + n.type.slice(1),
        config: n.config ?? {},
        position: { x: n.position?.x ?? 250, y: n.position?.y ?? 100 + i * 200 },
      }));

    if (nodes.length === 0) {
      return NextResponse.json(
        { error: "AI generated an empty workflow. Try a more detailed description." },
        { status: 422 },
      );
    }

    // Assign IDs and remap edges from indices
    const nodeIds = nodes.map(() => `gen_${Math.random().toString(36).slice(2, 9)}`);
    const edges = (result.edges || [])
      .filter((e) => {
        const s = parseInt(e.source, 10);
        const t = parseInt(e.target, 10);
        return !isNaN(s) && !isNaN(t) && s >= 0 && s < nodes.length && t >= 0 && t < nodes.length;
      })
      .map((e) => ({
        source: nodeIds[parseInt(e.source, 10)],
        target: nodeIds[parseInt(e.target, 10)],
        sourceHandle: ["true", "false"].includes(e.sourceHandle || "") ? e.sourceHandle : undefined,
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }));

    const resultNodes = nodes.map((n, i) => ({ ...n, id: nodeIds[i] }));

    return NextResponse.json({ nodes: resultNodes, edges });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
