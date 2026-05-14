import http from "node:http";
import { Worker, Job } from "bullmq";
import { prisma } from "@opsflow/db";
import { connection, workflowQueue } from "./queue";

interface NodeShape {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface EdgeShape {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string | null;
}

// ── Topological sort (Kahn's algorithm) ──────────────────────────────
function topologicalSort(nodes: NodeShape[], edges: EdgeShape[]): NodeShape[] {
  const ids = new Set(nodes.map((n) => n.id));
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.sourceNodeId) || !ids.has(e.targetNodeId)) continue;
    adj.get(e.sourceNodeId)!.push(e.targetNodeId);
    inDeg.set(e.targetNodeId, (inDeg.get(e.targetNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, d] of inDeg) if (d === 0) queue.push(id);

  const sorted: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const nb of adj.get(id) ?? []) {
      const nd = (inDeg.get(nb) ?? 1) - 1;
      inDeg.set(nb, nd);
      if (nd === 0) queue.push(nb);
    }
  }

  const map = new Map(nodes.map((n) => [n.id, n]));
  return sorted.map((id) => map.get(id)!).filter(Boolean);
}

// ── Condition evaluation ─────────────────────────────────────────────
function evaluateCondition(
  config: Record<string, unknown>,
  input: Record<string, unknown>,
): "true" | "false" {
  const field = config.field as string | undefined;
  const operator = config.operator as string | undefined;
  const value = config.value as string | undefined;
  if (!field || !operator) return "true";

  let fieldValue: unknown = input;
  for (const key of field.split(".")) {
    if (fieldValue && typeof fieldValue === "object") {
      fieldValue = (fieldValue as Record<string, unknown>)[key];
    } else {
      fieldValue = undefined;
      break;
    }
  }

  const actual = fieldValue !== undefined ? String(fieldValue) : "";
  const expected = value ?? "";

  switch (operator) {
    case "equals":
      return actual === expected ? "true" : "false";
    case "not_equals":
      return actual !== expected ? "true" : "false";
    case "contains":
      return actual.toLowerCase().includes(expected.toLowerCase()) ? "true" : "false";
    case "greater_than":
      return Number(actual) > Number(expected) ? "true" : "false";
    case "less_than":
      return Number(actual) < Number(expected) ? "true" : "false";
    default:
      return "true";
  }
}

// ── Determine which nodes are reachable after condition branching ────
function getActiveNodeIds(
  sorted: NodeShape[],
  edges: EdgeShape[],
  input: Record<string, unknown>,
): Set<string> {
  const active = new Set<string>();
  const edgeMap = new Map<string, EdgeShape[]>();
  for (const e of edges) {
    const list = edgeMap.get(e.sourceNodeId) ?? [];
    list.push(e);
    edgeMap.set(e.sourceNodeId, list);
  }

  if (sorted.length > 0) active.add(sorted[0].id);

  for (const node of sorted) {
    if (!active.has(node.id)) continue;
    const outgoing = edgeMap.get(node.id) ?? [];

    if (node.type === "condition") {
      const result = evaluateCondition(node.config, input);
      for (const e of outgoing) {
        if (e.sourceHandle === result || (!e.sourceHandle && result === "true")) {
          active.add(e.targetNodeId);
        }
      }
    } else {
      for (const e of outgoing) active.add(e.targetNodeId);
    }
  }
  return active;
}

// ── Unit → ms conversion for delay ───────────────────────────────────
function unitToMs(duration: number, unit: string): number {
  switch (unit) {
    case "minutes": return duration * 60_000;
    case "hours":   return duration * 3_600_000;
    case "days":    return duration * 86_400_000;
    default:        return duration * 60_000;
  }
}

// ── Execute a single node (mock logic) ───────────────────────────────
async function executeNode(
  node: NodeShape,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (node.type) {
    case "trigger":
      return { triggeredAt: new Date().toISOString(), type: node.config.type ?? "manual" };

    case "action": {
      const action = (node.config.action as string) ?? "unknown";
      return {
        action,
        result: `executed ${action}`,
        executedAt: new Date().toISOString(),
      };
    }

    case "condition":
      return {
        field: node.config.field,
        operator: node.config.operator,
        value: node.config.value,
        result: evaluateCondition(node.config, input),
      };

    case "delay":
      return { delayed: true, duration: node.config.duration, unit: node.config.unit };

    default:
      return { result: `executed ${node.type}` };
  }
}

// ── Create a workflow run event ──────────────────────────────────────
async function createEvent(
  runId: string,
  nodeId: string,
  status: string,
  input: object,
  output: object,
) {
  return prisma.workflowRunEvent.create({
    data: { runId, nodeId, status, input, output },
  });
}

