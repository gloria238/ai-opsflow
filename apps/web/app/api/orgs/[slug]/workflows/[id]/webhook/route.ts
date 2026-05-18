// Public webhook endpoint — no JWT auth. Uses shared secret from trigger config.
// Enables schedule triggers (via external cron) and webhook triggers (via external services).

import { NextResponse } from "next/server";
import { prisma } from "@opsflow/db";
import crypto from "crypto";

export async function POST(request: Request, { params }: { params: { slug: string; id: string } }) {
  const secret = request.headers.get("x-webhook-secret");

  const workflow = await prisma.workflow.findUnique({
    where: { id: params.id },
    include: { organization: true },
  });

  if (!workflow) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  if (workflow.organization.slug !== params.slug) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const version = await prisma.workflowVersion.findFirst({
    where: { workflowId: params.id },
    orderBy: { version: "desc" },
    include: { nodes: true },
  });

  if (!version) return NextResponse.json({ error: "No workflow version" }, { status: 400 });

  const triggerNode = version.nodes.find((n) => n.type === "trigger");
  const triggerConfig = triggerNode?.config as Record<string, unknown> | undefined;

  if (!triggerNode) return NextResponse.json({ error: "Workflow has no trigger node" }, { status: 400 });

  const triggerType = triggerConfig?.type as string | undefined;
  if (triggerType !== "webhook" && triggerType !== "schedule") {
    return NextResponse.json(
      { error: `Trigger type is "${triggerType || "manual"}", not webhook or schedule` },
      { status: 400 },
    );
  }

  const expectedSecret = triggerConfig?.webhookSecret as string | undefined;
  if (expectedSecret && secret) {
    // Timing-safe comparison to prevent timing side-channel attacks
    const a = Buffer.from(secret);
    const b = Buffer.from(expectedSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }
  } else if (expectedSecret || secret) {
    // One side has a secret, the other doesn't — mismatch
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const run = await prisma.workflowRun.create({
    data: {
      versionId: version.id,
      input: {
        _orgId: workflow.organizationId,
        _workflowId: workflow.id,
        _triggerType: triggerType,
        ...((body as object) || {}),
      },
      status: "queued",
    },
  });

  try {
    const { workflowQueue } = await import("@opsflow/worker/queue");
    await workflowQueue.add("execute", { runId: run.id });
  } catch {
    console.warn("Webhook trigger: queue unavailable. Run will stay queued until worker picks it up.");
  }

  return NextResponse.json({ runId: run.id, status: "queued" }, { status: 201 });
}
