import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WorkerStatusCard } from "./worker-status-card";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, LayoutGrid, Workflow, Users, Plus, Zap } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
  if (!org) redirect("/login");

  const [workflowCount, leadCount, memberCount, recentRuns] = await Promise.all([
    prisma.workflow.count({ where: { organizationId: org.id } }),
    prisma.lead.count({ where: { organizationId: org.id } }),
    prisma.membership.count({ where: { organizationId: org.id } }),
    prisma.workflowRun.findMany({
      where: { workflowVersion: { workflow: { organizationId: org.id } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { workflowVersion: { select: { workflow: { select: { name: true } } } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{org.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">Monitor workflow execution and operational health.</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/workflows"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="size-4" />
          New Workflow
        </Link>
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-medium px-4 py-2 hover:bg-zinc-50 transition-colors"
        >
          <Users className="size-4" />
          View Leads
        </Link>
        <Link
          href="/runs"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-sm font-medium px-4 py-2 hover:bg-zinc-50 transition-colors"
        >
          <Zap className="size-4" />
          View Runs
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/workflows" className="block group">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Workflow className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-500">Workflows</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-0.5">{workflowCount}</p>
              </div>
              <ArrowRight className="size-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/leads" className="block group">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <Users className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-500">Leads</p>
                <p className="text-2xl font-semibold text-zinc-900 mt-0.5">{leadCount}</p>
              </div>
              <ArrowRight className="size-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" />
            </CardContent>
          </Card>
        </Link>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="size-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 shrink-0">
              <LayoutGrid className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-500">Members</p>
              <p className="text-2xl font-semibold text-zinc-900 mt-0.5">{memberCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Recent runs + Worker health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-800 mb-3">Recent Runs</h3>
          {recentRuns.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Zap className="size-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm text-zinc-500 mb-3">No workflow runs yet</p>
                <Link
                  href="/workflows"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Create and run your first workflow →
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <Link key={run.id} href={`/runs`}>
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800 truncate">
                          {run.workflowVersion?.workflow?.name || "Unknown workflow"}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {new Date(run.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        run.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                        run.status === "failed" || run.status === "dead_letter" ? "bg-red-50 text-red-700" :
                        run.status === "running" ? "bg-blue-50 text-blue-700" :
                        "bg-zinc-100 text-zinc-600"
                      }`}>
                        {run.status}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-800 mb-3">Worker Health</h3>
          <WorkerStatusCard orgSlug={org.slug} />
        </div>
      </div>
    </div>
  );
}
