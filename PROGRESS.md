# OpsFlow AI — Progress Report

> Last updated: 2026-05-15 (Phase 7 complete — Security Hardening)
> Project: Multi-tenant AI Workflow CRM

---

## Overall Status

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation (Auth + Org + RBAC + DB Schema) | ✅ Done | 100% |
| Phase 2: CRM Core (Leads detail, activity log, search/filter) | ✅ Done | 100% |
| Phase 3: Workflow Engine | ✅ Done | 100% |
| Phase 4: AI Layer | ✅ Done | 100% |
| Phase 5: Internal Ops | ✅ Done | 100% |
| Phase 6: Deployment | ✅ Done | 100% |
| Phase 7: Security Hardening | ✅ Done | 100% |

**Total source code:** ~7,000 lines across ~150 files
**API endpoints:** 31 total + SSE stream
**Infrastructure:** TanStack Query, SSE, Redis Rate Limiting, Feature Flags, Structured JSON Logging, Resend Email, BullMQ Queue
**Database tables:** 10 models + 1 enum
**Templates:** 3 sellable workflows (Lead Qualification, Cold Outreach, Trial Nurture)
**RBAC permissions:** 10 granular permissions across 4 roles

---

## Phase 1 — Foundation ✅

### What was built

| Module | Files | Status |
|--------|-------|--------|
| Auth (JWT + bcrypt + httpOnly cookie) | `lib/auth.ts`, `lib/session.ts`, `middleware.ts`, `api/auth/*` | Done |
| Login/Register pages | `(auth)/login/page.tsx`, `(auth)/register/page.tsx` | Done |
| Organization management | `api/orgs/route.ts`, `api/orgs/[slug]/route.ts` | Done |
| RBAC (4 roles, 10 permissions) | `lib/permissions.ts`, enforced in all API routes | Done |
| Dashboard shell | `(dashboard)/layout.tsx`, `nav/sidebar.tsx`, `nav/user-menu.tsx` | Done |
| API infrastructure | 10 API routes with session + permission checks | Done |
| UI components (6) | Button, Card, Badge, Input, Avatar, DropdownMenu | Done |
| Database schema | 10 models + 1 enum in Prisma 6 | Done |
| Worker | BullMQ Worker consuming queue from Upstash Redis | Done |

### Registration flow (updated Phase 7)
- `alice@example.com` → owner + new org `alice-workspace`
- All other emails → viewer in alice's existing org
- Registration generates verification link (10-min expiry); must click to complete
- Login issues JWT directly — no verification step needed at login

### Database models

User, Organization, Membership, Lead, LeadActivity, Workflow, WorkflowVersion, WorkflowNode, WorkflowEdge, WorkflowRun, WorkflowRunEvent + MembershipRole enum

---

## Phase 2 — CRM Core ✅

### What was built

| Module | Files | Status |
|--------|-------|--------|
| Lead list with search/filter/pagination | `leads/page.tsx`, `lead-table-client.tsx` | Done |
| Lead detail page | `leads/[id]/page.tsx` | Done |
| Stage changer | `leads/[id]/stage-selector.tsx` | Done |
| Note/comment system | `leads/[id]/note-form.tsx` | Done |
| Lead edit dialog | `leads/[id]/edit-dialog.tsx` | Done |
| Lead delete with confirmation | `leads/[id]/delete-button.tsx` | Done |
| Activity log (LeadActivity model) | `schema.prisma`, `api/.../activities/route.ts` | Done |
| Lead CRUD API (GET/PATCH/DELETE by id) | `api/.../leads/[id]/route.ts` | Done |
| Search/filter on list API | `api/.../leads/route.ts` (updated GET) | Done |
| Auto activity on create | `api/.../leads/route.ts` (updated POST) | Done |
| UI components (4 new) | Dialog, Select, Textarea, Table | Done |
| Session: added userName | `lib/auth.ts`, `lib/session.ts`, login/register routes | Done |

