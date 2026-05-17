import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CreateWorkflowButton } from "./create-button";
import { Workflow, ArrowRight } from "lucide-react";

export default async function WorkflowsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organizationId: session.orgId },
  });

  if (!membership) redirect("/login");

  const canManage = hasPermission(session.role, "manage_workflows");

  const workflows = await prisma.workflow.findMany({
    where: { organizationId: session.orgId },
    include: {
      versions: {
        take: 1,
        orderBy: { version: "desc" },
        include: { nodes: true },
      },
      _count: { select: { versions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Workflows</h2>
          <p className="text-sm text-zinc-500 mt-1">Build and manage automation workflows.</p>
        </div>
        {canManage && <CreateWorkflowButton orgSlug={session.orgSlug} />}
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Workflow className="size-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-700 mb-1">No workflows yet</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
            {canManage
              ? "Create your first AI-powered workflow or run the seed script to add demo templates."
              : "No workflows have been created yet. Contact your admin to get started."}
          </p>
          {canManage && (
            <div className="flex items-center justify-center gap-3">
              <CreateWorkflowButton orgSlug={session.orgSlug} />
              <span className="text-xs text-zinc-400">or run</span>
              <code className="text-xs bg-zinc-100 rounded px-2 py-1 text-zinc-600 font-mono">
                pnpm seed-prod {session.orgSlug}
              </code>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => {
            const nodeCount = wf.versions[0]?.nodes?.length ?? 0;
            return (
              <Link
                key={wf.id}
                href={`/workflows/${wf.id}`}
                className="group block rounded-xl border border-zinc-200/60 bg-white p-5 hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="size-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Workflow className="size-4" />
                  </div>
                  <ArrowRight className="size-4 text-zinc-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1 truncate">{wf.name}</h3>
                {wf.description ? (
                  <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{wf.description}</p>
                ) : (
                  <p className="text-sm text-zinc-400 italic mb-4">No description</p>
                )}
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span>v{wf.versions[0]?.version ?? 1}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-zinc-300" />
                  <span>{nodeCount} node{nodeCount !== 1 ? "s" : ""}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-zinc-300" />
                  <Badge>{wf._count.versions} version{wf._count.versions !== 1 ? "s" : ""}</Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
