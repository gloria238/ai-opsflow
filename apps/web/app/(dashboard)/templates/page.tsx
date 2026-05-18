import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organizationId: session.orgId },
  });
  if (!membership) redirect("/login");

  const canManage = membership.role === "owner" || membership.role === "admin" || membership.role === "operator";

  return <TemplatesClient orgSlug={session.orgSlug} canManage={canManage} />;
}
