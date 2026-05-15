<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/BullMQ-Async%20Queue-DC2626" />
  <img src="https://img.shields.io/badge/Redis-Background%20Jobs-red?logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Resend-Email%20Automation-7C3AED" />
  <img src="https://img.shields.io/badge/OpenAI-AI%20Workflows-10A37F?logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-Web%20Deploy-black?logo=vercel" />
  <img src="https://img.shields.io/badge/Railway-Worker%20Runtime-0B0D0E?logo=railway" />
</p>

<h1 align="center">
  OpsFlow AI
</h1>

<p align="center">
  Multi-tenant AI Workflow CRM for async automation, lead operations, and workflow orchestration.
</p>

---

# Overview

OpsFlow AI is a production-style SaaS platform that combines:

- CRM lead management
- workflow automation
- async job orchestration
- AI-assisted operations
- real-time execution monitoring
- multi-tenant collaboration

into one operational workspace.

The project was designed to simulate how modern startup SaaS systems are architected and deployed in production environments.

---

# Live Demo

## Web Application

https://opsflow-ai-omega.vercel.app

---

# System Architecture

```txt
                        ┌─────────────────────┐
                        │     Next.js App     │
                        │   (Vercel Deploy)   │
                        └──────────┬──────────┘
                                   │
                     Route Handlers / API Layer
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼

 ┌───────────────┐      ┌────────────────┐      ┌────────────────┐
 │ PostgreSQL DB │      │ Redis / BullMQ │      │ AI Services     │
 │  (Prisma ORM) │      │ Async Queue    │      │ OpenAI APIs     │
 └──────┬────────┘      └────────┬───────┘      └────────────────┘
        │                        │
        │                        ▼
        │             ┌────────────────────┐
        │             │ Railway Worker     │
        │             │ Workflow Executor  │
        │             │ Retry Processing   │
        │             └─────────┬──────────┘
        │                       │
        │                       ▼
        │             ┌────────────────────┐
        │             │ Email Integrations │
        │             │ Resend API         │
        │             └────────────────────┘
        │
        ▼

┌────────────────────────────────────────────┐
│ Real-time Workflow Monitoring / SSE Updates│
└────────────────────────────────────────────┘
```

---

# Core Product Direction

OpsFlow AI is built for:

- SMB sales teams
- SaaS startups
- agencies
- outbound teams
- operations teams

The platform combines:

- CRM
- workflow automation
- AI assistance
- queue orchestration
- operational monitoring

inside one unified system.

---

# What The System Supports

## CRM System

- Lead management
- Pipeline stages
- Activity timelines
- Ownership assignment
- Search and filtering
- Pagination
- Team collaboration

---

## Workflow Builder

Inspired by systems like:

- Zapier
- n8n
- HubSpot automation

Features:

- drag-and-drop workflow canvas
- DAG-based execution
- condition branches
- delay nodes
- AI nodes
- email nodes
- execution history
- retries
- failure handling

---

## Async Queue Architecture

Background jobs are processed using:

- BullMQ
- Redis
- Railway workers

Execution states include:

- queued
- processing
- retrying
- completed
- failed

Supports:

- retry logic
- exponential backoff
- failure recovery
- queue monitoring

---

## Multi-Tenant SaaS Architecture

Every organization operates inside isolated scoped data boundaries.

Includes:

- organizations
- workspace switching
- scoped workflows
- scoped CRM data
- member invites
- team collaboration

---

## RBAC Permission System

Roles:

- Owner
- Admin
- Operator
- Viewer

Permissions affect:

- routes
- API access
- workflow editing
- CRM actions
- dashboard visibility

---

## Real Email Automation

Workflow email nodes support:

- Resend integration
- template rendering
- dynamic variables
- nested dot-notation context

Examples:

```txt
{{lead.email}}
{{lead.name}}
{{user.email}}
{{sales_email}}
```

The worker can execute real outbound email actions through Resend.

---

# AI Features

AI is intentionally used as an operational layer instead of an AI wrapper.

Current capabilities include:

- AI lead scoring
- workflow generation
- execution analysis
- node recommendations
- operational suggestions

The workflow engine itself remains deterministic and reliable.

