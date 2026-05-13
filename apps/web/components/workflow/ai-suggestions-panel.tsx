"use client";
import { useCallback, useState } from "react";
import type { WorkflowFlowNode, WorkflowFlowEdge, AINodeSuggestion } from "./types";

interface Props {
  orgSlug: string;
  nodes: WorkflowFlowNode[];
  edges: WorkflowFlowEdge[];
  selectedNodeType?: string;
  onAddNode: (node: WorkflowFlowNode) => void;
}

export function AISuggestionsPanel({ orgSlug, nodes, edges, selectedNodeType, onAddNode }: Props) {
  const [suggestions, setSuggestions] = useState<AINodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/ai/suggest-nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: nodes.map((n) => ({ type: n.type, label: n.data.label, config: n.data.config })),
          edges: edges.map((e) => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle })),
          nodeConfig: selectedNodeType ? { type: selectedNodeType } : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get suggestions");
      }
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setLoading(false);
    }
  }, [orgSlug, nodes, edges, selectedNodeType]);

  const addNodeToCanvas = useCallback(
    (suggestion: AINodeSuggestion) => {
      const centerX = 400 + Math.random() * 200 - 100;
      const centerY = 300 + Math.random() * 200 - 100;
      const newNode: WorkflowFlowNode = {
        id: `node_${Math.random().toString(36).slice(2, 9)}`,
        type: suggestion.type,
        position: { x: centerX, y: centerY },
        data: { label: suggestion.label, nodeType: suggestion.type, config: suggestion.config },
      };
      onAddNode(newNode);
    },
    [onAddNode],
  );

  const typeColor = (t: string) => {
    const colors: Record<string, string> = {
      trigger: "bg-emerald-100 text-emerald-700",
      action: "bg-blue-100 text-blue-700",
      condition: "bg-amber-100 text-amber-700",
      delay: "bg-purple-100 text-purple-700",
    };
    return colors[t] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="border-t">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
      >
        <span>AI Suggestions</span>
        <div className="flex items-center gap-2">
          {!expanded && suggestions.length > 0 && (
            <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-[10px]">{suggestions.length}</span>
          )}
          <span>{expanded ? "▼" : "▶"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-2 space-y-2">
          {loading && (
            <div className="text-xs text-gray-400 text-center py-4">Getting AI suggestions...</div>
          )}

          {error && (
            <div className="text-xs text-red-500 bg-red-50 rounded p-2">
              {error}
              <button onClick={fetchSuggestions} className="ml-2 underline">Retry</button>
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div className="text-xs text-gray-400 text-center py-4">
              Click "Suggest" to get AI recommendations
            </div>
          )}

          {!loading && suggestions.map((s, i) => (
            <div
              key={i}
              className={`rounded-lg border bg-white p-2.5 text-xs ${
                s.priority === "high" ? "border-blue-200" : s.priority === "medium" ? "border-gray-200" : "border-gray-100 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-800">{s.label}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColor(s.type)}`}>{s.type}</span>
              </div>
              <p className="text-gray-500 mb-2">{s.reason}</p>
              <button
                onClick={() => addNodeToCanvas(s)}
                className="w-full rounded border border-gray-300 text-gray-700 text-[11px] py-1.5 hover:bg-gray-50 transition-colors"
              >
                + Add to Canvas
              </button>
            </div>
          ))}

          {!loading && (
            <button
              onClick={fetchSuggestions}
              className="w-full rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 py-2 hover:bg-gray-50 transition-colors"
            >
              Suggest Nodes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
