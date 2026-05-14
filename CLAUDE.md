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
- **DB**: PrismaClient singleton cached on `globalThis`. `experimental.serverComponentsExternalPackages: ["@prisma/client"]` in next.config for Vercel.

### Key files

```
apps/web/lib/auth.ts              — JWT sign/verify (jose), Edge-compatible
apps/web/lib/password.ts          — bcrypt hash/verify, Node.js only (not Edge)
apps/web/lib/session.ts           — Server-side session from JWT cookie
apps/web/lib/audit.ts              — Audit log write helper (used in all mutation endpoints)
apps/web/lib/permissions.ts       — RBAC roles + permission matrix
apps/web/lib/ai.ts                — DeepSeek API client
apps/web/lib/feature-flags.ts     — Env-based feature toggles
apps/web/lib/logger.ts            — Structured JSON logging
apps/web/middleware.ts            — JWT guard + rate limiting (100 req/min per IP)
apps/web/next.config.js           — transpilePackages: [worker], experimental.serverComponentsExternalPackages: [@prisma/client]
apps/web/vercel.json              — Vercel build config (prisma generate → next build)
apps/worker/src/queue.ts          — Direct Redis connection + BullMQ Queue (no Proxy — caused BullMQ method resolution issues)
apps/worker/src/index.ts          — Worker: DAG execution, retry, condition eval, delay, HTTP healthcheck server
packages/db/prisma/schema.prisma  — All 10 models with @opsflow schema
packages/db/index.ts              — PrismaClient singleton export
packages/db/prisma.config.ts      — Prisma 6 config (schema path)
```

### State of the project (2026-05-14)

- **All 5 phases complete**: Auth/Org/RBAC, CRM Core, Workflow Engine, AI Layer, Internal Ops
- **Phase 6 (Deployment) in progress (85%)**: Web app deployed on Vercel (worker health panel working). Worker deployed on Railway but BullMQ connection issue.
- **~6,300 lines** across ~125 files. 30 API routes + SSE streaming endpoint.
- Web app: ✅ Vercel (login works, pages functional, worker health API uses DB queries, dashboard panel fixed).
- Worker: 🔧 Railway (deploys, healthcheck passes, but BullMQ throws `client[commandNameWithVersion]` error at runtime).
- GitHub push via Desktop works. `npx vercel --prod --cwd apps/web` for manual Vercel deploy.
- No tests yet (zero test files).
- `lib/audit.ts` — Fixed `AuditLogCreateInput` → `AuditLogUncheckedCreateInput`. Audit log added to 10 mutation endpoints.
- `.npmrc` with `node-linker=hoisted` — Required for Vercel deployment.
- `@railway/cli` removed — postinstall GitHub download blocked by GFW on Railway builds.

### Vercel deployment gotchas (lessons learned)

1. **Prisma engine binary**: Three changes needed: (a) Add `binaryTargets = ["native", "rhel-openssl-3.0.x"]` to schema.prisma generator. (b) Set `experimental.serverComponentsExternalPackages: ["@prisma/client"]` in next.config.js (NOT top-level `serverExternalPackages` — Next.js 14.2 only supports it under `experimental`). (c) Add `.npmrc` with `node-linker=hoisted` — pnpm virtual store deep paths prevent Vercel's file tracer from finding `.so.node` files.
2. **Prisma generate before build**: `vercel.json` buildCommand = `pnpm --filter @opsflow/db generate && pnpm --filter @opsflow/web build`
3. **No dotenv**: Vercel provides env vars natively. Don't use dotenv in next.config.js.
4. **Workspace imports**: Dynamic `import()` for packages that need env vars not set on Vercel (worker/queue needs REDIS_URL)
5. **Edge vs Node**: Middleware runs Edge Runtime — don't import bcryptjs there. Split password functions into separate file.
6. **Postinstall**: Root `postinstall` runs `prisma generate`. The `@prisma/client` postinstall warning about "schema not found" is harmless.
7. **pnpm hoisted mode**: `.npmrc` with `node-linker=hoisted` is required for Vercel. It flattens node_modules so the Prisma engine binary at `node_modules/.prisma/client/` is traced properly. Without it, the engine is buried in `node_modules/.pnpm/@prisma+client@.../node_modules/.prisma/client/` and Vercel can't find it.
8. **Client components need org slug from server**: Don't extract org slug from `window.location.pathname` in client components — the root dashboard path `/` yields `undefined`. Always pass `orgSlug` as a prop from the server component which has it from the session/JWT. Otherwise the fallback "demo-org" won't match production orgs (which are generated as `{email-prefix}-workspace` during registration).
9. **Re-issue JWT on slug change**: When updating the org slug via PATCH, the JWT cookie MUST be re-signed with the new `orgSlug`. Otherwise the session carries the old slug and every subsequent API call (members, workflows, leads, etc.) returns 404 because the membership lookup uses the stale slug.

### Railway deployment (worker)

Worker is a standalone Node.js process (BullMQ consumer) that executes workflow runs from Upstash Redis queue. Without it, workflow runs stay in `queued` status forever.

**Config**: `railway.toml` at project root — `nixpacks` builder. Root `package.json` has `"start"` script for nixpacks auto-detection.

**Build command**: `pnpm install --frozen-lockfile && pnpm --filter @opsflow/db generate`  
**Start command**: `npx tsx apps/worker/src/index.ts` (from root)

**Env vars needed**: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`

**GitHub-linked deployment**: Push to `main` triggers auto-deploy. Railway dashboard can override start command — must ensure it matches railway.toml.

**Current blocker**: BullMQ Worker throws `client[commandNameWithVersion] is not a function` — ioredis/BullMQ internal method resolution issue. Worker HTTP healthcheck passes, but job processing fails. Root cause under investigation.

**Removed**: `@railway/cli` from devDependencies — its postinstall downloads from GitHub, which is blocked by GFW on Railway's build environment.