// ── Process a single run ─────────────────────────────────────────────
async function processRun(run: {
  id: string;
  status: string;
  input: unknown;
  workflowVersion: {
    nodes: NodeShape[];
    edges: EdgeShape[];
  };
  events?: Array<{
    nodeId: string;
    status: string;
    createdAt: Date;
  }>;
}): Promise<{ requeued?: boolean } | void> {
  // Skip runs that are no longer active (cancelled, completed, etc.)
  if (run.status !== "queued" && run.status !== "running") return;

  const nodes = run.workflowVersion.nodes;
  const edges = run.workflowVersion.edges;
  if (!nodes.length) return;

  // ── Mark queued → running ────────────────────────────────────────
  if (run.status === "queued") {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: "running", startedAt: new Date() },
    });
  }

  const input = (run.input as Record<string, unknown>) ?? {};
  const events = run.events ?? [];

  // ── Topological sort ─────────────────────────────────────────────
  const sorted = topologicalSort(nodes, edges);
  const activeIds = getActiveNodeIds(sorted, edges, input);

  // ── Fast-forward past already-completed nodes ────────────────────
  const succeededIds = new Set(
    events.filter((e) => e.status === "success").map((e) => e.nodeId),
  );

  // ── Execute pending active nodes in order ────────────────────────
  for (const node of sorted) {
    if (!activeIds.has(node.id)) continue;
    if (succeededIds.has(node.id)) continue;

    // ── Handle delay: re-queue with BullMQ delay ───────────────────
    if (node.type === "delay") {
      const delayEvent = events.find((e) => e.nodeId === node.id);
      if (delayEvent) {
        // BullMQ handled the timing — delay is elapsed, proceed
        await createEvent(run.id, node.id, "success", node.config as object, {});
        continue;
      }

      const duration = parseInt(String(node.config.duration ?? "0"), 10);
      const unit = String(node.config.unit ?? "minutes");
      await createEvent(run.id, node.id, "delayed", node.config as object, {});
      await workflowQueue.add("execute", { runId: run.id }, {
        delay: unitToMs(duration, unit),
      });
      return { requeued: true };
    }

    // ── Execute with retry support ─────────────────────────────────
    const maxRetries = (node.config.maxRetries as number) ?? 0;
    const failedCount = events.filter(
      (e) => e.nodeId === node.id && e.status === "failed",
    ).length;

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, attempt * 1000));
        }
        const output = await executeNode(node, input);
        await createEvent(run.id, node.id, "success", node.config as object, output);
        break; // success – move to next node
      } catch (err) {
        lastError = err;
        attempt++;
        if (attempt <= maxRetries) {
          await createEvent(run.id, node.id, "failed", node.config as object, {
            error: String(err),
            attempt,
          });
        }
      }
    }

    if (attempt > maxRetries) {
      // All retries exhausted
      await createEvent(run.id, node.id, "failed", node.config as object, {
        error: String(lastError),
        maxRetries,
      });
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "dead_letter", finishedAt: new Date() },
      });
      return;
    }
  }

  // ── All active nodes completed ───────────────────────────────────
  await prisma.workflowRun.update({
    where: { id: run.id },
    data: { status: "completed", finishedAt: new Date() },
  });
}

// ── Health file ─────────────────────────────────────────────────────
async function writeHealth(state: { status: string; activeRuns: number }) {
  try {
    const fs = await import("fs");
    const path = await import("path");
    // Write to monorepo root so web API can read it
    const healthFile = path.resolve(process.cwd(), "../../.worker-health.json");
    fs.writeFileSync(healthFile, JSON.stringify({ ...state, lastPoll: new Date().toISOString(), pid: process.pid }));
  } catch {
    // Non-critical
  }
}

// ── BullMQ Worker setup ─────────────────────────────────────────────
// ── Track active job count for health reporting ──────────────────────
let activeJobCount = 0;

const worker = new Worker(
  "workflow-runs",
  async (job: Job<{ runId: string }>) => {
    const run = await prisma.workflowRun.findUnique({
      where: { id: job.data.runId },
      include: {
        workflowVersion: { include: { nodes: true, edges: true } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!run) throw new Error(`Run ${job.data.runId} not found`);

    // Cast Prisma JSON fields to match NodeShape/processRun expectations
    const result = await processRun(run as unknown as Parameters<typeof processRun>[0]);
    if (result?.requeued) {
      console.log(`Run ${run.id}: delay node encountered, requeued`);
    }
  },
  { connection, concurrency: 5 },
);

worker.on("ready", () => {
  console.log("BullMQ Worker ready — listening for workflow-runs jobs");
  writeHealth({ status: "running", activeRuns: 0 });
});

worker.on("active", () => {
  activeJobCount++;
  writeHealth({ status: "running", activeRuns: activeJobCount });
});

worker.on("completed", () => {
  activeJobCount = Math.max(0, activeJobCount - 1);
  writeHealth({ status: activeJobCount > 0 ? "running" : "waiting", activeRuns: activeJobCount });
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
  writeHealth({ status: "error", activeRuns: 0 });
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
  writeHealth({ status: "error", activeRuns: 0 });
});

worker.on("drained", () => {
  console.log("Worker drained — no pending jobs");
  writeHealth({ status: "running", activeRuns: 0 });
});

// ── Healthcheck HTTP server (for Railway/container probes) ──────────
const healthPort = parseInt(process.env.PORT ?? "8080", 10);

function startHealthServer() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", activeRuns: activeJobCount }));
  });
  server.listen(healthPort, "0.0.0.0", () => {
    console.log(`Healthcheck server listening on 0.0.0.0:${healthPort}`);
  });
  server.on("error", (err) => console.error("Healthcheck server error:", err));
}
startHealthServer();

// ── Graceful shutdown ───────────────────────────────────────────────
async function shutdown() {
  console.log("Shutting down worker...");
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
