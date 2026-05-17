/// <reference types="vitest" />
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TestUser } from "./helpers";
import { fetchJSON, BASE, waitForServer, getTestUser, getOwner, getOrgSlug } from "./helpers";

const T = `wf-${Date.now()}`;
let admin: TestUser, operator: TestUser, viewer: TestUser, owner: TestUser;
let orgSlug: string;
let workflowId: string;

describe("Workflow API — RBAC matrix", () => {
  beforeAll(async () => {
    await waitForServer();
    admin = await getTestUser("admin");
    operator = await getTestUser("operator");
    viewer = await getTestUser("viewer");
    owner = await getOwner();
    orgSlug = await getOrgSlug();
  }, 30000);

  afterAll(async () => {
    if (workflowId) {
      await fetchJSON(`${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`, {
        method: "DELETE", headers: { cookie: owner.cookie },
      });
    }
  });

  // ── Create a workflow for CRUD tests ──────────────────────────────────

  async function createWorkflow(user: TestUser, name: string) {
    return fetchJSON(`${BASE}/api/orgs/${orgSlug}/workflows`, {
      method: "POST",
      headers: { cookie: user.cookie },
      body: JSON.stringify({ name, description: "RBAC test" }),
    });
  }

  // ── GET /workflows (list) ─────────────────────────────────────────────

  describe("GET /api/orgs/{slug}/workflows (list)", () => {
    it("owner can list workflows", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/workflows`, {
        headers: { cookie: owner.cookie },
      });
      expect(res.status).toBe(200);
    });

    it("admin can list workflows", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/workflows`, {
        headers: { cookie: admin.cookie },
      });
      expect(res.status).toBe(200);
    });

    it("operator can list workflows", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/workflows`, {
        headers: { cookie: operator.cookie },
      });
      expect(res.status).toBe(200);
    });

    it("viewer can list workflows", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/workflows`, {
        headers: { cookie: viewer.cookie },
      });
      expect(res.status).toBe(200);
    });

    it("redirects to login without cookie", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/workflows`);
      expect(res.status).toBe(307); // middleware redirect
    });
  });

  // ── POST /workflows (create) ─────────────────────────────────────────

  describe("POST /api/orgs/{slug}/workflows (create)", () => {
    it("owner can create", async () => {
      const { res, body } = await createWorkflow(owner, `${T}-owner-wf`);
      expect(res.status).toBe(201);
      expect(body.id).toBeTruthy();
      // reuse for subsequent GET/PUT/DELETE tests
      workflowId = body.id;
    });

    it("admin can create", async () => {
      const { res } = await createWorkflow(admin, `${T}-admin-wf`);
      expect(res.status).toBe(201);
    });

    it("operator can create", async () => {
      const { res } = await createWorkflow(operator, `${T}-op-wf`);
      expect(res.status).toBe(201);
    });

    it("viewer cannot create", async () => {
      const { res } = await createWorkflow(viewer, `${T}-viewer-wf`);
      expect(res.status).toBe(403);
    });

    it("returns 400 when name is missing", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/workflows`, {
        method: "POST",
        headers: { cookie: admin.cookie },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  // ── GET /workflows/{id} (detail) ──────────────────────────────────────

  describe("GET /api/orgs/{slug}/workflows/{id} (detail)", () => {
    it("owner can view detail", async () => {
      const { res, body } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { headers: { cookie: owner.cookie } },
      );
      expect(res.status).toBe(200);
      expect(body.name).toBe(`${T}-owner-wf`);
    });

    it("admin can view detail", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { headers: { cookie: admin.cookie } },
      );
      expect(res.status).toBe(200);
    });

    it("operator can view detail", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { headers: { cookie: operator.cookie } },
      );
      expect(res.status).toBe(200);
    });

    it("viewer can view detail", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { headers: { cookie: viewer.cookie } },
      );
      expect(res.status).toBe(200);
    });

    it("returns 404 for non-existent workflow", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/non-existent-id`,
        { headers: { cookie: admin.cookie } },
      );
      expect(res.status).toBe(404);
    });
  });

  // ── PUT /workflows/{id} (save canvas) ────────────────────────────────

  describe("PUT /api/orgs/{slug}/workflows/{id} (save canvas)", () => {
    const nodes = [
      { id: `${T}-t1`, type: "trigger", label: "Start", config: {}, positionX: 100, positionY: 50 },
    ];
    const edges = [] as { sourceNodeId: string; targetNodeId: string }[];
    const saveBody = { nodes, edges };

    it("owner can save", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { method: "PUT", headers: { cookie: owner.cookie }, body: JSON.stringify(saveBody) },
      );
      expect(res.status).toBe(200);
    });

    it("admin can save", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { method: "PUT", headers: { cookie: admin.cookie }, body: JSON.stringify(saveBody) },
      );
      expect(res.status).toBe(200);
    });

    it("operator can save", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { method: "PUT", headers: { cookie: operator.cookie }, body: JSON.stringify(saveBody) },
      );
      expect(res.status).toBe(200);
    });

    it("viewer cannot save", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { method: "PUT", headers: { cookie: viewer.cookie }, body: JSON.stringify(saveBody) },
      );
      expect(res.status).toBe(403);
    });
  });

  // ── POST /workflows/{id}/trigger ─────────────────────────────────────

  describe("POST /api/orgs/{slug}/workflows/{id}/trigger", () => {
    it("owner can trigger", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}/trigger`,
        { method: "POST", headers: { cookie: owner.cookie }, body: JSON.stringify({}) },
      );
      expect(res.status).toBe(201);
    });

    it("admin can trigger", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}/trigger`,
        { method: "POST", headers: { cookie: admin.cookie }, body: JSON.stringify({}) },
      );
      expect(res.status).toBe(201);
    });

    it("operator can trigger", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}/trigger`,
        { method: "POST", headers: { cookie: operator.cookie }, body: JSON.stringify({}) },
      );
      expect(res.status).toBe(201);
    });

    it("viewer cannot trigger", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}/trigger`,
        { method: "POST", headers: { cookie: viewer.cookie }, body: JSON.stringify({}) },
      );
      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /workflows/{id} ───────────────────────────────────────────

  describe("DELETE /api/orgs/{slug}/workflows/{id}", () => {
    it("viewer cannot delete", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { method: "DELETE", headers: { cookie: viewer.cookie } },
      );
      expect(res.status).toBe(403);
    });

    it("operator cannot delete", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { method: "DELETE", headers: { cookie: operator.cookie } },
      );
      expect(res.status).toBe(403);
    });

    it("admin can delete", async () => {
      // Create a fresh workflow for admin to delete
      const { body } = await createWorkflow(admin, `${T}-admin-delete`);
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${body.id}`,
        { method: "DELETE", headers: { cookie: admin.cookie } },
      );
      expect(res.status).toBe(204);
    });

    it("owner can delete", async () => {
      // Owner deletes the main test workflow (cleanup)
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/workflows/${workflowId}`,
        { method: "DELETE", headers: { cookie: owner.cookie } },
      );
      expect(res.status).toBe(204);
      workflowId = ""; // prevent afterAll double-delete
    });
  });
});
