"use client";
import { useEffect, useState } from "react";
import type { AIScoreResponse } from "@/components/workflow/types";

interface Props {
  leadId: string;
  orgSlug: string;
}

export function AIInsightsCard({ leadId, orgSlug }: Props) {
  const [result, setResult] = useState<AIScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchScore() {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/ai/score-lead`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        });
        if (!res.ok) throw new Error("Scoring failed");
        const data = await res.json();
        if (!cancelled) setResult(data);
      } catch {
        if (!cancelled) setError("Unable to analyze");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchScore();
    return () => { cancelled = true; };
  }, [leadId, orgSlug]);

  const scoreColor = result?.label === "hot"
    ? "bg-red-500" : result?.label === "warm"
    ? "bg-yellow-500" : "bg-gray-400";

  const badgeColor = result?.label === "hot"
    ? "bg-red-100 text-red-700" : result?.label === "warm"
    ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600";

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-gray-500 mb-3">AI Insights</p>
      {loading ? (
        <p className="text-sm text-gray-400">Analyzing...</p>
      ) : error ? (
        <p className="text-sm text-gray-400">{error}</p>
      ) : result ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-14 h-14 rounded-full text-lg font-bold text-white ${scoreColor}`}>
              {result.score}
            </div>
            <div>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
                {result.label.toUpperCase()}
              </span>
              <p className="text-sm text-gray-600 mt-1">{result.reason}</p>
            </div>
          </div>
          {result.nextAction && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Suggested Next Action</p>
              <p className="text-sm text-blue-900">{result.nextAction}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
