// Demo seed: realistic client presentation data.
// Usage: pnpm tsx packages/db/seed-demo.ts
//
// Creates "Acme Corp" org with:
//   - 1 owner (demo@acmecorp.com / demo123456)
//   - 15 leads at different pipeline stages
//   - 3 workflows (Lead Qualifier, Outreach, Nurture)
//   - 10 runs (6 completed, 1 failed, 1 running, 2 queued)
// All idempotent — safe to re-run.

import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), "packages/db/.env") });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ORG_SLUG = "acme-corp";
const ORG_NAME = "Acme Corp";
const DEMO_EMAIL = "demo@acmecorp.com";
const DEMO_PASSWORD = "demo123456";

// ── 15 realistic leads ──────────────────────────────────────────────────

const LEADS = [
  { name: "Sarah Chen", email: "sarah@techstartups.io", stage: "new" },
  { name: "Marcus Johnson", email: "marcus@enterprise.com", stage: "new" },
  { name: "Emily Rodriguez", email: "emily@scaleup.co", stage: "new" },
  { name: "James Wilson", email: "james@saasly.com", stage: "qualified" },
  { name: "Priya Patel", email: "priya@fintechx.io", stage: "qualified" },
  { name: "David Kim", email: "david@clouddeploy.dev", stage: "qualified" },
  { name: "Lisa Thompson", email: "lisa@retailgiant.com", stage: "qualified" },
  { name: "Alex Nguyen", email: "alex@healthtech.io", stage: "proposal" },
  { name: "Rachel Green", email: "rachel@agencypro.com", stage: "proposal" },
  { name: "Tom Baker", email: "tom@logisticshub.io", stage: "proposal" },
  { name: "Anna Kowalski", email: "anna@edtech.co", stage: "negotiation" },
  { name: "Carlos Mendez", email: "carlos@marketplace.io", stage: "negotiation" },
  { name: "Nina Okafor", email: "nina@consultingpro.com", stage: "closed-won" },
  { name: "Yuki Tanaka", email: "yuki@devtools.com", stage: "closed-won" },
  { name: "Ben Foster", email: "ben@legacybiz.com", stage: "closed-lost" },
];

// ── Workflow definitions ────────────────────────────────────────────────

