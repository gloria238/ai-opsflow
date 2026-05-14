// Production-safe seed: adds demo workflows & leads to an existing org.
// Does NOT delete any data. Safe to run repeatedly (idempotent).
//
// Usage: pnpm tsx packages/db/seed-production.ts <org-slug>
//
// Creates if not present:
//   - 2 demo workflows (Simple Email + Lead Qualification Pipeline)
//   - 5 demo leads at different stages
//   - Demo user alice@example.com (only needed for seed org)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgSlug = process.argv[2];
  if (!orgSlug) {
    console.error("Usage: pnpm tsx packages/db/seed-production.ts <org-slug>");
    process.exit(1);
  }

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    console.error(`Org "${orgSlug}" not found.`);
    const orgs = await prisma.organization.findMany({ select: { slug: true } });
    if (orgs.length > 0) console.error("Available:", orgs.map((o) => o.slug).join(", "));
    process.exit(1);
  }

  console.log(`Seeding demo data into: ${org.name} (${org.slug})\n`);

  // ── Demo workflows ──────────────────────────────────────────────────

  const existingWf = await prisma.workflow.count({ where: { organizationId: org.id } });
  if (existingWf > 0) {
    console.log(`Org already has ${existingWf} workflow(s), skipping workflow seed.`);
  } else {
    // Simple Email Workflow
    const simpleWf = await prisma.workflow.create({
      data: {
        organizationId: org.id,
        name: "Simple Email Workflow",
        description: "Trigger → Send email",
        versions: { create: [{ version: 1 }] },
      },
      include: { versions: true },
    });
    const svId = simpleWf.versions[0].id;
    const t1 = await prisma.workflowNode.create({
      data: { versionId: svId, type: "trigger", label: "Manual Trigger", config: {}, positionX: 250, positionY: 50 },
    });
    const a1 = await prisma.workflowNode.create({
      data: { versionId: svId, type: "action", label: "Send Email", config: { action: "send_email" }, positionX: 250, positionY: 200 },
    });
    await prisma.workflowEdge.create({
      data: { versionId: svId, sourceNodeId: t1.id, targetNodeId: a1.id },
    });
    console.log('Created "Simple Email Workflow"');

    // Lead Qualification Pipeline
    const complexWf = await prisma.workflow.create({
      data: {
        organizationId: org.id,
        name: "Lead Qualification Pipeline",
        description: "Route leads based on email domain",
        versions: { create: [{ version: 1 }] },
      },
      include: { versions: true },
    });
    const cvId = complexWf.versions[0].id;
    const trig = await prisma.workflowNode.create({
      data: { versionId: cvId, type: "trigger", label: "Webhook Received", config: { type: "webhook" }, positionX: 350, positionY: 30 },
    });
    const cond = await prisma.workflowNode.create({
      data: { versionId: cvId, type: "condition", label: "Is Company Email?", config: { field: "lead.email", operator: "contains", value: "@company.com" }, positionX: 350, positionY: 200 },
    });
    const hot = await prisma.workflowNode.create({
      data: { versionId: cvId, type: "action", label: "Mark as Hot Lead", config: { action: "update_lead" }, positionX: 550, positionY: 320 },
    });
    const cold = await prisma.workflowNode.create({
      data: { versionId: cvId, type: "action", label: "Send Nurture Email", config: { action: "send_email" }, positionX: 150, positionY: 320 },
    });
    await prisma.workflowEdge.create({ data: { versionId: cvId, sourceNodeId: trig.id, targetNodeId: cond.id } });
    await prisma.workflowEdge.create({ data: { versionId: cvId, sourceNodeId: cond.id, targetNodeId: hot.id } });
    await prisma.workflowEdge.create({ data: { versionId: cvId, sourceNodeId: cond.id, targetNodeId: cold.id } });
    console.log('Created "Lead Qualification Pipeline"');
  }

  // ── Demo leads ──────────────────────────────────────────────────────

  const existingLeads = await prisma.lead.count({ where: { organizationId: org.id } });
  if (existingLeads > 0) {
    console.log(`Org already has ${existingLeads} lead(s), skipping lead seed.`);
  } else {
    const leads = [
      { name: "Alice Johnson", email: "alice@company.com", stage: "qualified" },
      { name: "Bob Smith", email: "bob@gmail.com", stage: "new" },
      { name: "Carol Williams", email: "carol@startup.io", stage: "proposal" },
      { name: "Dave Brown", email: "dave@enterprise.com", stage: "negotiation" },
      { name: "Eve Davis", email: "eve@corp.net", stage: "new" },
    ];
    for (const l of leads) {
      await prisma.lead.create({ data: { organizationId: org.id, ...l } });
    }
    console.log(`Created ${leads.length} demo leads`);
  }

  console.log("\nSeed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
