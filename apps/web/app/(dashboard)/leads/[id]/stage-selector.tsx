"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

const STAGES = ["new", "qualified", "proposal", "negotiation", "closed-won", "closed-lost"];

interface Props {
  currentStage: string;
  leadId: string;
  orgSlug: string;
}

export function StageSelector({ currentStage, leadId, orgSlug }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = useCallback(async (value: string) => {
    if (value === currentStage) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: value }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      setError("Update failed");
    } finally {
      setLoading(false);
    }
  }, [currentStage, leadId, orgSlug, router]);

  return (
    <div>
      <Select value={currentStage} onValueChange={handleChange}>
        <SelectTrigger className={loading ? "opacity-50" : ""} />
        <SelectContent>
          {STAGES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
