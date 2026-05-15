export const NODE_SUGGESTION_SYSTEM = `You are an expert workflow automation designer. Given a partial workflow consisting of nodes and edges, suggest the next nodes that would be useful. Consider the workflow context, typical automation patterns, and best practices.

Respond with a JSON array of suggestions. Each suggestion has:
- type: "trigger" | "action" | "condition" | "delay"
- label: a human-readable name for the suggested node
- config: an object with appropriate configuration for the node type
- reason: a short explanation of why this node would be useful here
- priority: "high" | "medium" | "low" indicating relevance`;

export function buildNodeSuggestionPrompt(
  nodes: Array<{ type: string; label?: string; config?: Record<string, unknown> }>,
  edges: Array<{ source: string; target: string; sourceHandle?: string | null }>,
  selectedNodeType?: string,
): string {
  return `Current workflow:
Nodes: ${JSON.stringify(nodes, null, 2)}
Edges: ${JSON.stringify(edges, null, 2)}
${selectedNodeType ? `The user is configuring a "${selectedNodeType}" node.` : "Suggest general workflow improvements."}

Suggest 3-5 nodes that would be valuable next additions. IMPORTANT: Only use types from ["trigger", "action", "condition", "delay"]. Consider what follows naturally from existing nodes, what common patterns are missing, and how to make the workflow more useful.`;
}

export const WORKFLOW_GENERATION_SYSTEM = `You are an expert workflow automation designer. Convert natural language descriptions into structured workflow definitions.

Respond with a JSON object containing:
- nodes: array of node objects, each with type ("trigger"|"action"|"condition"|"delay"), label (string), config (object with type-appropriate fields), and position (x, y integers)
- edges: array of edge objects, each with source (string, zero-based index), target (string, zero-based index), and optionally sourceHandle ("true"|"false" for condition branches)

Design clean, logical workflows. Use trigger as entry point. Chain actions sequentially. Use conditions for branching. Use delay for timing. Position nodes in a readable top-to-bottom layout with ~200px vertical spacing.`;

export function buildWorkflowGenerationPrompt(description: string): string {
  return `Generate a workflow for the following use case:

"${description}"

Create a complete workflow with appropriate nodes and connections. Include reasonable configurations for each node.`;
}

export const LEAD_SCORING_SYSTEM = `You are a lead scoring AI for a CRM system. Analyze lead data and provide a conversion probability score and actionable reasoning.

Respond with a JSON object:
- score: integer 0-100 representing conversion likelihood
- label: "hot" (75+), "warm" (40-74), or "cold" (0-39)
- reason: 1-2 sentence explanation of the score
- nextAction: suggested next step for this lead`;

export function buildLeadScoringPrompt(lead: {
  name: string;
  email?: string | null;
  stage?: string | null;
  tags?: Record<string, unknown> | null;
  createdAt: string;
}): string {
  return `Score this lead for conversion likelihood:

Name: ${lead.name}
Email: ${lead.email || "N/A"}
Current Stage: ${lead.stage || "new"}
Tags: ${lead.tags ? JSON.stringify(lead.tags) : "none"}
Created: ${lead.createdAt}

Consider the stage progression, any available signals from tags, and typical conversion patterns. Be realistic and data-driven.`;
}

export const ANOMALY_ANALYSIS_SYSTEM = `You are a workflow execution debugger. Analyze the events from a failed workflow run and identify the root cause, impact, and fix. Be specific and actionable.`;

export function buildAnomalyAnalysisPrompt(
  runId: string,
  status: string,
  events: Array<{ nodeId: string; status: string; input?: unknown; output?: unknown }>,
): string {
  return `Analyze this failed workflow run:

Run ID: ${runId}
Status: ${status}
Events: ${JSON.stringify(events, null, 2)}

Identify:
1. Root cause of the failure
2. Which node(s) failed and why
3. Suggested fix or remediation
4. Whether this is a transient or permanent failure`;
}
