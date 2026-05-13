# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (starts all apps/packages)
pnpm dev

# Build all packages
pnpm build

# Lint
pnpm lint

# Run a specific app
pnpm --filter @opsflow/web dev
pnpm --filter @opsflow/worker dev

# Database
pnpm seed                          # Seed demo data
pnpm --filter @opsflow/db prisma generate
pnpm --filter @opsflow/db prisma db push

# Add dependencies
pnpm --filter @opsflow/web add <pkg>
```

## Architecture

**OpsFlow AI** is a pnpm + Turborepo monorepo for an AI-powered workflow automation platform with lead management.

### Monorepo layout

```
apps/
  web/         — Next.js 14 app (App Router, RSC, React 18)
  worker/      — BullMQ background worker polling for queued workflow runs
packages/
  db/          — Prisma 6 schema + client (PostgreSQL, `opsflow` schema)
  core/        — (empty, not yet implemented)
  ui/          — (empty, not yet implemented)
```

### Data model

Multi-tenant via Organization → Membership → User. The core domain:
- **Workflow** — versioned (WorkflowVersion), directed graph of WorkflowNode + WorkflowEdge
- **WorkflowNode** — typed nodes (trigger, action, etc.) with JSON config + canvas position
- **WorkflowRun** — tracks execution per version; status lifecycle: queued → running → completed
- **WorkflowRunEvent** — per-node execution events within a run
- **Lead** — CRM-style leads scoped to an organization

### Key patterns

- **Web frontend**: Server Components for data fetching, client components for real-time polling (3s interval on workflow runs), tanstack/react-query for data fetching hooks, zustand for client state
- **Worker**: Polling loop every 5s for queued runs; executes nodes sequentially creating events; to be replaced by proper BullMQ worker consumption
- **API layer**: fetch-based (axios + custom fetcher in lib/api.ts); API route handlers not yet implemented
- **DB**: All models in `opsflow` PostgreSQL schema; Prisma client auto-generated; workspace-linked via `@opsflow/db`

### State of the project

This is an early-stage project. `packages/core`, `packages/ui`, `infrastructure/`, and `docs/` are empty. API routes are not yet implemented (the web app references `/api/*` endpoints directly). The worker currently polls instead of consuming BullMQ queues properly.
