import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { WorkerStatusCard } from "./worker-status-card";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, LayoutGrid, Workflow, Users } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
  if (!org) redirect("/login");

  const [workflowCount, leadCount, memberCount] = await Promise.all([
    prisma.workflow.count({ where: { organizationId: org.id } }),
    prisma.lead.count({ where: { organizationId: org.id } }),
    prisma.membership.count({ where: { organizationId: org.id } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{org.name}</h1>
        <p className="text-sm text-zinc-500 mt-1">Monitor workflow execution and operational health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/workflows" className="block group">
          <Card>
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
          <Card>
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
        <Card>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WorkerStatusCard orgSlug={org.slug} />
      </div>
    </div>
  );
}
