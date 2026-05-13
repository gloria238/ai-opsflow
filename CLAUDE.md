# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (starts all apps/packages)
pnpm dev

# Build all packages
pnpm build

# Run a specific app
pnpm --filter @opsflow/web dev
pnpm --filter @opsflow/worker dev

# Database
pnpm seed                          # Seed demo data
pnpm --filter @opsflow/db generate # Regenerate Prisma client
pnpm --filter @opsflow/db push     # Push schema to DB
pnpm --filter @opsflow/db prisma studio  # Open Prisma Studio

# Add dependencies
pnpm --filter @opsflow/web add <pkg>

# Deploy (no Git push — GFW blocked)
npx vercel --cwd apps/web          # Deploy web app to Vercel
npx vercel --prod --cwd apps/web   # Deploy to production
```

## Architecture

**OpsFlow AI** is a pnpm + Turborepo monorepo for an AI-powered workflow automation platform with lead management and CRM features.

### Monorepo layout

```
apps/
  web/         — Next.js 14 app (App Router, RSC, React 18), ~30 API routes
  worker/      — BullMQ Worker consuming queue from Upstash Redis (concurrency 5)
packages/
  db/          — Prisma 6 schema + client (PostgreSQL, `opsflow` schema, 10 models)
  core/        — (empty)
  ui/          — (empty)
```

### Data model (10 models in `opsflow` PostgreSQL schema)

- **User / Organization / Membership** — Multi-tenant with 4 roles (owner, admin, operator, viewer) + 7 permissions
- **Workflow** — Versioned (WorkflowVersion), directed graph of WorkflowNode + WorkflowEdge
- **WorkflowNode** — Typed: trigger, action, condition, delay — with JSON config + canvas position
- **WorkflowRun** — Status lifecycle: queued → running → completed/failed/dead_letter
- **WorkflowRunEvent** — Per-node execution events within a run
- **Lead / LeadActivity** — CRM leads with stage tracking, activity log
- **AuditLog** — Immutable audit trail for org-level actions

### Key patterns

- **Web**: Server Components for data fetching, client components for interactivity. TanStack Query for data hooks, zustand for canvas state, SSE for real-time run streaming.
- **Auth**: Custom JWT (jose) + httpOnly cookies. Middleware validates session on all non-public routes. `lib/session.ts` extracts session server-side.
- **API layer**: 30+ Route Handlers with session + RBAC permission checks. JSON logging on auth/AI routes.
- **Worker**: BullMQ Worker consuming `workflow-runs` queue. DAG execution via Kahn's topological sort. Condition branching, delay nodes (BullMQ delay), retry with backoff.
- **AI**: DeepSeek API client. 4 AI endpoints: suggest-nodes, generate-workflow, score-lead, analyze-run. Feature flags via `lib/feature-flags.ts`.
- **DB**: PrismaClient singleton cached on `globalThis`. `serverExternalPackages: ["@prisma/client"]` in next.config for Vercel.

### Key files

```
apps/web/lib/auth.ts              — JWT sign/verify (jose), Edge-compatible
apps/web/lib/password.ts          — bcrypt hash/verify, Node.js only (not Edge)
apps/web/lib/session.ts           — Server-side session from JWT cookie
apps/web/lib/permissions.ts       — RBAC roles + permission matrix
apps/web/lib/ai.ts                — DeepSeek API client
apps/web/lib/feature-flags.ts     — Env-based feature toggles
apps/web/lib/logger.ts            — Structured JSON logging
apps/web/middleware.ts            — JWT guard + rate limiting (100 req/min per IP)
apps/web/next.config.js           — transpilePackages: [worker], serverExternalPackages: [@prisma/client]
apps/web/vercel.json              — Vercel build config (prisma generate → next build)
apps/worker/src/queue.ts          — Lazy Redis connection + BullMQ Queue (Proxy pattern)
apps/worker/src/index.ts          — Worker: DAG execution, retry, condition eval, delay
packages/db/prisma/schema.prisma  — All 10 models with @opsflow schema
packages/db/index.ts              — PrismaClient singleton export
packages/db/prisma.config.ts      — Prisma 6 config (schema path)
```

### State of the project (2026-05-13)

- **All 5 phases complete**: Auth/Org/RBAC, CRM Core, Workflow Engine, AI Layer, Internal Ops
- **Phase 6 (Deployment) in progress**: Web app deployed on Vercel with remaining bugs
- **~6,100 lines** across 119 files. 30 API routes + SSE streaming endpoint.
- Worker not yet deployed to Railway. GitHub push blocked by GFW — deploy via `npx vercel`.
- No tests yet (zero test files).

### Vercel deployment gotchas (lessons learned)

1. **Prisma engine binary**: Set `experimental.serverComponentsExternalPackages: ["@prisma/client"]` in next.config so Next.js treats Prisma as external. Also add `binaryTargets = ["rhel-openssl-3.0.x"]` in schema.prisma + `outputFileTracingIncludes` to trace `.so.node` files from pnpm virtual store.
2. **Prisma generate before build**: `vercel.json` buildCommand = `prisma generate && next build`
3. **No dotenv**: Vercel provides env vars natively. Don't use dotenv in next.config.js.
4. **Workspace imports**: Dynamic `import()` for packages that need env vars not set on Vercel (worker/queue needs REDIS_URL)
5. **Edge vs Node**: Middleware runs Edge Runtime — don't import bcryptjs there. Split password functions into separate file.
6. **Postinstall**: Root `postinstall` runs `prisma generate`. The `@prisma/client` postinstall warning about "schema not found" is harmless.
