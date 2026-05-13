// packages/db/prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Clean existing data (order respects FK constraints)
  await prisma.workflowRunEvent.deleteMany();
  await prisma.workflowRun.deleteMany();
  await prisma.workflowEdge.deleteMany();
  await prisma.workflowNode.deleteMany();
  await prisma.workflowVersion.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 创建 Org + User
  const org = await prisma.organization.create({
    data: { name: "Demo Org", slug: "demo-org" },
  });

  const user = await prisma.user.create({
    data: { email: "alice@example.com", name: "Alice", passwordHash: "$2a$10$ubjriCDRXb1zUULZN7TNd.5hqnTKmqtd26giJmd4RHmGS7kthOFkq" },
  });

  await prisma.membership.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: "owner",
    },
  });

  // Create a simple demo workflow (single linear path)
  const simpleWf = await prisma.workflow.create({
    data: {
      organizationId: org.id,
      name: "Simple Email Workflow",
      description: "Trigger → Send email",
      versions: { create: [{ version: 1 }] },
    },
    include: { versions: true },
  });

  const simpleVersionId = simpleWf.versions[0].id;
  const trig1 = await prisma.workflowNode.create({
    data: { versionId: simpleVersionId, type: "trigger", label: "Manual Trigger", config: {}, positionX: 250, positionY: 50 },
  });
  const act1 = await prisma.workflowNode.create({
    data: { versionId: simpleVersionId, type: "action", label: "Send Email", config: { action: "send_email" }, positionX: 250, positionY: 200 },
  });
  await prisma.workflowEdge.create({
    data: { versionId: simpleVersionId, sourceNodeId: trig1.id, targetNodeId: act1.id },
  });

  // Create a complex demo workflow (branching)
  const complexWf = await prisma.workflow.create({
    data: {
      organizationId: org.id,
      name: "Lead Qualification Pipeline",
      description: "Route leads based on email domain",
      versions: { create: [{ version: 1 }] },
    },
    include: { versions: true },
  });

  const complexVersionId = complexWf.versions[0].id;
  const t = await prisma.workflowNode.create({
    data: { versionId: complexVersionId, type: "trigger", label: "Webhook Received", config: { type: "webhook" }, positionX: 350, positionY: 30 },
  });
  const c = await prisma.workflowNode.create({
    data: { versionId: complexVersionId, type: "condition", label: "Is Company Email?", config: { field: "lead.email", operator: "contains", value: "@company.com" }, positionX: 350, positionY: 200 },
  });
  const hot = await prisma.workflowNode.create({
    data: { versionId: complexVersionId, type: "action", label: "Mark as Hot Lead", config: { action: "update_lead" }, positionX: 550, positionY: 320 },
  });
  const cold = await prisma.workflowNode.create({
    data: { versionId: complexVersionId, type: "action", label: "Send Nurture Email", config: { action: "send_email" }, positionX: 150, positionY: 320 },
  });
  const delay = await prisma.workflowNode.create({
    data: { versionId: complexVersionId, type: "delay", label: "Wait 1 Day", config: { duration: "1", unit: "days" }, positionX: 150, positionY: 460 },
  });
  await prisma.workflowEdge.create({ data: { versionId: complexVersionId, sourceNodeId: t.id, targetNodeId: c.id } });
  await prisma.workflowEdge.create({ data: { versionId: complexVersionId, sourceNodeId: c.id, targetNodeId: hot.id } });
  await prisma.workflowEdge.create({ data: { versionId: complexVersionId, sourceNodeId: c.id, targetNodeId: cold.id } });
  await prisma.workflowEdge.create({ data: { versionId: complexVersionId, sourceNodeId: cold.id, targetNodeId: delay.id } });

  // 创建 Lead
  await prisma.lead.create({
    data: {
      organizationId: org.id,
      name: "Lead A",
      email: "lead@example.com",
      stage: "new",
      ownerId: user.id,
    },
  });

  console.log("Seed finished");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
