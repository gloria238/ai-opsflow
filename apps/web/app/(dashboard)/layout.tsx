import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/nav/sidebar";
import { SidebarHeader } from "@/components/nav/sidebar-header";
import { UserMenu } from "@/components/nav/user-menu";
import { Breadcrumb } from "@/components/nav/breadcrumb";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
  if (!org) redirect("/login");

  const memberships = await prisma.membership.findMany({
    where: { userId: session.userId },
    include: { organization: true },
  });

  const allOrgs = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));

  return (
    <div className="min-h-screen flex bg-zinc-50">
      <aside className="w-60 border-r border-zinc-200/60 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">O</div>
            <span className="font-semibold text-sm tracking-tight">OpsFlow</span>
          </div>
          <SidebarHeader currentOrg={org} orgs={allOrgs} />
        </div>
        <div className="p-3 flex-1">
          <Sidebar />
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-12 border-b border-zinc-200/60 bg-white flex items-center justify-between px-8">
          <Breadcrumb />
          <UserMenu user={{ name: user.name || "User", email: user.email }} org={{ name: org.name, slug: org.slug }} />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
