"use client";
import { useEffect, useState } from "react";
import type { RunNodeStatus } from "./types";

interface RunInfo {
  id: string;
  status: string;
  createdAt: string;
  events: { nodeId: string; status: string }[];
}

interface Props {
  workflowId: string;
  orgSlug: string;
  onSelect: (statusMap: Map<string, RunNodeStatus> | null) => void;
}

export function RunSelector({ workflowId, orgSlug, onSelect }: Props) {
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchRuns() {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/workflows/${workflowId}/runs`);
        if (!res.ok) return;
        const data = await res.json();
        setRuns(data.slice(0, 20));
      } catch { /* ignore */ }
    }
    fetchRuns();
  }, [workflowId, orgSlug]);

  useEffect(() => {
    if (!selectedRunId) {
      onSelect(null);
      return;
    }
    const run = runs.find((r) => r.id === selectedRunId);
    if (!run) {
      onSelect(null);
      return;
    }
    const map = new Map<string, RunNodeStatus>();
    for (const event of run.events) {
      if (event.status === "success" || event.status === "failed") {
        map.set(event.nodeId, event.status as RunNodeStatus);
      }
    }
    onSelect(map);
  }, [selectedRunId, runs, onSelect]);

  const badgeColor: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    running: "bg-blue-100 text-blue-700",
    queued: "bg-gray-100 text-gray-600",
    dead_letter: "bg-red-100 text-red-700",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 text-xs border rounded-lg px-3 py-1.5 transition-colors ${
          selectedRunId ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {selectedRunId ? `Run ${selectedRunId.slice(0, 8)}...` : "Run History"}
      </button>

      {expanded && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setExpanded(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-72 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto">
            <div className="p-2 border-b text-xs font-semibold text-gray-500">Recent Runs</div>
            {runs.length === 0 ? (
              <div className="p-4 text-xs text-gray-400 text-center">No runs yet</div>
            ) : (
              runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => {
                    setSelectedRunId(run.id === selectedRunId ? null : run.id);
                    setExpanded(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 text-xs transition-colors ${
                    run.id === selectedRunId ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="font-mono text-gray-700">{run.id.slice(0, 12)}...</span>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 font-medium ${badgeColor[run.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {run.status}
                    </span>
                    <span className="text-gray-400">
                      {new Date(run.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))
            )}
            {selectedRunId && (
              <button
                onClick={() => { setSelectedRunId(null); setExpanded(false); }}
                className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 border-t"
              >
                Clear selection
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
