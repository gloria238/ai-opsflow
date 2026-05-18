import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WorkerStatusCard } from "./worker-status-card";
import { OnboardingCard } from "./onboarding-card";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Workflow, Users, LayoutGrid, Plus, Zap, CheckCircle, XCircle, Clock, BarChart3, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
  if (!org) redirect("/login");

  const [
    workflowCount, leadCount, memberCount,
    recentRuns, runStats, leadsByStage,
  ] = await Promise.all([
    prisma.workflow.count({ where: { organizationId: org.id } }),
    prisma.lead.count({ where: { organizationId: org.id } }),
    prisma.membership.count({ where: { organizationId: org.id } }),
    prisma.workflowRun.findMany({
      where: { workflowVersion: { workflow: { organizationId: org.id } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { workflowVersion: { select: { workflow: { select: { name: true } } } } },
    }),
    Promise.all([
      prisma.workflowRun.count({ where: { workflowVersion: { workflow: { organizationId: org.id } }, status: "completed" } }),
      prisma.workflowRun.count({ where: { workflowVersion: { workflow: { organizationId: org.id } }, status: { in: ["failed", "dead_letter"] } } }),
      prisma.workflowRun.count({ where: { workflowVersion: { workflow: { organizationId: org.id } }, status: "queued" } }),
      prisma.workflowRun.count({ where: { workflowVersion: { workflow: { organizationId: org.id } }, status: "running" } }),
    ]),
    prisma.lead.groupBy({ by: ["stage"], where: { organizationId: org.id }, _count: true }),
  ]);

  const [completedRuns, failedRuns, queuedRuns, runningRuns] = runStats;
  const totalRuns = completedRuns + failedRuns + queuedRuns + runningRuns;

  const stageMap = Object.fromEntries(
    leadsByStage.map((s) => [s.stage ?? "new", s._count]),
  );
  const stages = [
    { key: "new", label: "New", color: "var(--text-muted)" },
    { key: "qualified", label: "Qualified", color: "#3b82f6" },
    { key: "proposal", label: "Proposal", color: "#f59e0b" },
    { key: "negotiation", label: "Negotiation", color: "#f97316" },
    { key: "closed-won", label: "Won", color: "#10b981" },
    { key: "closed-lost", label: "Lost", color: "#ef4444" },
  ];
  const maxStageCount = Math.max(1, ...stages.map((s) => stageMap[s.key] ?? 0));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">{org.name}</h1>
          <p className="text-sm text-text-secondary mt-1">Monitor workflows, leads, and operational health.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/workflows" className="inline-flex items-center gap-2 rounded-xl bg-accent text-white text-sm font-medium px-4 py-2.5 hover:bg-accent-hover transition-colors duration-200 shadow-sm shadow-accent/25">
            <Plus className="size-4" /> New Workflow
          </Link>
          <Link href="/leads" className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-card text-text-secondary text-sm font-medium px-4 py-2.5 hover:bg-bg-subtle transition-colors duration-200">
            <Users className="size-4" /> View Leads
          </Link>
          <Link href="/runs" className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-card text-text-secondary text-sm font-medium px-4 py-2.5 hover:bg-bg-subtle transition-colors duration-200">
            <Zap className="size-4" /> Runs
          </Link>
        </div>
      </div>

      <OnboardingCard show={workflowCount === 0 && leadCount === 0} orgSlug={session.orgSlug} />

      {/* Bento Grid — 3 main metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/workflows" className="group">
          <div className="glass-card p-5 h-full cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="size-11 rounded-2xl bg-accent-soft flex items-center justify-center">
                <Workflow className="size-5 text-accent" />
              </div>
              <ArrowRight className="size-4 text-text-muted opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-text">{workflowCount}</p>
            <p className="text-sm text-text-secondary mt-1">Workflows</p>
          </div>
        </Link>

        <Link href="/leads" className="group">
          <div className="glass-card p-5 h-full cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="size-11 rounded-2xl bg-success-soft flex items-center justify-center">
                <Users className="size-5 text-success" />
              </div>
              <ArrowRight className="size-4 text-text-muted opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-text">{leadCount}</p>
            <p className="text-sm text-text-secondary mt-1">Leads</p>
          </div>
        </Link>

        <div className="glass-card p-5 h-full">
          <div className="flex items-start justify-between">
            <div className="size-11 rounded-2xl bg-bg-subtle flex items-center justify-center">
              <LayoutGrid className="size-5 text-text-secondary" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-text">{memberCount}</p>
          <p className="text-sm text-text-secondary mt-1">Members</p>
        </div>
      </div>

      {/* Run health — 4 mini cards */}
      {totalRuns > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: CheckCircle, label: "Completed", count: completedRuns, color: "text-success", bg: "bg-success-soft" },
            { icon: XCircle, label: "Failed", count: failedRuns, color: "text-danger", bg: "bg-danger-soft" },
            { icon: Clock, label: "Queued", count: queuedRuns, color: "text-warning", bg: "bg-warning-soft" },
            { icon: Zap, label: "Running", count: runningRuns, color: "text-accent", bg: "bg-accent-soft" },
          ].map(({ icon: Icon, label, count, color, bg }) => (
            <div key={label} className="glass-card p-4 flex items-center gap-3">
              <div className={`size-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`size-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-text">{count}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two-column: Recent runs + Worker health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Recent Runs</h3>
            <Link href="/runs" className="text-xs text-accent hover:text-accent-hover transition-colors">View all</Link>
          </div>
          {recentRuns.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Zap className="size-8 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-secondary mb-3">No workflow runs yet</p>
              <Link href="/workflows" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                Create and run your first workflow →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <Link key={run.id} href="/runs" className="block">
                  <div className="glass-card p-4 flex items-center justify-between cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {run.workflowVersion?.workflow?.name || "Unknown workflow"}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-3 ${
                      run.status === "completed" ? "bg-success-soft text-success" :
                      run.status === "failed" || run.status === "dead_letter" ? "bg-danger-soft text-danger" :
                      run.status === "running" ? "bg-accent-soft text-accent" :
                      "bg-bg-subtle text-text-secondary"
                    }`}>
                      {run.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">Worker Health</h3>
          <WorkerStatusCard orgSlug={org.slug} />
        </div>
      </div>

      {/* Lead pipeline chart */}
      {leadCount > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-text-muted" />
            <h3 className="text-sm font-semibold text-text">Lead Pipeline</h3>
          </div>
          <div className="glass-card p-6">
            <div className="space-y-3">
              {stages.map((stage) => {
                const count = stageMap[stage.key] ?? 0;
                const width = (count / maxStageCount) * 100;
                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary w-24 shrink-0">{stage.label}</span>
                    <div className="flex-1 h-7 bg-bg-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.max(width, count > 0 ? 6 : 0)}%`,
                          backgroundColor: stage.color,
                          opacity: count > 0 ? 1 : 0.2,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-text w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {leadCount === 0 && workflowCount === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="size-16 rounded-2xl bg-accent-soft flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="size-8 text-accent opacity-60" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">Ready to get started?</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            Create your first lead or install a workflow template to see pipeline analytics and run metrics here.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/leads" className="rounded-xl bg-accent text-white text-sm font-medium px-5 py-2.5 hover:bg-accent-hover transition-colors duration-200">
              Add Lead
            </Link>
            <Link href="/templates" className="rounded-xl border border-border text-text-secondary text-sm font-medium px-5 py-2.5 hover:bg-bg-subtle transition-colors duration-200">
              Browse Templates
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
