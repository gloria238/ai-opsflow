import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { BuilderClient } from "./builder-client";

export default async function BuilderPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, organizationId: session.orgId },
    include: {
      versions: {
        take: 1,
        orderBy: { version: "desc" },
        include: { nodes: true, edges: true },
      },
    },
  });

  if (!workflow) {
    return <div className="text-center py-12 text-gray-500">Workflow not found</div>;
  }

  return (
    <BuilderClient
      workflowId={workflow.id}
      orgSlug={session.orgSlug}
      initialWorkflow={{
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        version: workflow.versions[0]?.version ?? 1,
      }}
    />
  );
}
