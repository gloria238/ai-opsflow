"use client";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  workflowId: string;
  orgSlug: string;
}

export function TriggerButton({ workflowId, orgSlug }: Props) {
  const [triggering, setTriggering] = useState(false);

  async function handleTrigger() {
    setTriggering(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/workflows/${workflowId}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Trigger failed");
      const run = await res.json();
      toast.success(`Run ${run.id.slice(0, 8)}... queued`);
    } catch {
      toast.error("Failed to trigger workflow");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <button
      onClick={handleTrigger}
      disabled={triggering}
      className="rounded-lg border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {triggering ? "Triggering..." : "Run Now"}
    </button>
  );
}
