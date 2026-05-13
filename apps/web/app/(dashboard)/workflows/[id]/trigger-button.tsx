"use client";
import { useState } from "react";

interface Props {
  workflowId: string;
  orgSlug: string;
}

export function TriggerButton({ workflowId, orgSlug }: Props) {
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState("");

  async function handleTrigger() {
    setTriggering(true);
    setMessage("");
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/workflows/${workflowId}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Trigger failed");
      const run = await res.json();
      setMessage(`Run ${run.id.slice(0, 8)}... queued`);
    } catch {
      setMessage("Failed to trigger");
    } finally {
      setTriggering(false);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleTrigger}
        disabled={triggering}
        className="rounded-lg border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {triggering ? "Triggering..." : "Run Now"}
      </button>
      {message && <span className="text-xs text-green-600">{message}</span>}
    </div>
  );
}
