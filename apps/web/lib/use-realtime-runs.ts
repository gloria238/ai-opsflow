"use client";
import { useEffect, useRef, useState } from "react";

interface RunEvent {
  id: string;
  nodeId: string;
  status: string;
  output: unknown;
  createdAt: string;
}

interface WorkflowRun {
  id: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  events: RunEvent[];
}

export function useRealtimeRuns(orgSlug: string, workflowId: string) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [error, setError] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orgSlug || !workflowId) return;

    const es = new EventSource(`/api/orgs/${orgSlug}/workflows/${workflowId}/runs/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WorkflowRun[];
        setRuns(data);
        setError("");
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setError("Connection lost. Retrying...");
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [orgSlug, workflowId]);

  return { runs, error };
}