---

# Workflow Templates

## 1. Lead Qualification

### Target Users

Sales teams

### Flow

```txt
New Lead
   ↓
AI Lead Scoring
   ↓
Score > 70 ?
   ├── YES → Notify Sales
   └── NO  → Enter Nurture Flow
```

---

## 2. Cold Outreach Follow-up

### Target Users

SDR / outbound teams

### Flow

```txt
Send Email
   ↓
Wait 2 Days
   ↓
No Reply?
   ├── YES → Send Follow-up
   └── NO  → Mark Interested
```

---

## 3. Trial User Nurture

### Target Users

SaaS startups

### Flow

```txt
User Signup
   ↓
Welcome Email
   ↓
Wait 3 Days
   ↓
Usage Reminder
   ↓
Sales Follow-up
```

---

# Internal Operations Dashboard

Includes:

- queue monitoring
- failed jobs
- retry visibility
- worker health checks
- execution metrics
- audit timelines

This module exists specifically to simulate real operational SaaS systems.

---

# Monorepo Structure

```txt
/apps
  /web
  /worker

/packages
  /ui
  /shared
  /types
  /workflow-engine
  /config

/infrastructure
/docs
```

---

# Infrastructure Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | React Query + Zustand |
| Validation | Zod |
| Database | PostgreSQL |
| ORM | Prisma |
| Queue System | BullMQ |
| Cache | Redis |
| Worker Runtime | Railway |
| Hosting | Vercel |
| Email | Resend |
| AI | OpenAI APIs |

---

# Engineering Focus

This repository was intentionally designed to demonstrate:

- async orchestration
- distributed workers
- operational dashboards
- queue lifecycle management
- retry systems
- multi-tenant isolation
- RBAC architecture
- production-style frontend patterns
- scalable SaaS structure
- backend/frontend system ownership

This is not a landing-page demo or AI wrapper.

The focus is:

> operational complexity

---

# Production Patterns Implemented

## Async Workflow Execution

- background queue processing
- worker orchestration
- delayed execution
- retries
- dead-letter style recovery patterns

---

## Frontend State Complexity

- optimistic updates
- loading states
- retry states
- partial failures
- cache invalidation
- real-time synchronization

---

## API Architecture

- typed API contracts
- route handlers
- scoped org access
- structured responses
- modular service boundaries

---

## Operational Reliability

- worker health checks
- queue monitoring
- audit logging
- execution tracing
- deployment separation

---

# Local Development

## Install Dependencies

```bash
pnpm install
```

---

## Start Web App

```bash
pnpm dev
```

---

## Start Worker

```bash
pnpm worker
```

---

# Environment Variables

## Web

```env
DATABASE_URL=
REDIS_URL=
OPENAI_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

---

## Worker

```env
DATABASE_URL=
REDIS_URL=
OPENAI_API_KEY=

# Optional email integration
RESEND_API_KEY=
EMAIL_FROM=
```

---

# Deployment

## Deploy Web

```bash
npx vercel --prod --cwd apps/web
```

---

## Deploy Worker

Worker deploys independently on Railway.

---

# Email Integration Notes

The workflow engine already supports real outbound email execution through Resend integration.

To fully enable live email delivery:

1. Add a Resend API key
2. Verify a custom domain
3. Configure EMAIL_FROM

The public deployment may currently run in demo mode without active outbound email enabled.

---

# Future Expansion

Planned future capabilities:

- webhook triggers
- Slack integrations
- workflow marketplace
- collaborative workflow editing
- feature flags
- usage metering
- billing systems
- AI agent execution
- advanced analytics

---

# For Recruiters & Clients

This project demonstrates:

- production-style SaaS engineering
- async workflow systems
- distributed architecture
- queue orchestration
- operational monitoring
- multi-tenant application design
- AI-assisted automation
- scalable monorepo organization
- backend + frontend ownership

The goal was not feature completeness.

The goal was:

> building a believable operational SaaS system with credible engineering complexity.

---

# Author

Gloria Han

Focus Areas:

- AI Workflow Systems
- SaaS Architecture
- CRM Automation
- Operational Dashboards
- Async Processing Systems
- Full Stack Product Engineering