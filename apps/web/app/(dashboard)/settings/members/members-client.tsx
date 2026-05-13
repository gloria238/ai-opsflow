"use client";
import { useCallback, useEffect, useState } from "react";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  orgSlug: string;
  canManage: boolean;
}

const ROLES = ["owner", "admin", "operator", "viewer"];

export function MembersClient({ orgSlug, canManage }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("operator");

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/members`);
      if (!res.ok) throw new Error("Failed to fetch");
      setMembers(await res.json());
    } catch {
      setError("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleAdd = useCallback(async () => {
    if (!addEmail.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add member");
      }
      setAddEmail("");
      setAddRole("operator");
      fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  }, [addEmail, addRole, orgSlug, fetchMembers]);

  const handleRoleChange = useCallback(async (membershipId: string, role: string) => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }
      fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  }, [orgSlug, fetchMembers]);

  const handleRemove = useCallback(async (membershipId: string) => {
    if (!confirm("Remove this member?")) return;
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/members/${membershipId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove member");
      }
      fetchMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  }, [orgSlug, fetchMembers]);

  if (loading) return <div className="text-gray-400 text-sm py-8 text-center">Loading...</div>;

  return (
    <div className="space-y-4">
      {error && <div className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      {canManage && (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
          <input
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={addRole}
            onChange={(e) => setAddRole(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !addEmail.trim()}
            className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? "Adding..." : "Add Member"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{m.name || "Unnamed"}</p>
              <p className="text-xs text-gray-500">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {canManage ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{m.role}</span>
              )}
              {canManage && (
                <button
                  onClick={() => handleRemove(m.id)}
                  className="text-xs text-red-600 hover:underline ml-2"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
