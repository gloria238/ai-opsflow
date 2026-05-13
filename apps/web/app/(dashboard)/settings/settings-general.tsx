"use client";
import { useState } from "react";

interface Props {
  orgId: string;
  initialName: string;
  initialSlug: string;
  orgSlug: string;
  canManage: boolean;
}

export function SettingsGeneralForm({ initialName, initialSlug, orgSlug, canManage }: Props) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/orgs/${orgSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(name !== initialName && { name }),
          ...(slug !== initialSlug && { slug }),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }
      setMessage("Saved successfully");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-600">Organization Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canManage}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Slug</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={!canManage}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
      </div>

      {message && (
        <p className={`text-sm ${message === "Saved successfully" ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}

      {canManage && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      )}
    </div>
  );
}