const WORKFLOWS = [
  {
    name: "Lead Qualification",
    description: "AI scores inbound leads → hot leads flagged for sales, cold leads enter nurture. Avg completion: 3.2s.",
    nodes: [
      { id: "demo-t1", type: "trigger", label: "New Lead", config: { type: "manual" }, positionX: 250, positionY: 30 },
      { id: "demo-a1", type: "action", label: "AI Score Lead", config: { action: "score_lead" }, positionX: 250, positionY: 160 },
      { id: "demo-c1", type: "condition", label: "Score > 70?", config: { field: "score", operator: "greater_than", value: "70" }, positionX: 250, positionY: 300 },
      { id: "demo-a2", type: "action", label: "Flag as Hot Lead", config: { action: "update_lead", stage: "qualified", tags: ["hot"] }, positionX: 450, positionY: 430 },
      { id: "demo-a3", type: "action", label: "Move to Nurture", config: { action: "update_lead", stage: "new", tags: ["cold", "nurture"] }, positionX: 80, positionY: 430 },
    ],
    edges: [
      { sourceNodeId: "demo-t1", targetNodeId: "demo-a1" },
      { sourceNodeId: "demo-a1", targetNodeId: "demo-c1" },
      { sourceNodeId: "demo-c1", targetNodeId: "demo-a2", sourceHandle: "true" },
      { sourceNodeId: "demo-c1", targetNodeId: "demo-a3", sourceHandle: "false" },
    ],
  },
  {
    name: "Cold Outreach Follow-up",
    description: "Initial outreach → wait 2 days → check response → follow-up or move on. Multi-step sequence with delay.",
    nodes: [
      { id: "demo-t2", type: "trigger", label: "Start Campaign", config: { type: "manual" }, positionX: 250, positionY: 30 },
      { id: "demo-e1", type: "action", label: "Tag as Outreach Started", config: { action: "update_lead", tags: ["outreach_started"] }, positionX: 250, positionY: 160 },
      { id: "demo-d1", type: "delay", label: "Wait 2 Days", config: { duration: "2", unit: "days" }, positionX: 250, positionY: 300 },
      { id: "demo-c2", type: "condition", label: "Got Reply?", config: { field: "replied", operator: "equals", value: "true" }, positionX: 250, positionY: 440 },
      { id: "demo-e2", type: "action", label: "Tag as Follow-up Sent", config: { action: "update_lead", tags: ["followup_sent"] }, positionX: 80, positionY: 570 },
      { id: "demo-e3", type: "action", label: "Move to Qualified", config: { action: "update_lead", stage: "qualified" }, positionX: 450, positionY: 570 },
    ],
    edges: [
      { sourceNodeId: "demo-t2", targetNodeId: "demo-e1" },
      { sourceNodeId: "demo-e1", targetNodeId: "demo-d1" },
      { sourceNodeId: "demo-d1", targetNodeId: "demo-c2" },
      { sourceNodeId: "demo-c2", targetNodeId: "demo-e2", sourceHandle: "false" },
      { sourceNodeId: "demo-c2", targetNodeId: "demo-e3", sourceHandle: "true" },
    ],
  },
  {
    name: "Trial User Nurture",
    description: "Trial signup → tag as onboarding → wait 3 days → send reminder → wait 4 days → flag for sales. Converts trial users.",
    nodes: [
      { id: "demo-t3", type: "trigger", label: "Trial Started", config: { type: "manual" }, positionX: 250, positionY: 30 },
      { id: "demo-on1", type: "action", label: "Tag as Onboarding", config: { action: "update_lead", tags: ["onboarding"] }, positionX: 250, positionY: 160 },
      { id: "demo-d3", type: "delay", label: "Wait 3 Days", config: { duration: "3", unit: "days" }, positionX: 250, positionY: 300 },
      { id: "demo-on2", type: "action", label: "Mark as Engaged", config: { action: "update_lead", tags: ["reminder_sent"] }, positionX: 250, positionY: 440 },
      { id: "demo-d4", type: "delay", label: "Wait 4 Days", config: { duration: "4", unit: "days" }, positionX: 250, positionY: 570 },
      { id: "demo-a5", type: "action", label: "Flag for Sales", config: { action: "update_lead", stage: "qualified", tags: ["needs_attention"] }, positionX: 250, positionY: 700 },
    ],
    edges: [
      { sourceNodeId: "demo-t3", targetNodeId: "demo-on1" },
      { sourceNodeId: "demo-on1", targetNodeId: "demo-d3" },
      { sourceNodeId: "demo-d3", targetNodeId: "demo-on2" },
      { sourceNodeId: "demo-on2", targetNodeId: "demo-d4" },
      { sourceNodeId: "demo-d4", targetNodeId: "demo-a5" },
    ],
  },
];

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding demo data for client presentations...\n");

  // ── Org ────────────────────────────────────────────────────────────
  let org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: ORG_NAME, slug: ORG_SLUG } });
    console.log(`Created org: ${ORG_NAME} (${ORG_SLUG})`);
  } else {
    console.log(`Org exists: ${ORG_NAME} (${ORG_SLUG})`);
  }

  // ── User ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: DEMO_EMAIL, name: "Demo User", passwordHash, emailVerified: true },
    });
    console.log(`Created user: ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
  } else {
    console.log(`User exists: ${DEMO_EMAIL}`);
  }

  // ── Membership ─────────────────────────────────────────────────────
  let membership = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
  });
  if (!membership) {
    membership = await prisma.membership.create({
      data: { organizationId: org.id, userId: user.id, role: "owner" },
    });
    console.log("Added demo user as owner");
  }

  // ── Leads ──────────────────────────────────────────────────────────
  const existingLeads = await prisma.lead.findMany({
    where: { organizationId: org.id, email: { in: LEADS.map((l) => l.email) } },
    select: { email: true },
  });
  const existingEmails = new Set(existingLeads.map((l) => l.email));
  let leadsCreated = 0;

  for (const lead of LEADS) {
    if (existingEmails.has(lead.email)) continue;
    await prisma.lead.create({ data: { organizationId: org.id, ...lead } });
    leadsCreated++;
  }
  console.log(`Leads: ${leadsCreated} new (${LEADS.length - leadsCreated} existing) → ${LEADS.length} total`);

  // Reload leads for IDs
  const allLeads = await prisma.lead.findMany({
    where: { organizationId: org.id },
    select: { id: true, email: true, stage: true },
  });

  // ── Workflows ──────────────────────────────────────────────────────
  const existingWfs = await prisma.workflow.findMany({
    where: { organizationId: org.id, name: { in: WORKFLOWS.map((w) => w.name) } },
    select: { name: true },
  });
  const existingWfSet = new Set(existingWfs.map((w) => w.name));

  for (const tmpl of WORKFLOWS) {
    if (existingWfSet.has(tmpl.name)) {
      console.log(`Workflow "${tmpl.name}" exists, skipping.`);
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

  // ── Runs (realistic history) ───────────────────────────────────────
  const workflows = await prisma.workflow.findMany({
    where: { organizationId: org.id },
    include: { versions: { take: 1, orderBy: { version: "desc" }, include: { nodes: true } } },
  });

  const existingRunCount = await prisma.workflowRun.count({
    where: { workflowVersion: { workflow: { organizationId: org.id } } },
  });

  if (existingRunCount > 0) {
    console.log(`\nRuns: ${existingRunCount} already exist, skipping run seed.`);
  } else {
    const now = Date.now();
    const wf = workflows[0]; // Lead Qualification
    if (wf && wf.versions[0]) {
      const v = wf.versions[0];
      const nodes = v.nodes;

      // Build run data: various realistic statuses
      const runTemplates = [
        { status: "completed", ago: 2, input: { leadId: allLeads[3]?.id }, events: "score_hot" },
        { status: "completed", ago: 5, input: { leadId: allLeads[4]?.id }, events: "score_hot" },
        { status: "completed", ago: 8, input: { leadId: allLeads[5]?.id }, events: "score_cold" },
        { status: "completed", ago: 12, input: { leadId: allLeads[6]?.id }, events: "score_hot" },
        { status: "completed", ago: 20, input: { leadId: allLeads[7]?.id }, events: "score_cold" },
        { status: "completed", ago: 30, input: { leadId: allLeads[8]?.id }, events: "score_hot" },
        { status: "failed", ago: 1, input: { leadId: allLeads[0]?.id }, events: "ai_error" },
        { status: "running", ago: 0.5, input: { leadId: allLeads[1]?.id }, events: "in_progress" },
        { status: "queued", ago: 0.1, input: { leadId: allLeads[2]?.id }, events: "none" },
        { status: "queued", ago: 0.05, input: { leadId: allLeads[9]?.id }, events: "none" },
      ];

      for (const rt of runTemplates) {
        const startedAt = new Date(now - rt.ago * 60 * 1000);
        const finishedAt = rt.status === "completed" || rt.status === "failed"
          ? new Date(startedAt.getTime() + 3000 + Math.random() * 5000)
          : null;

        const run = await prisma.workflowRun.create({
          data: {
            versionId: v.id,
            status: rt.status,
            input: rt.input,
            startedAt,
            finishedAt,
          },
        });

        // Create realistic events
        const triggerNode = nodes.find((n) => n.type === "trigger")!;
        const scoreNode = nodes.find((n) => n.type === "action" && n.id === "demo-a1")!;
        const condNode = nodes.find((n) => n.type === "condition")!;
        const hotNode = nodes.find((n) => n.id === "demo-a2")!;
        const coldNode = nodes.find((n) => n.id === "demo-a3")!;

        if (rt.events === "none") {
          // queued — no events yet
          continue;
        }

        // Trigger always succeeds
        await prisma.workflowRunEvent.create({
          data: { runId: run.id, nodeId: triggerNode.id, status: "success", input: triggerNode.config as object, output: {} },
        });

        if (rt.events === "in_progress") {
          // AI score succeeded, condition pending
          await prisma.workflowRunEvent.create({
            data: { runId: run.id, nodeId: scoreNode.id, status: "success", input: scoreNode.config as object, output: { score: 85 } },
          });
          continue;
        }

        if (rt.events === "ai_error") {
          await prisma.workflowRunEvent.create({
            data: {
              runId: run.id, nodeId: scoreNode.id, status: "failed",
              input: scoreNode.config as object,
              output: { error: "AI service temporarily unavailable — retry limit exceeded" },
            },
          });
          continue;
        }

        // Completed runs: full path
        const isHot = rt.events === "score_hot";
        const score = isHot ? 75 + Math.floor(Math.random() * 20) : 35 + Math.floor(Math.random() * 30);

        await prisma.workflowRunEvent.create({
          data: { runId: run.id, nodeId: scoreNode.id, status: "success", input: scoreNode.config as object, output: { score } },
        });

        await prisma.workflowRunEvent.create({
          data: {
            runId: run.id, nodeId: condNode.id, status: "success",
            input: condNode.config as object,
            output: { field: "score", operator: "greater_than", value: "70", result: isHot ? "true" : "false" },
          },
        });

        const branchNode = isHot ? hotNode : coldNode;
        await prisma.workflowRunEvent.create({
          data: {
            runId: run.id, nodeId: branchNode.id, status: "success",
            input: branchNode.config as object,
            output: { action: "update_lead", result: "executed update_lead" },
          },
        });
      }

      console.log(`Created ${runTemplates.length} runs (6 completed, 1 failed, 1 running, 2 queued)`);
    }
  }

  // ── Add activities to leads ────────────────────────────────────────
  const existingActivities = await prisma.leadActivity.count({
    where: { organizationId: org.id },
  });
  if (existingActivities === 0 && allLeads.length > 0) {
    const activities = [
      { leadIdx: 3, type: "stage_change", content: "Stage changed from new → qualified", metadata: { fromStage: "new", toStage: "qualified" } },
      { leadIdx: 4, type: "stage_change", content: "Stage changed from new → qualified", metadata: { fromStage: "new", toStage: "qualified" } },
      { leadIdx: 7, type: "stage_change", content: "Stage changed from qualified → proposal", metadata: { fromStage: "qualified", toStage: "proposal" } },
      { leadIdx: 10, type: "stage_change", content: "Stage changed from proposal → negotiation", metadata: { fromStage: "proposal", toStage: "negotiation" } },
      { leadIdx: 12, type: "stage_change", content: "Stage changed from negotiation → closed-won 🎉", metadata: { fromStage: "negotiation", toStage: "closed-won" } },
    ];
    for (const a of activities) {
      await prisma.leadActivity.create({
        data: {
          leadId: allLeads[a.leadIdx].id,
          organizationId: org.id,
          userId: user.id,
          userName: "Demo User",
          type: a.type,
          content: a.content,
          metadata: a.metadata,
        },
      });
    }
    console.log(`Created ${activities.length} lead activities`);
  }

  console.log("\n✅ Demo data ready!");
  console.log(`   Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`   URL:   http://localhost:3000`);
  console.log(`\nDashboard shows: ${LEADS.length} leads, ${WORKFLOWS.length} workflows, 10 runs (6 completed)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
