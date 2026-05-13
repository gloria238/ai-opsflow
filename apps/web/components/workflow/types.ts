import type { Node, Edge } from "@xyflow/react";

export type NodeType = "trigger" | "action" | "condition" | "delay";

export type RunNodeStatus = "success" | "failed" | "running" | "delayed" | "pending" | null;

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  config: Record<string, unknown>;
  _runStatus?: RunNodeStatus;
}

export type WorkflowFlowNode = Node<WorkflowNodeData>;
export type WorkflowFlowEdge = Edge;

export interface CanvasWorkflow {
  id: string;
  name: string;
  description: string | null;
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  version: number;
}

export const NODE_COLORS: Record<NodeType, string> = {
  trigger: "#22c55e",
  action: "#3b82f6",
  condition: "#f59e0b",
  delay: "#a855f7",
};

// ── AI Suggestion Types ─────────────────────────────────────────
export interface AINodeSuggestion {
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
  reason: string;
  priority: "high" | "medium" | "low";
}

export interface AIGeneratedNode {
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface AIGeneratedEdge {
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface AIScoreResponse {
  score: number;
  label: "hot" | "warm" | "cold";
  reason: string;
  nextAction: string;
}

export interface AIAnomalyAnalysis {
  rootCause: string;
  failedNode: string;
  suggestedFix: string;
  isTransient: boolean;
}

export const NODE_LABELS: Record<NodeType, string> = {
  trigger: "Trigger",
  action: "Action",
  condition: "Condition",
  delay: "Delay",
};
