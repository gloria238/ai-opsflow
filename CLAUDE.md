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
- **Email**: Resend SDK. `apps/worker/src/email.ts` — template variable resolution (`{{lead.email}}`) + send. Worker `executeNode` calls real email when action is `send_email`.
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
apps/worker/src/queue.ts          — Direct Redis connection + BullMQ Queue
apps/worker/src/email.ts          — Resend email sender + {{variable}} template resolver
apps/worker/src/index.ts          — Worker: DAG execution, real email, retry, condition eval, delay, HTTP healthcheck
packages/db/prisma/schema.prisma  — All 10 models with @opsflow schema
packages/db/index.ts              — PrismaClient singleton export
packages/db/seed-production.ts    — 3 sellable workflow templates + 5 demo leads
```

### State of the project (2026-05-14)

- **All 6 phases complete + Email + Templates**: Auth/Org/RBAC, CRM Core, Workflow Engine, AI Layer, Internal Ops, Deployment
- **~6,500 lines** across ~140 files. 30 API routes + SSE streaming + 10 loading.tsx skeletons + 3 sellable templates.
- Web app: ✅ Vercel (login, dashboard, workflows, leads, runs, settings, members, audit log all functional).
- Worker: ✅ Railway (BullMQ consuming queue, DAG execution, real email via Resend, healthcheck HTTP server).
- Email: ✅ Resend SDK — `send_email` action sends real emails with `{{variable}}` template resolution.
- Templates: 3 production workflows (Lead Qualification, Cold Outreach Follow-up, Trial User Nurture).
- AI: 4 endpoints (suggest-nodes, generate-workflow, score-lead, analyze-run) via DeepSeek API.
- UX: sonner toast notifications on all actions, loading skeletons on all pages, button loading states persist through navigation.
- GitHub push via Desktop works. `npx vercel --prod --cwd apps/web` for manual Vercel deploy.
- No tests yet (zero test files).
- `lib/audit.ts` — Fixed `AuditLogCreateInput` → `AuditLogUncheckedCreateInput`. Audit log added to 10 mutation endpoints.
- `.npmrc` with `node-linker=hoisted` — Required for Vercel deployment.
- `@railway/cli` removed — postinstall GitHub download blocked by GFW on Railway builds.
- Seed scripts: `pnpm seed` (fresh), `pnpm seed-prod <slug>` (safe, 3 templates + leads), `pnpm seed-members <slug>` (RBAC test accounts).
- Seed scripts: `pnpm seed` (fresh, destructive), `pnpm seed-prod <slug>` (non-destructive), `pnpm seed-members <slug>` (test accounts).

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
10. **Toast notifications via sonner**: `Toaster` is in root layout. Use `toast.success()` / `toast.error()` from `sonner` for user feedback. Never use `alert()`. On navigation after success, keep button `loading=true` — `router.push()` will unmount the component, so no need to reset loading state.

### Railway deployment (worker)

Worker is a standalone Node.js process (BullMQ consumer) that executes workflow runs from Upstash Redis queue. Without it, workflow runs stay in `queued` status forever.

**Config**: `railway.toml` at project root — `nixpacks` builder. Root `package.json` has `"start"` script for nixpacks auto-detection.

**Build command**: `pnpm install --frozen-lockfile && pnpm --filter @opsflow/db generate`  
**Start command**: `npx tsx apps/worker/src/index.ts` (from root)

**Env vars needed**: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`

**GitHub-linked deployment**: Push to `main` triggers auto-deploy. Railway dashboard can override start command — must ensure it matches railway.toml.

**Current blocker**: BullMQ Worker throws `client[commandNameWithVersion] is not a function` — ioredis/BullMQ internal method resolution issue. Worker HTTP healthcheck passes, but job processing fails. Root cause under investigation.

**Removed**: `@railway/cli` from devDependencies — its postinstall downloads from GitHub, which is blocked by GFW on Railway's build environment.
