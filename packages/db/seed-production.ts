// Production-safe seed: adds professional workflow templates & demo leads.
// Does NOT delete any data. Safe to run repeatedly (idempotent).
//
// Usage: pnpm tsx packages/db/seed-production.ts <org-slug>
//
// Creates if not present:
//   - 3 sellable workflow templates:
//       1. Lead Qualification (AI score → route hot/cold)
//       2. Cold Outreach Follow-up (email → delay → follow-up → close)
//       3. Trial User Nurture (onboarding → reminder → sales alert)
//   - 5 demo leads at different stages

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

interface TEdge {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string | null;
}

const TEMPLATES: { name: string; description: string; nodes: TNode[]; edges: TEdge[] }[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Template 1: Lead Qualification
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "Lead Qualification",
    description:
      "New lead → AI scores it → hot leads notify sales, cold leads enter nurture. Sell this to sales teams who need automated lead triage.",
    nodes: [
      {
        id: "t1",
        type: "trigger",
        label: "New Lead",
        config: { type: "manual" },
        positionX: 300,
        positionY: 30,
      },
      {
        id: "a1",
        type: "action",
        label: "AI Score Lead",
        config: { action: "score_lead" },
        positionX: 300,
        positionY: 160,
      },
      {
        id: "c1",
        type: "condition",
        label: "Score > 70?",
        config: { field: "score", operator: "greater_than", value: "70" },
        positionX: 300,
        positionY: 300,
      },
      {
        id: "a2",
        type: "action",
        label: "Flag Hot Lead",
        config: { action: "update_lead", stage: "qualified", tags: ["hot"] },
        positionX: 540,
        positionY: 430,
      },
      {
        id: "a3",
        type: "action",
        label: "Add to Nurture Track",
        config: { action: "update_lead", stage: "new", tags: ["nurture"] },
        positionX: 100,
        positionY: 430,
      },
    ],
    edges: [
      { sourceNodeId: "t1", targetNodeId: "a1" },
      { sourceNodeId: "a1", targetNodeId: "c1" },
      { sourceNodeId: "c1", targetNodeId: "a2", sourceHandle: "true" },
      { sourceNodeId: "c1", targetNodeId: "a3", sourceHandle: "false" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // Template 2: Cold Outreach Follow-up
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "Cold Outreach Follow-up",
    description:
      "Send initial email → wait 2 days → no reply? → follow-up → wait 3 days → still no reply? → close lead. Sell this to SDR teams doing cold outreach.",
    nodes: [
      {
        id: "t2",
        type: "trigger",
        label: "Start Campaign",
        config: { type: "manual" },
        positionX: 300,
        positionY: 30,
      },
      {
        id: "e1",
        type: "action",
        label: "Tag as Outreach Started",
        config: { action: "update_lead", tags: ["outreach_started"] },
        positionX: 300,
        positionY: 160,
      },
      {
        id: "d1",
        type: "delay",
        label: "Wait 2 Days",
        config: { duration: "2", unit: "days" },
        positionX: 300,
        positionY: 300,
      },
      {
        id: "c2",
        type: "condition",
        label: "Got Reply?",
        config: { field: "replied", operator: "equals", value: "true" },
        positionX: 300,
        positionY: 440,
      },
      {
        id: "e2",
        type: "action",
        label: "Tag as Follow-up Sent",
        config: { action: "update_lead", tags: ["followup_sent"] },
        positionX: 100,
        positionY: 570,
      },
      {
        id: "d2",
        type: "delay",
        label: "Wait 3 Days",
        config: { duration: "3", unit: "days" },
        positionX: 100,
        positionY: 700,
      },
      {
        id: "a4",
        type: "action",
        label: "Close Lead (No Response)",
        config: { action: "update_lead", stage: "closed-lost" },
        positionX: 100,
        positionY: 830,
      },
      {
        id: "e3",
        type: "action",
        label: "Move to Qualified",
        config: { action: "update_lead", stage: "qualified" },
        positionX: 540,
        positionY: 570,
      },
    ],
    edges: [
      { sourceNodeId: "t2", targetNodeId: "e1" },
      { sourceNodeId: "e1", targetNodeId: "d1" },
      { sourceNodeId: "d1", targetNodeId: "c2" },
      { sourceNodeId: "c2", targetNodeId: "e2", sourceHandle: "false" },
      { sourceNodeId: "c2", targetNodeId: "e3", sourceHandle: "true" },
      { sourceNodeId: "e2", targetNodeId: "d2" },
      { sourceNodeId: "d2", targetNodeId: "a4" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // Template 3: Trial User Nurture
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "Trial User Nurture",
    description:
      "Signup → onboarding email → 3 days → usage reminder → 4 days → sales alert. Sell this to SaaS companies who need automated trial conversion.",
    nodes: [
      {
        id: "t3",
        type: "trigger",
        label: "User Signed Up",
        config: { type: "manual" },
        positionX: 300,
        positionY: 30,
      },
      {
        id: "on1",
        type: "action",
        label: "Move to Onboarding",
        config: { action: "update_lead", stage: "new", tags: ["onboarding"] },
        positionX: 300,
        positionY: 160,
      },
      {
        id: "d3",
        type: "delay",
        label: "Wait 3 Days",
        config: { duration: "3", unit: "days" },
        positionX: 300,
        positionY: 300,
      },
      {
        id: "on2",
        type: "action",
        label: "Mark as Engaged",
        config: { action: "update_lead", tags: ["reminder_sent"] },
        positionX: 300,
        positionY: 440,
      },
      {
        id: "d4",
        type: "delay",
        label: "Wait 4 Days",
        config: { duration: "4", unit: "days" },
        positionX: 300,
        positionY: 570,
      },
      {
        id: "a5",
        type: "action",
        label: "Flag for Sales",
        config: { action: "update_lead", stage: "qualified", tags: ["needs_attention"] },
        positionX: 300,
        positionY: 700,
      },
    ],
    edges: [
      { sourceNodeId: "t3", targetNodeId: "on1" },
      { sourceNodeId: "on1", targetNodeId: "d3" },
      { sourceNodeId: "d3", targetNodeId: "on2" },
      { sourceNodeId: "on2", targetNodeId: "d4" },
      { sourceNodeId: "d4", targetNodeId: "a5" },
    ],
  },
];

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

  console.log(`Seeding templates & leads into: ${org.name} (${org.slug})\n`);

  // ── Workflow templates ─────────────────────────────────────────────

  const templateNames = TEMPLATES.map((t) => t.name);
  const existingNames = await prisma.workflow.findMany({
    where: { organizationId: org.id, name: { in: templateNames } },
    select: { name: true },
  });
  const existingSet = new Set(existingNames.map((w) => w.name));

  for (const tmpl of TEMPLATES) {
    if (existingSet.has(tmpl.name)) {
      console.log(`"${tmpl.name}" already exists, skipping.`);
      continue;
    }
    const wf = await prisma.workflow.create({
      data: {
        organizationId: org.id,
        name: tmpl.name,
        description: tmpl.description,
        versions: { create: [{ version: 1 }] },
      },
      include: { versions: true },
    });
    const versionId = wf.versions[0].id;
    for (const n of tmpl.nodes) {
      await prisma.workflowNode.create({ data: { versionId, ...n } });
    }
    for (const e of tmpl.edges) {
      await prisma.workflowEdge.create({ data: { versionId, ...e } });
    }
    console.log(`Created "${tmpl.name}" (${tmpl.nodes.length} nodes, ${tmpl.edges.length} edges)`);
  }
  console.log("");

  // ── Demo leads ──────────────────────────────────────────────────────

  const leads = [
    { name: "Alice Johnson", email: "alice@company.com", stage: "qualified" },
    { name: "Bob Smith", email: "bob@gmail.com", stage: "new" },
    { name: "Carol Williams", email: "carol@startup.io", stage: "proposal" },
    { name: "Dave Brown", email: "dave@enterprise.com", stage: "negotiation" },
    { name: "Eve Davis", email: "eve@corp.net", stage: "new" },
  ];

  const leadEmails = leads.map((l) => l.email);
  const existingLeadEmails = await prisma.lead.findMany({
    where: { organizationId: org.id, email: { in: leadEmails } },
    select: { email: true },
  });
  const existingEmailSet = new Set(existingLeadEmails.map((l) => l.email));

  let leadsCreated = 0;
  for (const l of leads) {
    if (existingEmailSet.has(l.email)) {
      console.log(`Lead "${l.name}" (${l.email}) already exists, skipping.`);
      continue;
    }
    await prisma.lead.create({ data: { organizationId: org.id, ...l } });
    leadsCreated++;
  }
  console.log(`Created ${leadsCreated} new lead(s)`);

  console.log("\nDone. Templates ready at /workflows");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
