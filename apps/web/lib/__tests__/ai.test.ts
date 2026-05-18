import { describe, it, expect } from "vitest";

// We test the extractBalancedJSON function by importing from ai.ts
// But it's not exported, so we test via callDeepSeekJSON's behavior indirectly.
// Instead, test the prompt builders and feature flags.

import {
  NODE_SUGGESTION_SYSTEM,
  buildNodeSuggestionPrompt,
  WORKFLOW_GENERATION_SYSTEM,
  buildWorkflowGenerationPrompt,
  LEAD_SCORING_SYSTEM,
  buildLeadScoringPrompt,
  ANOMALY_ANALYSIS_SYSTEM,
  buildAnomalyAnalysisPrompt,
  COMPOSE_EMAIL_SYSTEM,
  buildComposeEmailPrompt,
  CLASSIFY_EMAIL_SYSTEM,
  buildClassifyEmailPrompt,
} from "@/lib/prompts";
import { isEnabled } from "@/lib/feature-flags";

// ── Prompt System Tests ─────────────────────────────────────────

describe("NODE_SUGGESTION_SYSTEM", () => {
  it("includes JSON object wrapper instruction", () => {
    expect(NODE_SUGGESTION_SYSTEM).toContain('"suggestions"');
    expect(NODE_SUGGESTION_SYSTEM).toContain("JSON object containing");
  });

  it("includes all valid node types", () => {
    for (const t of ["trigger", "action", "condition", "delay"]) {
      expect(NODE_SUGGESTION_SYSTEM).toContain(t);
    }
  });

  it("includes action types from platform context", () => {
    expect(NODE_SUGGESTION_SYSTEM).toContain("send_email");
    expect(NODE_SUGGESTION_SYSTEM).toContain("score_lead");
    expect(NODE_SUGGESTION_SYSTEM).toContain("update_lead");
    expect(NODE_SUGGESTION_SYSTEM).toContain("compose_email");
  });

  it("includes CRM data model", () => {
    expect(NODE_SUGGESTION_SYSTEM).toContain("lead.name");
    expect(NODE_SUGGESTION_SYSTEM).toContain("lead.stage");
    expect(NODE_SUGGESTION_SYSTEM).toContain("lead.email");
  });
});

describe("buildNodeSuggestionPrompt", () => {
  it("builds prompt with nodes and edges", () => {
    const nodes = [{ type: "trigger", label: "Start", config: { type: "manual" } }];
    const edges = [{ source: "n1", target: "n2", sourceHandle: null }];
    const prompt = buildNodeSuggestionPrompt(nodes, edges);
    expect(prompt).toContain("Start");
    expect(prompt).toContain("n1");
    expect(prompt).toContain("Suggest 3-5 nodes");
  });

  it("includes selected node type when provided", () => {
    const prompt = buildNodeSuggestionPrompt([], [], "action");
    expect(prompt).toContain('configuring a "action" node');
  });

  it("defaults to general suggestions without node type", () => {
    const prompt = buildNodeSuggestionPrompt([], []);
    expect(prompt).toContain("general workflow improvements");
  });
});

// ── Workflow Generation Tests ───────────────────────────────────

describe("WORKFLOW_GENERATION_SYSTEM", () => {
  it("includes all available action types", () => {
    const actions = ["send_email", "update_lead", "create_lead", "score_lead", "compose_email"];
    for (const a of actions) {
      expect(WORKFLOW_GENERATION_SYSTEM).toContain(a);
    }
  });

  it("includes condition operators", () => {
    expect(WORKFLOW_GENERATION_SYSTEM).toContain("equals");
    expect(WORKFLOW_GENERATION_SYSTEM).toContain("greater_than");
    expect(WORKFLOW_GENERATION_SYSTEM).toContain("contains");
  });

  it("includes JSON output format instruction", () => {
    expect(WORKFLOW_GENERATION_SYSTEM).toContain("nodes: array");
    expect(WORKFLOW_GENERATION_SYSTEM).toContain("edges: array");
  });

  it("includes CRM data model", () => {
    expect(WORKFLOW_GENERATION_SYSTEM).toContain("lead.stage");
    expect(WORKFLOW_GENERATION_SYSTEM).toContain("PIPELINE STAGES");
  });
});

describe("buildWorkflowGenerationPrompt", () => {
  it("wraps description in JSON structure request", () => {
    const prompt = buildWorkflowGenerationPrompt("Send welcome email to new leads");
    expect(prompt).toContain("Send welcome email to new leads");
    expect(prompt).toContain("production-ready workflow");
    expect(prompt).toContain("valid config");
  });
});

// ── Lead Scoring Tests ──────────────────────────────────────────

describe("LEAD_SCORING_SYSTEM", () => {
  it("includes scoring criteria", () => {
    expect(LEAD_SCORING_SYSTEM).toContain("score");
    expect(LEAD_SCORING_SYSTEM).toContain("hot");
    expect(LEAD_SCORING_SYSTEM).toContain("warm");
    expect(LEAD_SCORING_SYSTEM).toContain("cold");
  });
});

describe("buildLeadScoringPrompt", () => {
  it("includes lead data fields", () => {
    const lead = {
      name: "Alice",
      email: "alice@company.com",
      stage: "qualified",
      tags: { vip: true },
      createdAt: "2026-01-01",
    };
    const prompt = buildLeadScoringPrompt(lead);
    expect(prompt).toContain("Alice");
    expect(prompt).toContain("alice@company.com");
    expect(prompt).toContain("qualified");
    expect(prompt).toContain("vip");
    expect(prompt).toContain("Pipeline stages progress");
  });

  it("handles missing optional fields", () => {
    const lead = {
      name: "Bob",
      email: null,
      stage: null,
      tags: null,
      createdAt: "2026-01-01",
    };
    const prompt = buildLeadScoringPrompt(lead);
    expect(prompt).toContain("N/A");
    expect(prompt).toContain("none");
  });
});

