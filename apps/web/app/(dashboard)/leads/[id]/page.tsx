import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StageSelector } from "./stage-selector";
import { NoteForm } from "./note-form";
import { EditDialog } from "./edit-dialog";
import { DeleteButton } from "./delete-button";
import { AIInsightsCard } from "@/components/leads/ai-insights-card";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organizationId: session.orgId },
  });
  if (!membership) redirect("/login");

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, organizationId: session.orgId },
  });
  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Lead not found</p>
        <Link href="/leads" className="text-blue-600 hover:underline">← Back to Leads</Link>
      </div>
    );
  }

  const activities = await prisma.leadActivity.findMany({
    where: { leadId: lead.id, organizationId: session.orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const canManage = ["owner", "admin", "operator"].includes(membership.role);

  return (
    <div>
      <Link href="/leads" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to Leads</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{lead.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Created {lead.createdAt.toLocaleDateString()}</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <EditDialog lead={{ id: lead.id, name: lead.name, email: lead.email || "" }} orgSlug={session.orgSlug} />
            <DeleteButton leadId={lead.id} leadName={lead.name} orgSlug={session.orgSlug} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <p className="text-sm text-gray-500">Stage</p>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <StageSelector currentStage={lead.stage || "new"} leadId={lead.id} orgSlug={session.orgSlug} />
            ) : (
              <Badge variant={lead.stage === "new" ? "default" : "success"}>{lead.stage || "new"}</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm text-gray-500">Contact</p>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{lead.email || "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm text-gray-500">Details</p>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">Created:</span> {lead.createdAt.toLocaleDateString()}</p>
              <p><span className="text-gray-500">Updated:</span> {lead.updatedAt.toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <AIInsightsCard leadId={lead.id} orgSlug={session.orgSlug} />
      </div>

      <Card>
        <CardHeader>
          <p className="font-medium">Activity</p>
        </CardHeader>
        <CardContent>
          {canManage && (
            <div className="mb-6">
              <NoteForm leadId={lead.id} orgSlug={session.orgSlug} />
            </div>
          )}

          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex gap-3 text-sm">
                  <div className="mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      a.type === "note" ? "bg-blue-400" :
                      a.type === "stage_change" ? "bg-purple-400" :
                      "bg-gray-300"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-gray-400 uppercase">{a.type === "note" ? a.userName : a.type.replace("_", " ")}</span>
                      <span className="text-xs text-gray-400">{a.createdAt.toLocaleString()}</span>
                    </div>
                    <p className="text-gray-700 mt-0.5">{a.content}</p>
                    {a.metadata && typeof a.metadata === "object" && "fromStage" in (a.metadata as object) && (
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <Badge variant="default">{(a.metadata as { fromStage: string }).fromStage}</Badge>
                        <span>→</span>
                        <Badge variant="success">{(a.metadata as { toStage: string }).toStage}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
