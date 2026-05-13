import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import fs from "fs";
import path from "path";

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "view_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  // Read worker health file (try multiple paths — CWD is unreliable in monorepo)
  let worker: Record<string, unknown> = { status: "unknown" };
  try {
    const candidates = [
      path.resolve(process.cwd(), "../../.worker-health.json"),
      path.resolve(process.cwd(), "../.worker-health.json"),
      path.resolve(process.cwd(), ".worker-health.json"),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        worker = JSON.parse(fs.readFileSync(file, "utf-8"));
        break;
      }
    }
  } catch {
    // Health file unavailable
  }

  // Get queue sizes scoped to this org
  const orgFilter = { workflowVersion: { workflow: { organizationId: membership.organizationId } } };
  const [queued, running, dead] = await Promise.all([
    prisma.workflowRun.count({ where: { status: "queued", ...orgFilter } }),
    prisma.workflowRun.count({ where: { status: "running", ...orgFilter } }),
    prisma.workflowRun.count({ where: { status: "dead_letter", ...orgFilter } }),
  ]);

  return NextResponse.json({
    worker,
    queue: { queued, running, dead_letter: dead },
  });
}