// ── Anomaly Analysis Tests ──────────────────────────────────────

describe("ANOMALY_ANALYSIS_SYSTEM", () => {
  it("requires JSON output with correct fields", () => {
    expect(ANOMALY_ANALYSIS_SYSTEM).toContain("rootCause");
    expect(ANOMALY_ANALYSIS_SYSTEM).toContain("failedNode");
    expect(ANOMALY_ANALYSIS_SYSTEM).toContain("suggestedFix");
    expect(ANOMALY_ANALYSIS_SYSTEM).toContain("isTransient");
  });
});

describe("buildAnomalyAnalysisPrompt", () => {
  it("includes run ID and events", () => {
    const events = [{ nodeId: "n1", status: "failed", input: {}, output: {} }];
    const prompt = buildAnomalyAnalysisPrompt("run-123", "failed", events);
    expect(prompt).toContain("run-123");
    expect(prompt).toContain("n1");
    expect(prompt).toContain("failed");
    expect(prompt).toContain("rootCause");
    expect(prompt).toContain("isTransient");
  });
});

// ── Email Composition Tests ─────────────────────────────────────

describe("COMPOSE_EMAIL_SYSTEM", () => {
  it("includes all email types", () => {
    const types = ["welcome", "follow-up", "cold-outreach", "re-engagement", "proposal"];
    for (const t of types) {
      expect(COMPOSE_EMAIL_SYSTEM).toContain(t);
    }
  });

  it("requests JSON with subject and body", () => {
    expect(COMPOSE_EMAIL_SYSTEM).toContain("subject");
    expect(COMPOSE_EMAIL_SYSTEM).toContain("body");
  });

  it("forbids markdown fences", () => {
    expect(COMPOSE_EMAIL_SYSTEM).toContain("Do NOT include markdown fences");
  });
});

describe("buildComposeEmailPrompt", () => {
  it("includes lead context in prompt", () => {
    const prompt = buildComposeEmailPrompt({
      emailType: "follow-up",
      leadContext: { name: "Alice", email: "a@b.com", stage: "qualified", tags: ["vip"] },
    });
    expect(prompt).toContain("follow-up");
    expect(prompt).toContain("Alice");
    expect(prompt).toContain("a@b.com");
    expect(prompt).toContain("qualified");
    expect(prompt).toContain("vip");
  });

  it("includes additional context when provided", () => {
    const prompt = buildComposeEmailPrompt({
      emailType: "proposal",
      leadContext: { name: "Bob", email: "b@c.com", stage: "negotiation" },
      additionalContext: "Budget: $50K, timeline: 2 weeks",
    });
    expect(prompt).toContain("Budget: $50K");
    expect(prompt).toContain("2 weeks");
  });

  it("handles missing tags gracefully", () => {
    const prompt = buildComposeEmailPrompt({
      emailType: "welcome",
      leadContext: { name: "Charlie" },
    });
    expect(prompt).toContain("none");
  });
});

// ── Email Classification Tests ──────────────────────────────────

describe("CLASSIFY_EMAIL_SYSTEM", () => {
  it("includes all intent categories", () => {
    const intents = ["sales_inquiry", "support_request", "complaint", "scheduling", "introduction", "unsubscribe", "spam"];
    for (const i of intents) {
      expect(CLASSIFY_EMAIL_SYSTEM).toContain(i);
    }
  });

  it("requests JSON with correct fields", () => {
    expect(CLASSIFY_EMAIL_SYSTEM).toContain("intent");
    expect(CLASSIFY_EMAIL_SYSTEM).toContain("sentiment");
    expect(CLASSIFY_EMAIL_SYSTEM).toContain("urgency");
    expect(CLASSIFY_EMAIL_SYSTEM).toContain("suggestedAction");
  });
});

describe("buildClassifyEmailPrompt", () => {
  it("includes email content", () => {
    const prompt = buildClassifyEmailPrompt({
      subject: "Need help with setup",
      body: "Hi, I'm having trouble setting up my account.",
      fromEmail: "customer@example.com",
    });
    expect(prompt).toContain("Need help with setup");
    expect(prompt).toContain("setting up my account");
    expect(prompt).toContain("customer@example.com");
  });

  it("handles missing fromEmail", () => {
    const prompt = buildClassifyEmailPrompt({
      subject: "Hello",
      body: "World",
    });
    expect(prompt).toContain("Unknown");
  });
});

// ── Feature Flags Tests ─────────────────────────────────────────

describe("isEnabled", () => {
  it("ai_suggestions defaults to true", () => {
    expect(isEnabled("ai_suggestions")).toBe(true);
  });

  it("ai_workflow_generation defaults to true", () => {
    expect(isEnabled("ai_workflow_generation")).toBe(true);
  });

  it("ai_lead_scoring defaults to true", () => {
    expect(isEnabled("ai_lead_scoring")).toBe(true);
  });

  it("ai_anomaly_detection defaults to true", () => {
    expect(isEnabled("ai_anomaly_detection")).toBe(true);
  });

  it("ai_compose_email defaults to true", () => {
    expect(isEnabled("ai_compose_email")).toBe(true);
  });

  it("ai_classify_email defaults to true", () => {
    expect(isEnabled("ai_classify_email")).toBe(true);
  });

  it("advanced_tables defaults to true", () => {
    expect(isEnabled("advanced_tables")).toBe(true);
  });

  it("realtime_updates defaults to true", () => {
    expect(isEnabled("realtime_updates")).toBe(true);
  });
});
