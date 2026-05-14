# OpsFlow AI

> A production SaaS — multi-tenant AI workflow automation platform with built-in CRM.
> Deployed on Vercel + Railway + Supabase + Upstash Redis.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-6-indigo?logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/BullMQ-v5-red?logo=redis" alt="BullMQ">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/Turborepo-FF6B35?logo=turborepo" alt="Turborepo">
  <img src="https://img.shields.io/badge/DeepSeek-AI-7B68EE" alt="DeepSeek AI">
</p>

---

## What It Does

A SaaS platform where teams manage leads and automate their workflow. Users drag-and-drop to build automation flows, trigger them manually or via API, and watch execution happen in real-time via SSE streaming. AI assists with lead scoring, workflow generation, and anomaly detection.

**Core use case**: a 5-50 person sales team that needs CRM + email automation in one tool, without paying HubSpot prices.

---

## Feature Overview

### CRM
- Lead pipeline with Kanban stages (new → qualified → proposal → negotiation → closed)
- Full-text search, stage filtering, pagination, column sorting
- Activity log per lead (notes, stage changes, assignments)
- AI lead scoring — click a button, DeepSeek scores each lead as hot/warm/cold

### Workflow Builder
- React Flow canvas — drag nodes from palette, connect edges, configure in sidebar
- 4 node types: Trigger, Action, Condition, Delay
- Natural language → full workflow graph (AI generation)
- Context-aware node suggestions (AI copilot)
- Versioned — every save creates an immutable WorkflowVersion

### Execution Engine
- DAG execution with Kahn's topological sort
- Condition branching with dot-notation field resolution
- Delay nodes via BullMQ native delay (no polling)
- Per-node retry with exponential backoff, dead-letter queue on exhaustion
- SSE real-time streaming of run status to browser
- AI anomaly analysis on failed runs

### Multi-Tenant SaaS
- Organization isolation at the query level (every route scoped by `organizationId`)
- 4 roles × 7 permissions (owner, admin, operator, viewer)
- Custom JWT with httpOnly cookies + middleware guard
- Org switcher for multi-org users
- Full audit log — every mutation tracked with actor, target, and metadata
- Rate limiting: 100 req/min per IP, sliding window

### Operations
- Global runs dashboard — filter by status, retry failed, cancel stuck
- Worker health monitoring — real-time status on dashboard
- Member management — invite, role change, remove (with last-owner protection)

---

## Architecture

```
apps/web (Next.js 14, 30+ API routes)
  ├── Server Components for data fetching
  ├── Client Components for interactivity (TanStack Query, Zustand, SSE)
  └── Middleware: JWT guard + RBAC + rate limiting

apps/worker (Node.js + BullMQ)
  └── Consumes "workflow-runs" queue, executes DAG, writes events to DB

packages/db (Prisma 6 + PostgreSQL)
  └── 10 models in opsflow schema, PrismaClient singleton
```

### Data Flow: Trigger → Execution → UI Update

```
User clicks "Run Now"
  → API creates WorkflowRun (status: queued)
  → queue.add("execute", { runId })
  → Worker picks up job
  → DAG executes (topo sort → condition eval → node execution → retry)
  → Events written to DB
  → SSE pushes updated run state to browser
  → UI shows green/red/blue status on each node
```

### Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 App Router | RSC + SSR + API routes co-located |
| Database | PostgreSQL (Supabase) | Managed, pooled, multi-schema |
| ORM | Prisma 6 | Type-safe, migrations, multi-schema |
| Queue | BullMQ + Upstash Redis | Delay, retry, concurrency, no sidecar |
| Auth | Custom JWT (jose) + bcryptjs | Zero external dependencies, httpOnly cookies |
| AI | DeepSeek API | 4 endpoints: suggest, generate, score, analyze |
| UI | Tailwind CSS + shadcn-style components | Utility-first, component primitives |
| State | TanStack Query + Zustand | Server cache + client state |
| Real-time | SSE (EventSource) | Built-in reconnect, HTTP-native |
| Monorepo | pnpm + Turborepo | Shared DB client, parallel build |
| Deploy | Vercel (web) + Railway (worker) | No Docker, no K8s |

### Multi-Tenant Isolation Pattern

Every API route follows the same 3-step pattern:

```typescript
// 1. Resolve membership (fails if user doesn't belong to org)
const membership = await prisma.membership.findFirst({
  where: { userId: session.userId, organization: { slug: params.slug } },
});
if (!membership) return 404;

// 2. Check permission
requirePermission(membership.role, "manage_workflows");

// 3. Scope query
const data = await prisma.workflow.findMany({
  where: { organizationId: membership.organizationId },
});
```

---

## Database Schema

```
Organization
  ├── Membership → User (many-to-many, 4 roles)
  ├── Workflow → WorkflowVersion (immutable snapshots)
  │     ├── WorkflowNode (typed + JSON config, canvas position)
  │     └── WorkflowEdge (DAG connections, condition handles)
  ├── WorkflowRun (status: queued→running→completed/failed/dead_letter)
  │     └── WorkflowRunEvent (per-node execution log, append-only)
  ├── Lead (CRM, stage tracking)
  │     └── LeadActivity (change log)
  └── AuditLog (org-wide immutable trail)
```

10 models, 1 enum, `opsflow` PostgreSQL schema. ~6,300 lines across ~125 files.

---

## Why This Project Matters (For Hiring)

If you're evaluating me as a candidate, this project demonstrates:

- **SaaS from scratch** — multi-tenant, auth, RBAC, billing-ready architecture
- **Production deployment** — Vercel + Railway + Supabase, not just localhost
- **Queue-based architecture** — BullMQ job processing with retry and delay
- **Real-time updates** — SSE streaming, not polling
- **AI integration** — 4 AI endpoints with feature flags and structured logging
- **Monorepo engineering** — pnpm workspaces, Turborepo, shared packages
- **6,300 lines delivered** — not a tutorial project, a real working app

---

## Local Development

```bash
# Install
pnpm install

# Start everything
pnpm dev

# Seed demo data
pnpm seed

# Seed test members (for permission testing)
pnpm seed-members <org-slug>

# Deploy web
npx vercel --prod --cwd apps/web
```

---

## Project Status

| Phase | Status |
|-------|--------|
| Auth + Org + RBAC | Done |
| CRM Core | Done |
| Workflow Engine | Done |
| AI Layer | Done |
| Internal Ops | Done |
| Deployment | Deployed |

**Next**: webhook/cron triggers, email integration, workflow template marketplace.

---

*Built with Next.js 14, Prisma 6, BullMQ, PostgreSQL, TypeScript, and Tailwind CSS.*
