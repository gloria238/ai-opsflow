import { describe, it, expect } from "vitest";

// Test the pure functions from the worker engine
// These are not exported, so we replicate them here for testing

// ── Topological Sort (Kahn's algorithm) ────────────────────────
function topologicalSort(
  nodes: Array<{ id: string; type: string; config: Record<string, unknown> }>,
  edges: Array<{ id: string; sourceNodeId: string; targetNodeId: string; sourceHandle: string | null }>,
) {
  const ids = new Set(nodes.map((n) => n.id));
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.sourceNodeId) || !ids.has(e.targetNodeId)) continue;
    adj.get(e.sourceNodeId)!.push(e.targetNodeId);
    inDeg.set(e.targetNodeId, (inDeg.get(e.targetNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, d] of inDeg) if (d === 0) queue.push(id);

  const sorted: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const nb of adj.get(id) ?? []) {
      const nd = (inDeg.get(nb) ?? 1) - 1;
      inDeg.set(nb, nd);
      if (nd === 0) queue.push(nb);
    }
  }

  const map = new Map(nodes.map((n) => [n.id, n]));
  return sorted.map((id) => map.get(id)!).filter(Boolean);
}

// ── Condition Evaluation ────────────────────────────────────────
function evaluateCondition(
  config: Record<string, unknown>,
  input: Record<string, unknown>,
): "true" | "false" {
  const field = config.field as string | undefined;
  const operator = config.operator as string | undefined;
  const value = config.value as string | undefined;
  if (!field || !operator) return "true";

  let fieldValue: unknown = input;
  for (const key of field.split(".")) {
    if (fieldValue && typeof fieldValue === "object") {
      fieldValue = (fieldValue as Record<string, unknown>)[key];
    } else {
      fieldValue = undefined;
      break;
    }
  }

  const actual = fieldValue !== undefined ? String(fieldValue) : "";
  const expected = value ?? "";

  switch (operator) {
    case "equals": return actual === expected ? "true" : "false";
    case "not_equals": return actual !== expected ? "true" : "false";
    case "contains": return actual.toLowerCase().includes(expected.toLowerCase()) ? "true" : "false";
    case "greater_than": return Number(actual) > Number(expected) ? "true" : "false";
    case "less_than": return Number(actual) < Number(expected) ? "true" : "false";
    default: return "true";
  }
}

// ── Delay unit conversion ───────────────────────────────────────
function unitToMs(duration: number, unit: string): number {
  switch (unit) {
    case "minutes": return duration * 60_000;
    case "hours":   return duration * 3_600_000;
    case "days":    return duration * 86_400_000;
    default:        return duration * 60_000;
  }
}

// ── Tests ───────────────────────────────────────────────────────

