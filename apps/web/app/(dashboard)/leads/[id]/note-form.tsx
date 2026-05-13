"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  leadId: string;
  orgSlug: string;
}

export function NoteForm({ leadId, orgSlug }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setContent("");
      router.refresh();
    } catch {
      setError("Failed to save note");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder="Add a note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={loading}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button type="submit" disabled={loading || !content.trim()} size="sm">
        {loading ? "Saving..." : "Add Note"}
      </Button>
    </form>
  );
}