### Data flows created

- **Search:** Search input → 300ms debounce → `GET /leads?search=...` → ILIKE query → table update
- **Create lead:** Dialog → `POST /leads` → transaction (lead + activity) → refresh
- **Stage change:** Select dropdown → `PATCH /leads/[id]` → transaction (detect diff + activity) → refresh
- **Add note:** Textarea → `POST /leads/[id]/activities` → activity created → refresh
- **Edit:** Dialog → `PATCH /leads/[id]` → update allowed fields → refresh
- **Delete:** Confirm dialog → `DELETE /leads/[id]` → cascade delete → redirect to list

---

## Phase 3 — Workflow Engine ✅

### What was built

| Module | Files | Status |
|--------|-------|--------|
| Workflow Builder Canvas (React Flow) | `components/workflow/canvas.tsx` | Done |
| Custom node types (trigger/action/condition/delay) | `components/workflow/nodes/*-node.tsx` (4 files) | Done |
| Node palette (drag-to-add) | `components/workflow/node-palette.tsx` | Done |
| Node config panel (right sidebar) | `components/workflow/node-config-panel.tsx` | Done |
| Canvas toolbar (name, zoom, save) | `components/workflow/toolbar.tsx` | Done |
| Run history selector + status overlay | `components/workflow/run-selector.tsx` | Done |
| Builder page (server + client) | `workflows/[id]/builder/page.tsx`, `builder-client.tsx` | Done |
| Workflow list + create dialog | `workflows/page.tsx`, `create-button.tsx` | Done |
| Workflow detail + Run Now + Open Builder + Delete | `workflows/[id]/page.tsx`, `trigger-button.tsx`, `delete-button.tsx` | Done |
| Workflow API (list/create/detail/update/delete) | `api/.../workflows/route.ts`, `[id]/route.ts` | Done |
| Trigger API + Runs list API | `api/.../trigger/route.ts`, `.../runs/route.ts` | Done |
| Worker: DAG engine (topological sort + condition + delay + retry) | `apps/worker/src/index.ts` (rewritten) | Done |
| DB schema: WorkflowNode.label + WorkflowEdge.sourceHandle | `prisma/schema.prisma` (2 columns added) | Done |

### Architecture & data flows

```
1. Workflow Builder (design time)

   NodePalette (drag from left)
        │ drag & drop
        ▼
   Canvas (React Flow) ─── node click ───> NodeConfigPanel (right)
        │                                        │
        │ save (ctrl+S / button)                  │ apply config
        ▼                                        ▼
   BuilderClient.handleSave() ── PUT /api/.../workflows/[id] ──> DB (new WorkflowVersion + nodes + edges)

2. Trigger Run (runtime)

   TriggerButton "Run Now"
        │ POST /api/.../trigger
        ▼
   WorkflowRun created (status: queued)
        │ workflowQueue.add("execute", { runId })
        ▼
   BullMQ (Upstash Redis) ──> Worker picks up job

3. Worker Execution (BullMQ Worker, concurrency 5)

   Worker receives job ──> loads run + events from DB
        │
        ▼
   Topological sort (Kahn's algorithm)
        │
        ▼
   Condition evaluation ──> active node set (follows matching edges)
        │
        ▼
   For each active node (in DAG order):
     ├── already succeeded? → skip
     ├── delay node? → first time: create "delayed" event + queue.add({ delay })
     │                   delayed job fires → mark success + continue
     ├── execute node → success? → create event, continue
     │                  fail + retries left? → create failed event, retry in-process
     └── fail + no retries? → dead_letter status, stop
        │
        ▼
   All nodes done → status: completed

4. Execution Visualization

   RunSelector dropdown → select a run
        │
        ▼
   Map<nodeId, RunNodeStatus> passed to Canvas
        │
        ▼
   Canvas applies _runStatus to each node's data
        │
        ▼
   Custom nodes render status borders:
     success → green ring    running → blue pulsing    delayed → amber dashed
     failed  → red ring      pending → 50% opacity
```

