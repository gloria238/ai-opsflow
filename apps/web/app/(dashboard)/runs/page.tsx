"use client";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { PlayCircle, RotateCw, XCircle, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle as XCircleIcon, AlertCircle, ArrowRight } from "lucide-react";

interface RunItem {
  id: string;
  status: string;
  workflowName: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  eventCount: number;
  lastEventStatus: string | null;
}

interface RunEvent {
  id: string;
  nodeId: string;
  status: string;
  input: unknown;
  output: Record<string, string> | null;
  createdAt: string;
}

interface RunDetail {
  id: string;
  status: string;
  workflowName: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  events: RunEvent[];
}

const STATUSES = ["", "queued", "running", "completed", "failed", "dead_letter"];

function statusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle2 className="size-4 text-emerald-500" />;
    case "failed":
    case "dead_letter": return <XCircleIcon className="size-4 text-red-500" />;
    case "running": return <div className="size-3 rounded-full bg-blue-500 animate-pulse-soft" />;
    case "queued": return <Clock className="size-4 text-amber-500" />;
    default: return <div className="size-3 rounded-full bg-zinc-300" />;
  }
}

function eventStatusIcon(status: string) {
  switch (status) {
    case "success": return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    case "failed": return <XCircle className="size-3.5 text-red-500" />;
    case "delayed": return <Clock className="size-3.5 text-amber-500" />;
    default: return <div className="size-2 rounded-full bg-zinc-300" />;
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function RunsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [slugLoading, setSlugLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orgs").then(async (res) => {
      if (!res.ok) return;
      const orgs = await res.json();
      if (orgs.length > 0) setOrgSlug(orgs[0].slug);
      setSlugLoading(false);
    });
  }, []);

  const queryKey = ["runs", orgSlug, statusFilter, page];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "20");
      const res = await fetch(`/api/orgs/${orgSlug}/runs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch runs");
      return res.json() as Promise<{ runs: RunItem[]; total: number; totalPages: number }>;
    },
    enabled: !!orgSlug,
  });

  const { data: runDetail } = useQuery({
    queryKey: ["run", orgSlug, selectedRun],
    queryFn: async () => {
      if (!selectedRun) return null;
      const res = await fetch(`/api/orgs/${orgSlug}/runs/${selectedRun}`);
      if (!res.ok) throw new Error("Failed to fetch run");
      return res.json() as Promise<RunDetail>;
    },
    enabled: !!orgSlug && !!selectedRun,
  });

  const runs = data?.runs ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    if (data?.totalPages) setTotalPages(data.totalPages);
  }, [data?.totalPages]);

  const retryMutation = useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/orgs/${orgSlug}/runs/${runId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error("Retry failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs", orgSlug] });
      queryClient.invalidateQueries({ queryKey: ["run", orgSlug] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/orgs/${orgSlug}/runs/${runId}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error("Cancel failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs", orgSlug] });
      queryClient.invalidateQueries({ queryKey: ["run", orgSlug] });
    },
  });

  if (slugLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-4">
          <Card className="flex-1">
            <CardContent className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!orgSlug) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Runs</h1>
          <p className="text-sm text-zinc-500 mt-1">Monitor workflow execution history.</p>
        </div>
        <Card>
          <EmptyState icon={<PlayCircle className="size-6" />} title="No organization found" description="You need to be a member of an organization to view runs." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Runs</h1>
        <p className="text-sm text-zinc-500 mt-1">Monitor workflow execution history.</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); setSelectedRun(null); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
              )}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ["runs", orgSlug] }); }}>
          <RotateCw className="size-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-4">
        {/* Left panel — runs list */}
        <div className={cn("flex-1 min-w-0", selectedRun ? "w-1/2" : "w-full")}>
          {error && (
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-sm text-red-600 mb-3">Failed to load runs</p>
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["runs", orgSlug] })}>Retry</Button>
              </CardContent>
            </Card>
          )}

          {!error && isLoading && (
            <Card>
              <CardContent className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </CardContent>
            </Card>
          )}

          {!error && !isLoading && runs.length === 0 && (
            <Card>
              <EmptyState
                icon={<PlayCircle className="size-6" />}
                title="No runs yet"
                description="Trigger a workflow to see its execution runs here."
              />
            </Card>
          )}

          {!error && runs.length > 0 && (
            <Card>
              <CardContent className="p-0 divide-y divide-zinc-100">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRun(selectedRun === run.id ? null : run.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50",
                      selectedRun === run.id && "bg-blue-50/50"
                    )}
                  >
                    <div className="shrink-0">
                      {statusIcon(run.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 truncate">{run.workflowName}</span>
                        <Badge variant={
                          run.status === "completed" ? "success" :
                          run.status === "failed" || run.status === "dead_letter" ? "danger" :
                          run.status === "running" ? "default" : "default"
                        } className="text-[10px] px-1.5 py-0">
                          {run.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {new Date(run.createdAt).toLocaleDateString()} · {run.eventCount} events
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(run.status === "failed" || run.status === "dead_letter") && (
                        <button
                          onClick={(e) => { e.stopPropagation(); retryMutation.mutate(run.id); }}
                          disabled={retryMutation.isPending}
                          className="text-xs text-blue-600 hover:underline font-medium disabled:opacity-50"
                        >
                          Retry
                        </button>
                      )}
                      {(run.status === "queued" || run.status === "running") && (
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(run.id); }}
                          disabled={cancelMutation.isPending}
                          className="text-xs text-red-600 hover:underline font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                      <ChevronRight className={cn("size-4 text-zinc-300 transition-transform", selectedRun === run.id && "rotate-90")} />
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-zinc-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="size-3.5 mr-1" />Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next<ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel — execution timeline */}
        {selectedRun && (
          <div className="w-1/2 min-w-0 animate-slide-up">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-zinc-900">Execution Timeline</h3>
                  {runDetail && (
                    <p className="text-xs text-zinc-500 mt-0.5">{runDetail.workflowName}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  Close
                </button>
              </CardHeader>
              <CardContent className="p-5">
                {!runDetail ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="size-3.5 rounded-full shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-200" />

                    {/* Run metadata */}
                    <div className="flex items-center gap-2 mb-4 ml-6">
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        runDetail.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                        runDetail.status === "failed" ? "bg-red-50 text-red-700" :
                        runDetail.status === "running" ? "bg-blue-50 text-blue-700" :
                        "bg-zinc-100 text-zinc-600"
                      )}>
                        {runDetail.status}
                      </span>
                      <span className="text-xs text-zinc-400">
                        Created {new Date(runDetail.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Timeline events */}
                    <div className="space-y-0">
                      {runDetail.events.map((event, idx) => (
                        <div key={event.id} className="flex gap-3 pb-4 last:pb-0">
                          <div className="relative flex items-start pt-0.5">
                            <div className="relative z-10 bg-white">
                              {eventStatusIcon(event.status)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-medium",
                                event.status === "success" ? "text-emerald-700" :
                                event.status === "failed" ? "text-red-700" :
                                event.status === "delayed" ? "text-amber-700" :
                                "text-zinc-700"
                              )}>
                                Node {event.nodeId.slice(0, 8)}
                              </span>
                              <Badge variant={
                                event.status === "success" ? "success" :
                                event.status === "failed" ? "danger" :
                                event.status === "delayed" ? "warning" : "default"
                              } className="text-[10px] px-1.5 py-0">
                                {event.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-zinc-400">
                                {formatTimestamp(event.createdAt)}
                              </span>
                              {event.output && (
                                <span className="text-xs text-zinc-500">
                                  · {Object.values(event.output).slice(0, 2).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Final status */}
                    {runDetail.finishedAt && (
                      <div className="flex gap-3 pt-2 border-t border-zinc-100 mt-2">
                        <div className="relative z-10 bg-white pt-0.5">
                          {runDetail.status === "completed" ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          ) : (
                            <AlertCircle className="size-3.5 text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-zinc-600">Finished</span>
                          <p className="text-xs text-zinc-400">{formatTimestamp(runDetail.finishedAt)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
