# OpsFlow AI — Architecture Case Study

> A production-grade AI workflow automation platform with multi-tenant CRM.
>
> *This document is written for engineers and technical decision-makers evaluating the system's architectural maturity.*

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Workflow Execution Lifecycle](#workflow-execution-lifecycle)
- [Multi-Tenant Isolation](#multi-tenant-isolation)
- [Queue & Retry Design](#queue--retry-design)
- [Key Architectural Decisions](#key-architectural-decisions)
- [Data Model](#data-model)
- [What We Did Not Build (Yet)](#what-we-did-not-build-yet)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  Next.js 14 App Router · React 18 · TanStack Query · SSE    │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / SSE
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Layer (Edge + Server)          │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Auth Routes │  │  CRUD Routes │  │  Stream Routes   │   │
│  │ /api/auth/* │  │  /api/orgs/* │  │  /runs/stream    │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │              │
│         ▼                ▼                    ▼              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              @opsflow/db (Prisma 6)                 │    │
│  │         PostgreSQL · opsflow schema                 │    │
│  └─────────────────────┬───────────────────────────────┘    │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BullMQ + Upstash Redis                    │
│                                                              │
│  Queue: "workflow-runs"                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Worker (concurrency: 5)                             │   │
│  │  • Picks up queued jobs                              │   │
│  │  • Loads run + events from DB                        │   │
│  │  • Executes DAG (topological sort, condition         │   │
│  │    branching, delay scheduling, retry logic)         │   │
│  │  • Writes execution events back to DB                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS | SSR for auth, RSC for data fetching, client components for interactivity |
| **State** | TanStack Query (server cache), Zustand (client state) | Cache invalidation patterns, optimistic updates, background refetching |
| **API** | Next.js Route Handlers | Co-located with app, no separate API server needed at this stage |
| **Database** | PostgreSQL 16 (Supabase) + Prisma 6 | Type-safe queries, migrations, multi-schema support |
| **Queue** | BullMQ v5 + Upstash Redis | Redis-backed job queue with delay, retry, concurrency control |
| **Auth** | Custom JWT (jose) + bcryptjs + httpOnly cookies | Stateless sessions, no Redis needed for session store |
| **AI** | DeepSeek API (REST) | Stateless inference, zero infrastructure overhead |
| **Monorepo** | pnpm workspaces + Turborepo | Shared Prisma client, consistent dependency management |

---

## Workflow Execution Lifecycle

Every workflow run moves through a well-defined lifecycle, designed for observability and resilience.

### State Machine

```
                    ┌──────────┐
                    │  QUEUED   │
                    └────┬─────┘
                         │ (worker picks up job)
                         ▼
                    ┌──────────┐
              ┌─────│ RUNNING  │─────┐
              │     └──────────┘     │
              │                      │
     (all nodes done)        (node fails + no retries)
              │                      │
              ▼                      ▼
       ┌──────────┐          ┌──────────────┐
       │COMPLETED │          │ DEAD_LETTER  │
       └──────────┘          └──────────────┘
              ▲                      ▲
              │                      │
              │       (retry)        │
              └──────────────────────┘
```

### Step-by-Step: What Happens When a User Clicks "Run Now"

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  User    │      │  API     │      │  DB      │      │  Queue   │
│  Browser │      │  Route   │      │(Postgres)│      │ (BullMQ) │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │ POST /trigger   │                 │                 │
     │────────────────>│                 │                 │
     │                 │ INSERT run      │                 │
     │                 │ (status: queued)│                 │
     │                 │────────────────>│                 │
     │                 │                 │                 │
     │                 │ queue.add()     │                 │
     │                 │──────────────────────────────────>│
     │                 │                 │                 │
     │ 201 Created     │                 │                 │
     │<────────────────│                 │                 │
     │                 │                 │                 │
     │                 │    ┌─────────────────────┐        │
     │                 │    │  WORKER (separate   │        │
     │                 │    │  Node.js process)   │        │
     │                 │    │                     │        │
     │                 │    │  ← job received     │<───────│
     │                 │    │  UPDATE run         │        │
     │                 │    │  (status: running)  │        │
     │                 │    │ ────────────────────│        │
     │                 │    │                     │        │
     │                 │    │  Execute DAG:       │        │
     │                 │    │  • topological sort │        │
     │                 │    │  • evaluate conds   │        │
     │                 │    │  • execute nodes    │        │
     │                 │    │  • CREATE events    │        │
     │                 │    │  • handle delays    │        │
     │                 │    │                     │        │
     │                 │    │  UPDATE run         │        │
     │                 │    │  (status: completed)│        │
     │                 │    │ ────────────────────│        │
     │                 │    └─────────────────────┘        │
```

### DAG Execution Engine

Within the worker, each run's workflow is modeled as a **directed acyclic graph (DAG)**:

1. **Topological Sort** (Kahn's algorithm) — produces a linear execution order respecting edge dependencies
2. **Active Node Resolution** — walks the DAG applying condition branch outcomes to determine which nodes are reachable
3. **Fast-Forward** — skips nodes with existing `success` events (enables safe resumption after worker restart)
4. **Per-Node Execution** — each node runs with its own retry budget; `delay` nodes use BullMQ's built-in `delay` option to re-queue rather than polling
5. **Event Logging** — every node outcome (`success`, `failed`, `delayed`) is persisted as a `WorkflowRunEvent`

This design means the worker is **stateless**: if it crashes mid-execution, the next job load reads persisted events and resumes from where it left off.

---

## Multi-Tenant Isolation

Every query in the system is scoped by `organizationId`. No tenant can access another tenant's data — even through misconfigured queries or URL manipulation.

### Schema-Level Isolation

```prisma
model Organization {
  id           String       @id @default(uuid())
  slug         String       @unique
  memberships  Membership[]
  workflows    Workflow[]
  leads        Lead[]
  auditLogs    AuditLog[]
}

model Membership {
  id             String       @id @default(uuid())
  userId         String
  organizationId String
  role           MembershipRole @default(member)
  user           User         @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@unique([userId, organizationId])
}
```

### Enforcement Pattern

The access control pattern is consistent across all 16+ API routes:

```typescript
// Step 1: Resolve membership (fails if user doesn't belong to org)
const membership = await prisma.membership.findFirst({
  where: { userId: session.userId, organization: { slug: params.slug } },
});
if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

// Step 2: Check permission (role-based)
requirePermission(membership.role, "view_workflows");

// Step 3: Scope query
const data = await prisma.workflow.findMany({
  where: { organizationId: membership.organizationId },
});
```

This three-step pattern (resolve → authorize → scope) ensures that:
- A user in org A cannot access org B's data even with a valid JWT
- A user with `viewer` role cannot perform destructive operations
- The `organizationId` filter is applied server-side, never relying on client input

### JWT Structure

```json
{
  "userId": "uuid",
  "orgId": "uuid",
  "orgSlug": "tenant-slug",
  "role": "admin"
}
```

The JWT is signed with a server-only secret (`JWT_SECRET`) and transmitted via httpOnly, sameSite cookies. Role changes take effect on next login (JWTs are not live-revoked — a conscious trade-off described below).

---

## Queue & Retry Design

### Why BullMQ

The decision to use BullMQ v5 with Upstash Redis was driven by four requirements:

| Requirement | BullMQ Approach |
|-------------|----------------|
| **Delayed jobs** | Native `job.delay` — precise timing without polling |
| **Concurrency control** | `concurrency: 5` per worker instance |
| **Job persistence** | Redis persistence + DB state as source of truth |
| **Operational simplicity** | Single dependency (Redis), no sidecar or agent |

### Queue Configuration

```
Queue: "workflow-runs"
  ├── Job: { runId: string }
  ├── Concurrency: 5
  └── Connection: Upstash Redis (TLS)
```

### Retry Strategy

Two layers of retry operate independently:

**Layer 1: In-Process Node Retries**

Configured per-node via `maxRetries`. When a node's execution throws, the worker retries in-process with linear backoff (`attempt * 1000ms`). All retry attempts are logged as `failed` events. After exhausting the budget, the run enters `dead_letter` status.

```
Node.execute() → Error → failed event → wait 1s → retry
                → Error → failed event → wait 2s → retry
                → Error → dead_letter
```

**Layer 2: BullMQ Job Retries**

If the entire `processRun()` function throws (e.g., transient database error), BullMQ retries the entire job with exponential backoff. This is a safety net for infrastructure errors, not node execution errors.

### Delay Node Implementation

Delay nodes use BullMQ's native `delay` option, replacing the earlier polling-based approach:

```typescript
// When a delay node is encountered:
await createEvent(run.id, node.id, "delayed", config, {});
await workflowQueue.add("execute", { runId: run.id }, {
  delay: unitToMs(duration, unit),  // BullMQ handles the timing
});
return { requeued: true };
```

The current job completes immediately. BullMQ guarantees the next job fires after exactly `delay` milliseconds — no polling, no wasted cycles, no clock drift concerns.

---

## Key Architectural Decisions

### BullMQ vs Temporal

**Decision: BullMQ over Temporal.**

| Factor | BullMQ | Temporal |
|--------|--------|----------|
| **Infrastructure** | Redis (single dependency) | Temporal Server + Cassandra/PostgreSQL + Elasticsearch |
| **State management** | Worker reads persisted DB events to resume | Full workflow state in Temporal's history store |
| **Learning curve** | Job in → handler out | Workflow functions, determinism requirements, SDK concepts |
| **Debugging** | Standard Node.js debugging + BullMQ UI | Web UI + replay, but debugging requires understanding Temporal concepts |
| **Team fit** | Matches our current team's expertise | Would require dedicated operational investment |

**Verdict: BullMQ was the right call for our current scale and team.** Temporal remains on the roadmap for when we need long-running workflows (hours+/days+), saga patterns, or human-in-the-loop steps. The migration path is well understood: wrap each BullMQ job handler body as a Temporal activity.

### SSE vs WebSocket

**Decision: Server-Sent Events over WebSocket.**

| Factor | SSE | WebSocket |
|--------|-----|-----------|
| **Transport** | HTTP (standard, no upgrade) | HTTP upgrade to TCP |
| **Direction** | Server → Client only | Bidirectional |
| **Reconnection** | Built-in (EventSource API) | Manual implementation |
| **Infrastructure** | Works through all standard load balancers | Requires sticky sessions or stateful proxy config |
| **Use case fit** | Perfect fit — we only push run status updates | Over-engineered for unidirectional status pushes |

**Verdict: SSE matches our actual use case.** We push workflow run status from server to client. The client never sends real-time data back — it uses standard REST POST/PUT for mutations. SSE's built-in reconnection and HTTP compatibility make it strictly simpler to deploy and operate.

The implementation uses a standard `ReadableStream` in a Next.js Route Handler:

```typescript
const stream = new ReadableStream({
  start(controller) {
    const poll = setInterval(async () => {
      const updates = await fetchLatestRuns(orgId);
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(updates)}\n\n`));
    }, 3000);
    req.signal.addEventListener("abort", () => clearInterval(poll));
  },
});
```

### Prisma JSON Fields vs Separate Tables

**Decision: JSON fields for node configurations.**

WorkflowNode's `config` field stores node-specific configuration as a JSON column rather than using a separate table per node type (e.g., `TriggerConfig`, `ActionConfig`, `ConditionConfig`).

**Why:** Node types are fixed and finite (trigger, action, condition, delay). Config schemas are type-checked at the application layer, not the database layer. Using JSON eliminates N join tables and makes schema evolution trivial — adding a new config field requires no migration.

**Trade-off:** We lose database-level referential integrity for config values. We accept this because config data is never queried independently (you always load it as part of a workflow graph).

### Polling Worker → BullMQ Migration

The initial implementation used a simple `setInterval(poll, 3000)` that queried the database for queued runs — a design that was deliberately naive. It served two purposes:

1. **Validate the workflow execution engine** without queue infrastructure dependencies
2. **Establish the correctness of the DAG logic** before introducing queue semantics

The migration to BullMQ was mechanical:
- Replace `setInterval` → `new Worker("workflow-runs", handler, { connection })`
- Replace DB polling → `queue.add("execute", { runId })`
- Replace delay polling → `queue.add(..., { delay })`

No core execution logic changed. This is a strong signal that the architecture was well-factored from the start.

### Auth: Custom JWT vs Auth0/Clerk

**Decision: Custom JWT.**

Self-contained JWT tokens mean zero external dependencies for authentication. The trade-off is no social login, no password reset flows, no session revocation — but these are additive features, not architectural blockers. The cookie-based session (`httpOnly`, `sameSite: "lax"`) works through standard browser security models.

---

## Data Model

```
Organization
  ├── Membership → User (many-to-many with role)
  ├── Workflow
  │     └── WorkflowVersion (immutable snapshots)
  │           ├── WorkflowNode (typed + JSON config)
  │           └── WorkflowEdge (DAG connections)
  ├── WorkflowRun (status machine)
  │     └── WorkflowRunEvent (per-node execution log)
  ├── Lead (CRM records)
  │     └── LeadActivity (change log)
  └── AuditLog (org-wide activity)
```

Key modeling decisions:

- **WorkflowVersion is immutable** — each save creates a new version. Runs reference the version they were triggered against, preserving historical accuracy.
- **Run state is DB-authoritative** — BullMQ jobs carry only a `runId`. All execution state is read from and written to PostgreSQL. This means the queue can be drained and re-populated without data loss.
- **Events are append-only** — `WorkflowRunEvent` records are never updated, only inserted. This gives a complete, immutable audit trail for every run.

---

## What We Did Not Build (Yet)

These are intentional deferrals, not oversights:

| Not Built | Why It's Deferred | Trigger to Build |
|-----------|-------------------|------------------|
| **Webhook/cron triggers** | Manual trigger suffices for initial validation | First customer use case requiring automation |
| **Temporal integration** | BullMQ handles current scale | Workflows exceeding 1-hour duration or requiring human-in-the-loop |
| **Live session revocation** | JWT expiration (7 days) is acceptable for early stage | SOC2 compliance requirement |
| **Rate-limit by tenant** | Global rate limit suffices at current scale | Multi-tenant traffic patterns diverging |
| **Horizontal worker scaling** | Single worker with concurrency 5 handles prototype load | Queue backlog consistently exceeding 100 jobs |
| **Unit/integration tests** | Deliberate — we validate via end-to-end manual testing of the golden path | Second paying customer |

---

*Built with Next.js 14, Prisma 6, BullMQ, PostgreSQL, and TypeScript. Deployed to: `opsflow.ai` (link placeholder).*
