"use client";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ImportButton } from "@/components/leads/import-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STAGES = ["new", "qualified", "proposal", "negotiation", "closed-won", "closed-lost"];
const PAGE_SIZE = 20;

interface Lead {
  id: string;
  name: string;
  email: string | null;
  stage: string | null;
  createdAt: string | Date;
}

interface Props {
  initialLeads: Lead[];
  initialTotal: number;
  orgSlug: string;
  canManage: boolean;
}

export function LeadTableClient({ initialLeads, initialTotal, orgSlug, canManage }: Props) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [aiScores, setAiScores] = useState<Map<string, { score: number; label: string }>>(new Map());
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newStage, setNewStage] = useState("new");

  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const queryKey = ["leads", orgSlug, search, stage, page, sortBy, sortOrder];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (stage) params.set("stage", stage);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      const res = await fetch(`/api/orgs/${orgSlug}/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ leads: Lead[]; total: number }>;
    },
    initialData: page === 1 && !search && !stage && sortBy === "createdAt" && sortOrder === "desc" ? { leads: initialLeads, total: initialTotal } : undefined,
  });

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orgs/${orgSlug}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() || undefined, stage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      setCreateOpen(false);
      setNewName("");
      setNewEmail("");
      setNewStage("new");
      queryClient.invalidateQueries({ queryKey: ["leads", orgSlug] });
      router.refresh();
    },
  });

  // ── AI Scoring ────────────────────────────────────────────────
  const scoreLead = useCallback(async (leadId: string) => {
    if (scoringIds.has(leadId)) return;
    setScoringIds((prev) => new Set(prev).add(leadId));
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/ai/score-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setAiScores((prev) => {
        const next = new Map(prev);
        next.set(leadId, { score: data.score, label: data.label });
        return next;
      });
    } finally {
      setScoringIds((prev) => {
        const next = new Set(prev);
        next.delete(leadId);
        return next;
      });
    }
  }, [orgSlug, scoringIds]);

  const scoreAllLeads = useCallback(() => {
    for (const lead of leads) scoreLead(lead.id);
  }, [leads, scoreLead]);

  // ── Sorting ───────────────────────────────────────────────────
  const toggleSort = useCallback((column: string) => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder("asc");
      return column;
    });
    setPage(1);
  }, []);

  const SortHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(column)} className="flex items-center gap-1 hover:text-gray-900 transition-colors">
      {children}
      {sortBy === column && <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>}
    </button>
  );

  // Debounced search
  const debouncedSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold dark:text-white">Leads</h2>
        <div className="flex items-center gap-2">
          <a
            href={`/api/orgs/${orgSlug}/leads/export`}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Export CSV
          </a>
          {canManage && (
            <>
              <ImportButton orgSlug={orgSlug} onImported={() => queryClient.invalidateQueries({ queryKey })} />
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger>
                  <Button size="sm">New Lead</Button>
                </DialogTrigger>
            <DialogContent title="New Lead">
              <div className="space-y-4">
                <Input label="Name *" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={createMutation.isPending} />
                <Input label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} disabled={createMutation.isPending} />
                <div>
                  <label className="block text-sm font-medium mb-1">Stage</label>
                  <Select value={newStage} onValueChange={setNewStage}>
                    <SelectTrigger />
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>Cancel</Button>
                  <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newName.trim()}>
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </>
        )}
      </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or email..."
            defaultValue={search}
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger placeholder="All stages" />
            <SelectContent>
              <SelectItem value="">All stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center mb-4">
          <p className="text-sm text-red-600 mb-2">{error instanceof Error ? error.message : "Failed to load leads"}</p>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["leads", orgSlug] })}>Retry</Button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortHeader column="name">Name</SortHeader></TableHead>
                <TableHead><SortHeader column="email">Email</SortHeader></TableHead>
                <TableHead><SortHeader column="stage">Stage</SortHeader></TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    AI Score
                    <button onClick={scoreAllLeads} className="text-[10px] text-blue-600 hover:underline ml-1">(all)</button>
                  </div>
                </TableHead>
                <TableHead><SortHeader column="createdAt">Created</SortHeader></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {search || stage ? "No leads match your search." : "No leads yet. Create your first lead to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link href={`/leads/${lead.id}`} className="text-blue-600 hover:underline font-medium">
                        {lead.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-gray-500">{lead.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={lead.stage === "new" ? "default" : "success"}>{lead.stage || "new"}</Badge>
                    </TableCell>
                    <TableCell>
                      {aiScores.has(lead.id) ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          aiScores.get(lead.id)!.label === "hot" ? "bg-red-100 text-red-700" :
                          aiScores.get(lead.id)!.label === "warm" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {aiScores.get(lead.id)!.score}
                        </span>
                      ) : scoringIds.has(lead.id) ? (
                        <span className="text-xs text-gray-400">Scoring...</span>
                      ) : (
                        <button onClick={() => scoreLead(lead.id)} className="text-xs text-blue-600 hover:underline">
                          Score
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 text-xs">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Loading overlay for refetches */}
          {isLoading && leads.length > 0 && (
            <div className="text-center py-2 text-xs text-gray-400">Updating...</div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-gray-500">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
