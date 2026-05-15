// One-off: delete all workflows + leads from demo-org, then re-seed with templates.
// Usage: pnpm tsx packages/db/clean-demo-org.ts <org-slug>
// WARNING: destructive — only run this on demo data.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgSlug = process.argv[2];
  if (!orgSlug) {
    console.error("Usage: pnpm tsx packages/db/clean-demo-org.ts <org-slug>");
    process.exit(1);
  }

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    console.error(`Org "${orgSlug}" not found.`);
    process.exit(1);
  }

  console.log(`Cleaning: ${org.name} (${org.slug})\n`);

  // Delete in FK-safe order
  const versions = await prisma.workflowVersion.findMany({
    where: { workflow: { organizationId: org.id } },
    select: { id: true },
  });
  const versionIds = versions.map((v) => v.id);

  if (versionIds.length > 0) {
    await prisma.workflowRunEvent.deleteMany({ where: { workflowRun: { versionId: { in: versionIds } } } });
    await prisma.workflowRun.deleteMany({ where: { versionId: { in: versionIds } } });
    await prisma.workflowNode.deleteMany({ where: { versionId: { in: versionIds } } });
    await prisma.workflowEdge.deleteMany({ where: { versionId: { in: versionIds } } });
    await prisma.workflowVersion.deleteMany({ where: { id: { in: versionIds } } });
  }

  const wfDeleted = await prisma.workflow.deleteMany({ where: { organizationId: org.id } });
  console.log(`Deleted ${wfDeleted.count} workflow(s)`);

  // Cascade deletes LeadActivity via onDelete: Cascade
  const leadDeleted = await prisma.lead.deleteMany({ where: { organizationId: org.id } });
  console.log(`Deleted ${leadDeleted.count} lead(s)`);

  console.log("\nDone cleaning.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