---

## Phase 4 — AI Layer ✅

### What was built

| Module | Files | Status |
|--------|-------|--------|
| AI Infrastructure (DeepSeek client) | `lib/ai.ts`, `lib/prompts.ts` | Done |
| AI Node Suggestions | `api/.../ai/suggest-nodes/route.ts`, `ai-suggestions-panel.tsx` | Done |
| NL Workflow Generation | `api/.../ai/generate-workflow/route.ts`, `ai-workflow-generator.tsx` | Done |
| Lead Scoring | `api/.../ai/score-lead/route.ts`, `ai-insights-card.tsx` | Done |
| Anomaly Detection | `api/.../ai/analyze-run/route.ts`, `run-view.tsx` | Done |

### Key features

- **Zero architecture change** — all AI runs in existing API Routes via DeepSeek API
- **4 new API endpoints** — suggest-nodes, generate-workflow, score-lead, analyze-run
- **Builder AI panel** — left sidebar collapsible panel, "Add to Canvas" for each suggestion
- **NL → Workflow** — type description → full workflow graph loads on canvas
- **Lead scoring** — per-row "Score" button + detail page AI Insights card with retry/refresh
- **Anomaly analysis** — "Analyze with AI" button on failed runs, shows root cause + fix + error + retry

### AI component states (fixed Phase 7)

All AI components have proper: loading spinner, error message + retry, empty state, and success state.

---

## Phase 5 — Internal Ops ✅

### What was built

| Module | Files | Status |
|--------|-------|--------|
| Org Settings (name/slug editor) | `settings/page.tsx`, `settings-general.tsx` | Done |
| Members Management (CRUD + roles) | `settings/members/*`, `api/members/*` | Done |
| Org Switcher (multi-org navigation) | `sidebar-header.tsx`, `api/orgs/[slug]/switch` | Done |
| Global Runs Panel (filter + retry + cancel) | `runs/page.tsx`, `api/runs/*` | Done |
| Audit Log Viewer (paginated log viewer) | `audit-log/page.tsx`, `api/audit-log` | Done |
| Worker Visibility (health card on dashboard) | `worker-status-card.tsx`, `api/worker/health` | Done |
| Sidebar Navigation (3 new nav items) | `sidebar.tsx` (updated) | Done |

### Key features

- **Full admin suite** — org settings, member CRUD, role management, audit log — no DB access needed
- **Operations tooling** — global runs view with status filter, retry failed runs, cancel stuck runs
- **Org switching** — multi-org users switch orgs from sidebar, JWT re-signed on each switch
- **Worker monitoring** — real-time worker health on dashboard (last poll time, queue sizes)
- **Last-owner protection** — API prevents demoting/removing the last owner of an org
- **Sidebar expanded** — from 3 to 6 nav items (Dashboard, Leads, Workflows, Runs, Settings, Audit Log)

## Senior Signals Improvements

| Signal | Status | Implementation |
|--------|--------|---------------|
| Typed API Contracts | ✅ | `lib/api-types.ts` — all request/response interfaces |
| Cache Invalidation + Optimistic Updates | ✅ | TanStack Query (`@tanstack/react-query`) — `useQuery`/`useMutation` in leads + runs + audit log |
| Rate Limiting | ✅ | Upstash Redis sliding window (100 req/min per IP), in-memory fallback |
| Feature Flags | ✅ | `lib/feature-flags.ts` — env-based toggles for all AI features |
| Structured Logging | ✅ | `lib/logger.ts` — JSON logging with PII hashing |
| Advanced Table Sorting | ✅ | Clickable column headers on leads table (Name/Email/Stage/Created) |
| Empty/Error/Loading States | ✅ | All pages patched — explicit error UI with Retry buttons |
| Real-time Updates | ✅ | SSE endpoint + `useRealtimeRuns` hook with loading state |
| Multi-tenant Isolation | ✅ | All 31 API routes scope queries by `organizationId` |
| Async Job Queue (BullMQ) | ✅ | Upstash Redis + BullMQ Worker with 5x concurrency, delay node via re-queue |

