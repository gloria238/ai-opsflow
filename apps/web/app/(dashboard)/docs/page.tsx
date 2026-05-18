import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DocsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organizationId: session.orgId },
  });
  if (!membership) redirect("/login");

  const endpoints = [
    { method: "POST", path: "/api/auth/login", auth: "None", desc: "Login with email and password" },
    { method: "POST", path: "/api/auth/register", auth: "None", desc: "Register a new account" },
    { method: "POST", path: "/api/auth/verify", auth: "None", desc: "Verify email with token" },
    { method: "POST", path: "/api/auth/logout", auth: "JWT", desc: "Logout current session" },
    { method: "GET", path: "/api/orgs", auth: "JWT", desc: "List user's organizations" },
    { method: "GET", path: "/api/orgs/:slug", auth: "JWT", desc: "Get organization details" },
    { method: "GET", path: "/api/orgs/:slug/leads", auth: "JWT", desc: "List leads (search, filter, paginate)" },
    { method: "POST", path: "/api/orgs/:slug/leads", auth: "JWT", desc: "Create a new lead" },
    { method: "GET", path: "/api/orgs/:slug/leads/:id", auth: "JWT", desc: "Get lead details" },
    { method: "PATCH", path: "/api/orgs/:slug/leads/:id", auth: "JWT", desc: "Update a lead" },
    { method: "DELETE", path: "/api/orgs/:slug/leads/:id", auth: "JWT", desc: "Delete a lead" },
    { method: "GET", path: "/api/orgs/:slug/leads/export", auth: "JWT", desc: "Export leads as CSV" },
    { method: "POST", path: "/api/orgs/:slug/leads/import", auth: "JWT", desc: "Import leads from CSV" },
    { method: "GET", path: "/api/orgs/:slug/workflows", auth: "JWT", desc: "List workflows" },
    { method: "POST", path: "/api/orgs/:slug/workflows", auth: "JWT", desc: "Create a workflow" },
    { method: "GET", path: "/api/orgs/:slug/workflows/:id", auth: "JWT", desc: "Get workflow with latest version" },
    { method: "PUT", path: "/api/orgs/:slug/workflows/:id", auth: "JWT", desc: "Save workflow (creates new version)" },
    { method: "DELETE", path: "/api/orgs/:slug/workflows/:id", auth: "JWT", desc: "Delete a workflow" },
    { method: "POST", path: "/api/orgs/:slug/workflows/:id/trigger", auth: "JWT", desc: "Trigger a workflow run" },
    { method: "POST", path: "/api/orgs/:slug/workflows/:id/webhook", auth: "Secret", desc: "Trigger via webhook" },
    { method: "GET", path: "/api/orgs/:slug/workflows/:id/runs", auth: "JWT", desc: "List workflow runs" },
    { method: "GET", path: "/api/orgs/:slug/runs", auth: "JWT", desc: "List all runs in org" },
    { method: "GET", path: "/api/orgs/:slug/templates", auth: "JWT", desc: "List workflow templates" },
    { method: "POST", path: "/api/orgs/:slug/templates", auth: "JWT", desc: "Install a template" },
    { method: "GET", path: "/api/orgs/:slug/members", auth: "JWT", desc: "List organization members" },
    { method: "POST", path: "/api/orgs/:slug/members", auth: "JWT", desc: "Invite a member" },
    { method: "GET", path: "/api/orgs/:slug/audit-log", auth: "JWT", desc: "List audit log entries" },
    { method: "GET", path: "/api/orgs/:slug/api-keys", auth: "JWT", desc: "List API keys" },
    { method: "POST", path: "/api/orgs/:slug/api-keys", auth: "JWT", desc: "Create API key (owner only)" },
    { method: "GET", path: "/api/orgs/:slug/ai/score-lead", auth: "JWT", desc: "AI lead scoring" },
    { method: "POST", path: "/api/orgs/:slug/ai/suggest-nodes", auth: "JWT", desc: "AI node suggestions" },
    { method: "POST", path: "/api/orgs/:slug/ai/generate-workflow", auth: "JWT", desc: "AI workflow generation" },
    { method: "POST", path: "/api/orgs/:slug/ai/analyze-run", auth: "JWT", desc: "AI run anomaly analysis" },
    { method: "POST", path: "/api/orgs/:slug/ai/compose-email", auth: "JWT", desc: "AI email composition" },
    { method: "POST", path: "/api/orgs/:slug/ai/classify-email", auth: "JWT", desc: "AI email classification" },
    { method: "GET", path: "/api/orgs/:slug/ai/pipeline-insights", auth: "JWT", desc: "AI pipeline health analysis" },
  ];

  const methodColor = (m: string) => {
    const c: Record<string, string> = {
      GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      PATCH: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return c[m] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">API Reference</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        36 endpoints across auth, CRM, workflows, AI, and settings. All authenticated endpoints support
        JWT (httpOnly cookie) and API key (Bearer token) authentication.
      </p>

      <div className="space-y-6">
        {["Auth", "Organizations", "Leads", "Workflows", "Templates", "Members & Settings", "AI"].map((section) => (
          <div key={section}>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">{section}</h2>
            <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 w-16">Method</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Path</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 w-20">Auth</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints
                    .filter((e) => {
                      const sec = section.toLowerCase();
                      if (sec === "auth") return e.path.includes("/api/auth");
                      if (sec === "organizations") return e.path.match(/^\/api\/orgs$/) || e.path.match(/^\/api\/orgs\/:slug$/);
                      if (sec === "leads") return e.path.includes("/leads");
                      if (sec === "workflows") return (e.path.includes("/workflows") || e.path.includes("/runs")) && !e.path.includes("/templates");
                      if (sec === "templates") return e.path.includes("/templates");
                      if (sec === "members & settings") return e.path.includes("/members") || e.path.includes("/audit") || e.path.includes("/api-keys");
                      if (sec === "ai") return e.path.includes("/ai/");
                      return false;
                    })
                    .map((e) => (
                      <tr key={e.method + e.path} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-4 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${methodColor(e.method)}`}>{e.method}</span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">{e.path}</td>
                        <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">{e.auth}</td>
                        <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">{e.desc}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
