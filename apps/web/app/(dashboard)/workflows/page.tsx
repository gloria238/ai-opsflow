import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CreateWorkflowButton } from "./create-button";

export default async function WorkflowsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organizationId: session.orgId },
  });

  if (!membership) redirect("/login");

  const workflows = await prisma.workflow.findMany({
    where: { organizationId: session.orgId },
    include: { versions: { take: 1, orderBy: { version: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Workflows</h2>
        <CreateWorkflowButton orgSlug={session.orgSlug} />
      </div>
      {workflows.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-gray-500">
          No workflows yet. Run the seed script to add demo data.
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <Link
              key={wf.id}
              href={`/workflows/${wf.id}`}
              className="block rounded-lg border p-4 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{wf.name}</p>
                  {wf.description && <p className="text-sm text-gray-500 mt-1">{wf.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">v{wf.versions[0]?.version || 1}</span>
                  <Badge>{wf.versions.length} version{wf.versions.length !== 1 ? "s" : ""}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