describe("topologicalSort", () => {
  it("sorts a simple linear DAG", () => {
    const nodes = [
      { id: "a", type: "trigger", config: {} },
      { id: "b", type: "action", config: {} },
      { id: "c", type: "action", config: {} },
    ];
    const edges = [
      { id: "e1", sourceNodeId: "a", targetNodeId: "b", sourceHandle: null },
      { id: "e2", sourceNodeId: "b", targetNodeId: "c", sourceHandle: null },
    ];
    const sorted = topologicalSort(nodes, edges);
    expect(sorted.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts a DAG with branching (condition)", () => {
    const nodes = [
      { id: "t", type: "trigger", config: {} },
      { id: "a", type: "action", config: {} },
      { id: "c", type: "condition", config: {} },
      { id: "x", type: "action", config: {} },
      { id: "y", type: "action", config: {} },
    ];
    const edges = [
      { id: "e1", sourceNodeId: "t", targetNodeId: "a", sourceHandle: null },
      { id: "e2", sourceNodeId: "a", targetNodeId: "c", sourceHandle: null },
      { id: "e3", sourceNodeId: "c", targetNodeId: "x", sourceHandle: "true" },
      { id: "e4", sourceNodeId: "c", targetNodeId: "y", sourceHandle: "false" },
    ];
    const sorted = topologicalSort(nodes, edges);
    expect(sorted[0].id).toBe("t");
    expect(sorted[sorted.length - 1].type).toBe("action");
    // c must come before x and y
    const cIdx = sorted.findIndex((n) => n.id === "c");
    const xIdx = sorted.findIndex((n) => n.id === "x");
    const yIdx = sorted.findIndex((n) => n.id === "y");
    expect(cIdx).toBeLessThan(xIdx);
    expect(cIdx).toBeLessThan(yIdx);
  });

  it("handles disconnected nodes (isolated)", () => {
    const nodes = [
      { id: "a", type: "trigger", config: {} },
      { id: "b", type: "action", config: {} },
    ];
    const edges: Array<{ id: string; sourceNodeId: string; targetNodeId: string; sourceHandle: null }> = [];
    const sorted = topologicalSort(nodes, edges);
    expect(sorted).toHaveLength(2);
  });

  it("handles edges referencing missing nodes gracefully", () => {
    const nodes = [
      { id: "a", type: "trigger", config: {} },
    ];
    const edges = [
      { id: "e1", sourceNodeId: "a", targetNodeId: "missing", sourceHandle: null },
    ];
    const sorted = topologicalSort(nodes, edges);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe("a");
  });

  it("returns empty for empty input", () => {
    expect(topologicalSort([], [])).toEqual([]);
  });
});

describe("evaluateCondition", () => {
  const input = {
    lead: { name: "Alice", email: "a@company.com", stage: "qualified" },
    score: 85,
  };

  it("equals operator matches exact strings", () => {
    expect(evaluateCondition(
      { field: "lead.stage", operator: "equals", value: "qualified" }, input,
    )).toBe("true");
    expect(evaluateCondition(
      { field: "lead.stage", operator: "equals", value: "new" }, input,
    )).toBe("false");
  });

  it("not_equals operator", () => {
    expect(evaluateCondition(
      { field: "lead.stage", operator: "not_equals", value: "closed-lost" }, input,
    )).toBe("true");
    expect(evaluateCondition(
      { field: "lead.stage", operator: "not_equals", value: "qualified" }, input,
    )).toBe("false");
  });

  it("contains operator is case-insensitive", () => {
    expect(evaluateCondition(
      { field: "lead.email", operator: "contains", value: "COMPANY" }, input,
    )).toBe("true");
    expect(evaluateCondition(
      { field: "lead.email", operator: "contains", value: "gmail" }, input,
    )).toBe("false");
  });

  it("greater_than operator compares numerically", () => {
    expect(evaluateCondition(
      { field: "score", operator: "greater_than", value: "70" }, input,
    )).toBe("true");
    expect(evaluateCondition(
      { field: "score", operator: "greater_than", value: "90" }, input,
    )).toBe("false");
  });

  it("less_than operator compares numerically", () => {
    expect(evaluateCondition(
      { field: "score", operator: "less_than", value: "90" }, input,
    )).toBe("true");
    expect(evaluateCondition(
      { field: "score", operator: "less_than", value: "50" }, input,
    )).toBe("false");
  });

  it("returns true for missing field or operator", () => {
    expect(evaluateCondition({}, input)).toBe("true");
    expect(evaluateCondition({ field: "x" }, input)).toBe("true");
  });

  it("returns true for unknown operator", () => {
    expect(evaluateCondition(
      { field: "score", operator: "regex" as string, value: ".*" }, input,
    )).toBe("true");
  });

  it("handles deeply nested dot-path", () => {
    const deep = { a: { b: { c: "found" } } };
    expect(evaluateCondition(
      { field: "a.b.c", operator: "equals", value: "found" }, deep,
    )).toBe("true");
  });

  it("handles missing dot-path key gracefully", () => {
    expect(evaluateCondition(
      { field: "lead.phone", operator: "equals", value: "555" }, input,
    )).toBe("false");
  });
});

describe("unitToMs", () => {
  it("converts minutes", () => {
    expect(unitToMs(5, "minutes")).toBe(300_000);
  });

  it("converts hours", () => {
    expect(unitToMs(2, "hours")).toBe(7_200_000);
  });

  it("converts days", () => {
    expect(unitToMs(1, "days")).toBe(86_400_000);
  });

  it("defaults to minutes for unknown unit", () => {
    expect(unitToMs(3, "weeks")).toBe(180_000);
  });
});
