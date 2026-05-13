import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { WorkflowRunView } from "./run-view";
import { TriggerButton } from "./trigger-button";

export default async function WorkflowDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, organizationId: session.orgId },
  });

  if (!workflow) {
    return <div className="text-center py-12 text-gray-500">Workflow not found</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{workflow.name}</h2>
          {workflow.description && <p className="text-gray-500 mt-1">{workflow.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <TriggerButton workflowId={params.id} orgSlug={session.orgSlug} />
          <a
            href={`/workflows/${params.id}/builder`}
            className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            Open Builder
          </a>
        </div>
      </div>
      <WorkflowRunView workflowId={params.id} orgSlug={session.orgSlug} />
    </div>
  );
}
