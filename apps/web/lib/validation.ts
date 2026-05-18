import { z } from "zod";

// ── Shared validators ───────────────────────────────────────────
const email = z.string().email("Invalid email format").max(320, "Email too long");
const slug = z.string().min(1).max(60).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens");
const name = z.string().min(1, "Name is required").max(255, "Name too long");
const stage = z.enum(["new", "qualified", "proposal", "negotiation", "closed-won", "closed-lost"]);

// ── Lead input ───────────────────────────────────────────────────
export const createLeadSchema = z.object({
  name: name,
  email: email.optional().nullable(),
  stage: stage.optional().default("new"),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

export const updateLeadSchema = z.object({
  name: name.optional(),
  email: email.optional().nullable(),
  stage: stage.optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

// ── Workflow input ───────────────────────────────────────────────
export const createWorkflowSchema = z.object({
  name: name,
  description: z.string().max(1000).optional(),
});

const nodeConfigSchema = z.record(z.string(), z.unknown());

export const saveWorkflowSchema = z.object({
  nodes: z.array(z.object({
    id: z.string().min(1).max(100),
    type: z.enum(["trigger", "action", "condition", "delay"]),
    label: z.string().max(200).optional(),
    config: nodeConfigSchema,
    positionX: z.number().finite(),
    positionY: z.number().finite(),
  })).max(200),
  edges: z.array(z.object({
    id: z.string().min(1).max(100),
    sourceNodeId: z.string().min(1).max(100),
    targetNodeId: z.string().min(1).max(100),
    sourceHandle: z.enum(["true", "false"]).nullable().optional(),
  })).max(400),
});

export const triggerWorkflowSchema = z.object({
  input: z.record(z.string(), z.unknown()).optional(),
});

// ── Organization input ──────────────────────────────────────────
export const createOrgSchema = z.object({
  name: name,
  slug: slug,
});

export const updateOrgSchema = z.object({
  name: name.optional(),
  slug: slug.optional(),
});

// ── Member input ─────────────────────────────────────────────────
export const inviteMemberSchema = z.object({
  email: email,
  role: z.enum(["admin", "operator", "viewer"]),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "operator", "viewer"]),
});

// ── API key input ───────────────────────────────────────────────
export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});

// ── Lead import ──────────────────────────────────────────────────
export const leadImportRowSchema = z.object({
  Name: z.string().min(1).max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  Email: email.optional(),
  email: email.optional(),
  Stage: stage.optional(),
  stage: stage.optional(),
  Tags: z.string().max(500).optional(),
  tags: z.string().max(500).optional(),
});

export const leadImportSchema = z.object({
  rows: z.array(leadImportRowSchema).min(1).max(500),
});

// ── AI inputs ────────────────────────────────────────────────────
export const generateWorkflowSchema = z.object({
  description: z.string().min(1, "Description required").max(2000, "Description too long"),
});

export const suggestNodesSchema = z.object({
  nodes: z.array(z.object({
    type: z.enum(["trigger", "action", "condition", "delay"]),
    label: z.string().max(200).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().nullable().optional(),
  })),
  nodeConfig: z.object({ type: z.string() }).optional(),
});

export const scoreLeadSchema = z.object({
  leadId: z.string().uuid().optional(),
  name: name.optional(),
  email: email.optional(),
  stage: stage.optional(),
  tags: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().optional(),
});

export const analyzeRunSchema = z.object({
  runId: z.string().min(1, "runId required"),
});

export const composeEmailSchema = z.object({
  emailType: z.enum(["welcome", "follow-up", "cold-outreach", "re-engagement", "proposal"]).default("follow-up"),
  leadId: z.string().uuid().optional(),
  leadContext: z.record(z.string(), z.unknown()).optional(),
  additionalContext: z.string().max(1000).optional(),
});

export const classifyEmailSchema = z.object({
  subject: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  fromEmail: email.optional(),
});

// ── Template install ────────────────────────────────────────────
export const installTemplateSchema = z.object({
  slug: z.string().min(1, "Template slug required"),
});

// ── Auth input ───────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().min(1, "Email required"),
  password: z.string().min(1, "Password required"),
});

export const registerSchema = z.object({
  name: name,
  email: email,
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long"),
});