---

## Phase 6 — Deployment 🔄

> Completed: 2026-05-14

### Deployment targets

| Component | Platform | Status |
|-----------|----------|--------|
| Web App (Next.js) | Vercel | ✅ Deployed & working |
| Worker (BullMQ) | Railway | 🔧 Deployed, BullMQ runtime error |
| Database (PostgreSQL) | Supabase | ✅ Already hosted |
| Redis | Upstash | ✅ Already hosted |

**Production URL:** `opsflow-ai-omega.vercel.app`

### Vercel deployment fixes (lessons learned)

| Fix | File | Reason |
|-----|------|--------|
| **`.npmrc` with `node-linker=hoisted`** | `.npmrc` | **KEY FIX**: pnpm virtual store deep paths prevented Vercel from tracing Prisma engine `.so.node` files |
| **`binaryTargets`** | `packages/db/prisma/schema.prisma` | `rhel-openssl-3.0.x` + `native` targets for Vercel + local |
| **`experimental.serverComponentsExternalPackages`** | `apps/web/next.config.js` | Next.js 14.2 correct key (NOT `serverExternalPackages`) |
| **Postinstall generate** | `package.json` | Prisma Client with workspace schema |
| **`vercel.json` build config** | `apps/web/vercel.json` | `prisma generate` → `next build` |
| **Split bcrypt from auth** | `lib/password.ts`, `lib/auth.ts` | bcryptjs (Node.js) separated from Edge JWT code |
| **Pass org slug as prop** | `worker-status-card.tsx`, `page.tsx` | Client components must receive orgSlug from server, NOT extract from URL |
| **Re-issue JWT on slug change** | `api/orgs/[slug]/route.ts` | Org PATCH updated DB slug but didn't re-sign JWT cookie |
| **Security headers** | `apps/web/next.config.js` | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| **Prisma config conflict** | `packages/db/prisma.config.ts` | **DELETED**: Prisma config file skips automatic .env loading |

---

## Phase 7 — Security Hardening ✅

> Completed: 2026-05-15

### 10 vulnerabilities fixed

| # | Vulnerability | Severity | Fix |
|---|-------------|----------|-----|
| 1 | JWT secret hardcoded fallback | HIGH | Removed `"dev-secret-change-in-production"`; throws if JWT_SECRET missing |
| 2 | No email verification | HIGH | Registration requires verification link click; token expires in 10 min |
| 3 | In-memory rate limiting | HIGH | Migrated to Upstash Redis sliding window via `@upstash/ratelimit` |
| 4 | Error detail leakage in login | MEDIUM | Removed `detail: error.message` from 500 responses |
| 5 | Missing security headers | MEDIUM | Added CSP, HSTS, X-Frame-Options, X-Content-Type-Options in next.config.js |
| 6 | PII in logs (plain email) | MEDIUM | Email SHA256 hashed before logging (`hashEmail()`) |
| 7 | Organization enumeration | MEDIUM | Generic error: "Registration is currently unavailable" |
| 8 | Weak password policy | LOW | Min password length 6 → 8 characters |
| 9 | Cookie secure flag conditional | LOW | `secure: true` always (not conditional on NODE_ENV) |
| 10 | No RLS in PostgreSQL | LOW | Documented; app-layer isolation is consistent across all 31 routes |

