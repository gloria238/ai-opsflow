// Browse and install workflow templates
import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import { getSession } from "@/lib/session";
import { requirePermission } from "@/lib/permissions";
import crypto from "crypto";

// Template definitions (synced with packages/db/seed-production.ts)
const TEMPLATES = [
  {
    slug: "lead-qualification",
    name: "Lead Qualification",
    description: "New lead → AI scores it → hot leads flagged, cold leads enter nurture. Perfect for sales teams needing automated lead triage.",
    nodes: [
      { id: "t1", type: "trigger", label: "New Lead", config: { type: "manual" }, positionX: 300, positionY: 30 },
      { id: "a1", type: "action", label: "AI Score Lead", config: { action: "score_lead" }, positionX: 300, positionY: 160 },
      { id: "c1", type: "condition", label: "Score > 70?", config: { field: "score", operator: "greater_than", value: "70" }, positionX: 300, positionY: 300 },
      { id: "a2", type: "action", label: "Flag Hot Lead", config: { action: "update_lead", stage: "qualified", tags: ["hot"] }, positionX: 540, positionY: 430 },
      { id: "a3", type: "action", label: "Add to Nurture", config: { action: "update_lead", stage: "new", tags: ["nurture"] }, positionX: 100, positionY: 430 },
    ],
    edges: [
      { sourceNodeId: "t1", targetNodeId: "a1" },
      { sourceNodeId: "a1", targetNodeId: "c1" },
      { sourceNodeId: "c1", targetNodeId: "a2", sourceHandle: "true" },
      { sourceNodeId: "c1", targetNodeId: "a3", sourceHandle: "false" },
    ],
  },
  {
    slug: "cold-outreach",
    name: "Cold Outreach Follow-up",
    description: "Send a cold outreach email → wait 2 days → follow-up email → flag engaged leads. Best for outbound sales sequences.",
    nodes: [
      { id: "t1", type: "trigger", label: "Start Outreach", config: { type: "manual" }, positionX: 300, positionY: 30 },
      { id: "a1", type: "action", label: "Cold Outreach Email", config: { action: "compose_email", emailType: "cold-outreach", to: "{{lead.email}}", send: "true" }, positionX: 300, positionY: 160 },
      { id: "d1", type: "delay", label: "Wait 2 days", config: { duration: "2", unit: "days" }, positionX: 300, positionY: 300 },
      { id: "a2", type: "action", label: "Follow-up Email", config: { action: "compose_email", emailType: "follow-up", to: "{{lead.email}}", send: "true" }, positionX: 300, positionY: 440 },
      { id: "a3", type: "action", label: "Mark Contacted", config: { action: "update_lead", stage: "qualified", tags: ["contacted"] }, positionX: 300, positionY: 570 },
    ],
    edges: [
      { sourceNodeId: "t1", targetNodeId: "a1" },
      { sourceNodeId: "a1", targetNodeId: "d1" },
      { sourceNodeId: "d1", targetNodeId: "a2" },
      { sourceNodeId: "a2", targetNodeId: "a3" },
    ],
  },
  {
    slug: "trial-nurture",
    name: "Trial User Nurture",
    description: "Welcome email on signup → wait 3 days → check engagement → send case study or reminder. For SaaS teams managing trial conversions.",
    nodes: [
      { id: "t1", type: "trigger", label: "Trial Started", config: { type: "manual" }, positionX: 300, positionY: 30 },
      { id: "a1", type: "action", label: "Welcome Email", config: { action: "compose_email", emailType: "welcome", to: "{{lead.email}}", send: "true" }, positionX: 300, positionY: 160 },
      { id: "d1", type: "delay", label: "Wait 3 days", config: { duration: "3", unit: "days" }, positionX: 300, positionY: 300 },
      { id: "a2", type: "action", label: "Check-in Email", config: { action: "compose_email", emailType: "follow-up", to: "{{lead.email}}", send: "true" }, positionX: 300, positionY: 440 },
      { id: "a3", type: "action", label: "Mark Nurtured", config: { action: "update_lead", stage: "negotiation", tags: ["nurtured"] }, positionX: 300, positionY: 570 },
    ],
    edges: [
      { sourceNodeId: "t1", targetNodeId: "a1" },
      { sourceNodeId: "a1", targetNodeId: "d1" },
      { sourceNodeId: "d1", targetNodeId: "a2" },
      { sourceNodeId: "a2", targetNodeId: "a3" },
    ],
  },
];

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "view_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  return NextResponse.json({ templates: TEMPLATES });
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, organization: { slug: params.slug } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try { requirePermission(membership.role, "manage_workflows"); }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }

  const body = await request.json();
  const slug = body.slug as string;
  const template = TEMPLATES.find((t) => t.slug === slug);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  // Generate unique IDs for nodes to avoid collisions across installs
  const idMap = new Map<string, string>();
  for (const n of template.nodes) {
    idMap.set(n.id, crypto.randomUUID());
  }

  // Create a new workflow from the template
  const workflow = await prisma.workflow.create({
    data: {
      organizationId: membership.organizationId,
      name: template.name,
      description: template.description,
      versions: {
        create: {
          version: 1,
          nodes: {
            create: template.nodes.map((n) => ({
              id: idMap.get(n.id)!,
              type: n.type,
              label: n.label,
              config: n.config,
              positionX: n.positionX,
              positionY: n.positionY,
            })),
          },
          edges: {
            create: template.edges.map((e: { sourceNodeId: string; targetNodeId: string; sourceHandle?: string | null }) => ({
              sourceNodeId: idMap.get(e.sourceNodeId) ?? e.sourceNodeId,
              targetNodeId: idMap.get(e.targetNodeId) ?? e.targetNodeId,
              sourceHandle: e.sourceHandle ?? null,
            })),
          },
        },
      },
    },
    include: { versions: true },
  });

  return NextResponse.json(workflow, { status: 201 });
}
