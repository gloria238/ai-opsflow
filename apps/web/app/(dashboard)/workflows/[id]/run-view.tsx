"use client";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useRealtimeRuns } from "@/lib/use-realtime-runs";
import type { AIAnomalyAnalysis } from "@/components/workflow/types";

interface Props {
  workflowId: string;
  orgSlug: string;
}

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  queued: "default",
  running: "warning",
  completed: "success",
  failed: "danger",
  dead_letter: "danger",
};

export function WorkflowRunView({ workflowId, orgSlug }: Props) {
  const { runs, error, loading } = useRealtimeRuns(orgSlug, workflowId);
  const [analysisMap, setAnalysisMap] = useState<Map<string, AIAnomalyAnalysis>>(new Map());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [analysisErrors, setAnalysisErrors] = useState<Map<string, string>>(new Map());

  const analyzeRun = useCallback(async (runId: string) => {
    if (analyzingIds.has(runId)) return;
    setAnalyzingIds((prev) => new Set(prev).add(runId));
    setAnalysisErrors((prev) => {
      const next = new Map(prev);
      next.delete(runId);
      return next;
    });
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/ai/analyze-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalysisErrors((prev) => new Map(prev).set(runId, data.error || "Analysis failed"));
        return;
      }
      setAnalysisMap((prev) => new Map(prev).set(runId, data));
    } catch {
      setAnalysisErrors((prev) => new Map(prev).set(runId, "Network error"));
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  }, [orgSlug, analyzingIds]);

  if (error) {
    return <div className="rounded-lg border p-8 text-center text-red-500">{error}</div>;
  }

  if (loading) {
    return <div className="rounded-lg border p-8 text-center text-gray-400">Loading runs...</div>;
  }

  if (runs.length === 0) {
    return <div className="rounded-lg border p-8 text-center text-gray-500">No runs yet. Trigger a workflow run to see results here.</div>;
  }

  return (
    <div className="space-y-4">
      {runs.map((run) => (
        <div key={run.id} className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Run</span>
              <Badge variant={statusVariant[run.status] || "default"}>{run.status}</Badge>
            </div>
            <span className="text-xs text-gray-400">
              {run.createdAt ? new Date(run.createdAt).toLocaleString() : ""}
            </span>
          </div>
          {run.events.length > 0 && (
            <div className="space-y-2 mt-3">
              <p className="text-xs text-gray-500 font-medium">Events</p>
              {run.events.map((event) => (
                <div key={event.id} className="flex items-center gap-3 text-sm bg-gray-50 rounded px-3 py-2">
                  <Badge variant={statusVariant[event.status] || "default"}>{event.status}</Badge>
                  <span className="text-gray-600">{event.nodeId}</span>
                </div>
              ))}
            </div>
          )}

          {(run.status === "failed" || run.status === "dead_letter") && (
            <div className="mt-3">
              {analysisMap.has(run.id) ? (
                <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs space-y-2">
                  <div>
                    <span className="font-semibold text-red-700">Root cause:</span>
                    <span className="text-red-600 ml-1">{analysisMap.get(run.id)!.rootCause}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-red-700">Suggested fix:</span>
                    <span className="text-red-600 ml-1">{analysisMap.get(run.id)!.suggestedFix}</span>
                  </div>
                </div>
              ) : analysisErrors.has(run.id) ? (
                <div className="text-xs text-red-500 bg-red-50 rounded p-2 space-y-1.5">
                  <p>{analysisErrors.get(run.id)}</p>
                  <button onClick={() => analyzeRun(run.id)} className="underline hover:text-red-700">Retry</button>
                </div>
              ) : analyzingIds.has(run.id) ? (
                <span className="text-xs text-gray-400">Analyzing...</span>
              ) : (
                <button
                  onClick={() => analyzeRun(run.id)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Analyze with AI
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