### Files changed
- `lib/auth.ts` — JWT secret enforcement
- `lib/permissions.ts` — 10 permissions including delete_workflows, delete_leads, view_members, view_audit_log
- `lib/rate-limit.ts` — New: Upstash Redis rate limiter
- `middleware.ts` — Redis rate limiting, verify endpoint whitelist
- `next.config.js` — Security headers (CSP/HSTS/XFO/etc)
- `api/auth/login/route.ts` — Direct JWT after password, PII hashing
- `api/auth/register/route.ts` — Verification link, password min 8, generic errors
- `api/auth/verify/route.ts` — New: token verification, JWT issuance, emailVerified=true
- `(auth)/login/page.tsx` — Direct login (no verification UI)
- `(auth)/register/page.tsx` — Verification link display after registration
- `prisma/schema.prisma` — User model: +emailVerified, +loginToken, +loginTokenExpires
- `packages/db/seed-verify-alice.ts` — New: pre-verify alice

---

## Database Connection

- **Host:** Supabase PostgreSQL (us-east-1, project `pynprilsdbvgxyyzjtif`)
- **Pooler:** V2 (`aws-1-us-east-1.pooler.supabase.com:6543`) — Transaction mode for Vercel
- **Direct:** `db.pynprilsdbvgxyyzjtif.supabase.co:5432` — Direct connection for local/migrations
- **Schema:** `opsflow`
- **ORM:** Prisma 6 (v6.19.3)
- **Migration date:** 2026-05-15 (from Sydney `kksalzksdviqelhcqalg` to US East `pynprilsdbvgxyyzjtif`)

### Supabase pooler gotcha

New projects use **V2 pooler** (`aws-1-{region}`), not V1 (`aws-0-{region}`). Using the wrong pooler causes `FATAL: Tenant or user not found`. Always copy the full URI from Supabase Dashboard → Connection string → Transaction mode.

### Useful commands

```bash
pnpm dev                           # Start all apps (web + worker)
pnpm seed                          # Reset and seed demo data
pnpm seed-prod <org-slug>          # Non-destructive: 3 templates + 5 leads
pnpm seed-verify-alice             # Mark alice@example.com as email-verified
pnpm clean-org <org-slug>          # Delete all workflows + leads in org
pnpm --filter @opsflow/db push     # Push schema to DB
pnpm --filter @opsflow/db generate # Regenerate Prisma client
pnpm build                         # Build all packages
```

---

## Architecture Summary

```
apps/web (Next.js 14 App Router)
  ├── Pages: Server Components for data, Client Components for interaction
  ├── API: 31 Route Handlers with session + permission checks
  ├── Middleware: JWT guard + Redis rate limiting (100 req/min per IP)
  ├── Security: CSP/HSTS, PII-safe logging, email verification, 8-char passwords
  └── Components: shadcn-style UI kit (10 components)

apps/worker (Node.js)
  └── BullMQ Worker consuming workflow-runs queue from Upstash Redis

packages/db (Prisma 6 + PostgreSQL)
  ├── PrismaClient singleton (globalThis cache)
  ├── 10 models in opsflow schema
  └── Seed scripts: production (idempotent), clean-org, verify-alice
```

### Tech stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, TypeScript
- **Backend:** Next.js Route Handlers, Prisma 6, PostgreSQL (Supabase)
- **Auth:** Custom JWT (jose) + bcryptjs + httpOnly cookies + email verification
- **Rate Limiting:** Upstash Redis sliding window (@upstash/ratelimit)
- **Monorepo:** pnpm workspaces + Turborepo
- **Queue:** BullMQ + Upstash Redis
- **Email:** Resend SDK (template variables, real send)
- **AI:** DeepSeek API (4 endpoints, feature-flagged)

---

## Known Issues / TODOs

1. **No tests** — zero test files across the entire project.
2. **Webhook/cron triggers** not implemented — only manual "Run Now" trigger available.
3. **BullMQ runtime error on Railway** — Worker deploys but throws `client[commandNameWithVersion] is not a function`. Root cause under investigation.
4. **`packages/core` and `packages/ui`** are empty shells for future work.
5. **Resend not configured** — verification emails can't be sent; verification link is displayed on screen for now.
6. **RLS not enabled** — multi-tenant isolation relies entirely on app-layer query scoping.
7. **GitHub push** — Works via GitHub Desktop (GFW blocks CLI `git push`).
