# OpsFlow AI

### Multi-tenant workflow automation CRM for SMB sales and operations teams.

Teams can: automate lead follow-ups · trigger AI-powered workflows · send automated emails · manage async job queues · monitor execution in real-time.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-6-indigo?logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/BullMQ-v5-red?logo=redis" alt="BullMQ">
  <img src="https://img.shields.io/badge/Resend-Email-7B68EE" alt="Resend">
  <img src="https://img.shields.io/badge/DeepSeek-AI-7B68EE" alt="DeepSeek AI">
  <img src="https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel" alt="Vercel">
  <img src="https://img.shields.io/badge/Railway-Worker-0B0D0E?logo=railway" alt="Railway">
</p>

---

## System Architecture

```
                              ┌──────────────────────┐
                              │     End User Browser  │
                              │  React 18 · SSE ·     │
                              │  TanStack Query ·     │
                              │  React Flow Builder   │
                              └──────────┬───────────┘
                                         │ HTTPS
                              ┌──────────▼───────────┐
                              │    Vercel (Edge)      │
                              │                        │
                              │  ┌──────────────────┐  │
                              │  │ Next.js 14        │  │
                              │  │ App Router        │  │
                              │  │ 30+ API Routes    │  │
                              │  │ Middleware (JWT)  │  │
                              │  │ SSE Streaming     │  │
                              │  └────────┬─────────┘  │
                              └───────────┼────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
          ┌─────────▼──────┐  ┌──────────▼──────┐  ┌──────────▼──────┐
          │  Supabase       │  │  Upstash Redis   │  │  DeepSeek API    │
          │  PostgreSQL 16  │  │  (BullMQ Queue)  │  │  (AI Inference)  │
          │                 │  │                  │  │                  │
          │  • 10 models    │  │  • workflow-runs │  │  • suggest-nodes │
          │  • opsflow      │  │  • concurrency 5 │  │  • score-lead    │
          │    schema       │  │  • native delay  │  │  • analyze-run   │
          │  • pooled conn  │  │  • job retry     │  │  • generate-wf   │
          └─────────────────┘  └────────┬─────────┘  └──────────────────┘
                                        │
                              ┌─────────▼──────────┐
                              │   Railway (Worker)  │
                              │                     │
                              │  ┌───────────────┐  │
                              │  │ BullMQ Worker  │  │
                              │  │                │  │
                              │  │ • DAG Execution│  │
                              │  │ • Condition    │  │
                              │  │   Branching    │  │
                              │  │ • Delay Nodes  │  │
                              │  │ • Retry Logic  │  │
                              │  │ • Real Email   │──┼───► Resend API
                              │  │   via Resend   │  │    (Email Delivery)
                              │  └───────────────┘  │
                              └─────────────────────┘
```

| Component | Platform | Role |
|-----------|----------|------|
| Web App | Vercel | Next.js 14 · Server Components · API Routes · SSE |
| Worker | Railway | BullMQ consumer · DAG engine · Email sender |
| Database | Supabase | PostgreSQL 16 · 10 models · `opsflow` schema |
| Queue | Upstash Redis | Job persistence · delay scheduling · concurrency |
| Email | Resend | Template variables · real delivery · 100/day free |
| AI | DeepSeek | Lead scoring · workflow generation · anomaly detection |

---

## What It Does

**CRM + Workflow Automation in one platform.** Not two glued-together products — a single system where leads flow through automated workflows.

### CRM
- Lead pipeline with stages: new → qualified → proposal → negotiation → closed-won / closed-lost
- Full-text search, stage filter, pagination, column sorting
- Activity log per lead (notes, stage changes, assignments)
- AI lead scoring — one click, instant hot/warm/cold label

### Workflow Builder
- Visual drag-and-drop canvas (React Flow)
- 4 node types: **Trigger** · **Action** · **Condition** · **Delay**
- AI generates workflows from natural language descriptions
- AI suggests next nodes as you build
- Every save creates an immutable version (audit trail)

### Execution Engine
- DAG execution with topological sort (Kahn's algorithm)
- Condition branching with dot-notation field resolution (`lead.email`, `user.name`)
- Delay nodes via BullMQ native scheduling (no polling, no clock drift)
- Per-node retry with linear backoff → dead-letter queue on exhaustion
- SSE streaming — watch runs execute in real-time, node by node

### Email Automation
- **Real email delivery via Resend**
- Template variables: `{{lead.email}}`, `{{user.name}}`, `{{sales_email}}`
- Used in all 3 production workflow templates

### Multi-Tenant SaaS
- Organization isolation at query level
- 4 roles × 7 permissions (owner / admin / operator / viewer)
- Custom JWT with httpOnly cookies + middleware guard
- Org switcher for multi-org users
- Full audit log — every mutation tracked

---

## 3 Sellable Workflow Templates

These ship with the product. Customers deploy them in minutes.

### 1. Lead Qualification
`New lead → AI score → hot → notify sales / cold → nurture`

Sell to: **sales teams** who need automated lead triage.

### 2. Cold Outreach Follow-up
`Initial email → wait 2 days → no reply? → follow-up → wait 3 days → close lead`

Sell to: **SDR teams** running email outreach campaigns.

### 3. Trial User Nurture
`Signup → onboarding email → wait 3 days → usage reminder → wait 4 days → sales alert`

Sell to: **SaaS companies** converting trial users to paid.

---

## For Recruiters & Clients

This project demonstrates production-grade SaaS engineering:

- **Full-stack delivery** — 30+ API routes, 135 files, 6,400+ lines of TypeScript
- **Queue-based architecture** — BullMQ with retry, delay, dead-letter queue
- **Real-time streaming** — SSE push from worker to browser, not polling
- **Multi-tenant from day one** — org isolation, RBAC, audit log, rate limiting
- **Real integrations** — Resend email, DeepSeek AI, Supabase, Upstash
- **Deployed** — Vercel + Railway, not localhost
- **Product thinking** — 3 sellable templates, not just builder features

---

## Local Development

```bash
pnpm install
pnpm dev                # start web + worker
pnpm seed               # fresh demo data (destructive)
pnpm seed-prod <slug>   # safe seed into existing org
pnpm seed-members <slug> # add test users for RBAC testing
pnpm build              # build all packages
```

### Environment Variables

```bash
# Web (Vercel)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=your-secret
REDIS_URL=redis://...
DEEPSEEK_API_KEY=sk-...

# Worker (Railway) — all of the above plus:
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=OpsFlow <noreply@yourdomain.com>
PORT=8080
```

### Deploy

```bash
npx vercel --prod --cwd apps/web     # web app
# Worker auto-deploys on git push to main (Railway)
```

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 (Supabase, pooled) |
| ORM | Prisma 6 (multi-schema) |
| Queue | BullMQ v5 + Upstash Redis |
| Email | Resend SDK |
| AI | DeepSeek API |
| Auth | Custom JWT (jose) + bcryptjs + httpOnly cookies |
| State | TanStack Query + Zustand |
| Real-time | SSE (EventSource API) |
| Canvas | React Flow (@xyflow/react) |
| UI | Tailwind CSS + shadcn-style components |
| Toast | Sonner |
| Monorepo | pnpm workspaces + Turborepo |
| Hosting | Vercel (web) + Railway (worker) |

---

*Built with Next.js 14, Prisma 6, BullMQ, PostgreSQL, TypeScript, and Tailwind CSS. ~6,400 lines across ~135 files.*
