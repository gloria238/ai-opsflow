"use client";
import { useCallback, useState } from "react";
import type { WorkflowFlowNode, WorkflowFlowEdge, AIGeneratedNode, AIGeneratedEdge } from "./types";

interface Props {
  orgSlug: string;
  onGenerate: (nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => void;
}

export function AIWorkflowGenerator({ orgSlug, onGenerate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/ai/generate-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const nodes: WorkflowFlowNode[] = data.nodes.map((n: AIGeneratedNode & { id: string }) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { label: n.label, nodeType: n.type, config: n.config },
      }));

      const edges: WorkflowFlowEdge[] = data.edges.map((e: AIGeneratedEdge & { id: string }) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
      }));

      onGenerate(nodes, edges);
      setExpanded(false);
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate workflow");
    } finally {
      setLoading(false);
    }
  }, [description, orgSlug, onGenerate]);

  return (
    <div className="border-b bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 w-full transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
        <span className="font-medium">Generate with AI</span>
        <span className="text-xs text-gray-400">(describe your workflow in plain English)</span>
        <span className="ml-auto">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <textarea
            placeholder='Example: When a new lead is created, check if their email is from a company domain. If yes, send a welcome email and wait 2 days. Then check if they opened it. If they did, mark as qualified. If not, send a follow-up email.'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            maxLength={2000}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <div className="text-right text-xs text-gray-400">{description.length}/2000</div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Generating..." : "Generate Workflow"}
            </button>
            <span className="text-xs text-gray-400">This will replace the current canvas content.</span>
          </div>
        </div>
      )}
    </div>
  );
}
