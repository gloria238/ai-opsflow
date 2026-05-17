/// <reference types="vitest" />
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TestUser } from "./helpers";
import { fetchJSON, BASE, waitForServer, getTestUser, getOwner, getOrgSlug } from "./helpers";

const T = `mem-${Date.now()}`;
let admin: TestUser, operator: TestUser, viewer: TestUser, owner: TestUser;
let orgSlug: string;
let testMembershipId: string;

describe("Members API — RBAC matrix", () => {
  beforeAll(async () => {
    await waitForServer();
    admin = await getTestUser("admin");
    operator = await getTestUser("operator");
    viewer = await getTestUser("viewer");
    owner = await getOwner();
    orgSlug = await getOrgSlug();
  }, 30000);

  afterAll(async () => {
    if (testMembershipId) {
      await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members/${testMembershipId}`, {
        method: "DELETE", headers: { cookie: owner.cookie },
      });
    }
  });

  // ── GET /members (list) ─────────────────────────────────────────────

  describe("GET /api/orgs/{slug}/members (list)", () => {
    it("all 4 roles can view members list", async () => {
      for (const u of [owner, admin, operator, viewer]) {
        const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members`, {
          headers: { cookie: u.cookie },
        });
        expect(res.status).toBe(200);
      }
    });

    it("redirects to login without cookie", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members`);
      expect(res.status).toBe(307);
    });
  });

  // ── POST /members (invite) ──────────────────────────────────────────

  describe("POST /api/orgs/{slug}/members (invite)", () => {
    it("returns 409 when user is already a member", async () => {
      // Non-alice registrants are auto-added as viewers to alice's org
      const email = `invite-dup-${T}@test.com`;
      await fetchJSON(`${BASE}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({ email, password: "test123456", name: `Invite Dup ${T}` }),
      });

      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members`, {
        method: "POST",
        headers: { cookie: admin.cookie },
        body: JSON.stringify({ email, role: "viewer" }),
      });
      expect(res.status).toBe(409);
    });

    it("returns 400 when email is missing", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members`, {
        method: "POST",
        headers: { cookie: admin.cookie },
        body: JSON.stringify({ role: "viewer" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid role", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members`, {
        method: "POST",
        headers: { cookie: admin.cookie },
        body: JSON.stringify({ email: `bad-${T}@test.com`, role: "superadmin" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 when user doesn't exist", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members`, {
        method: "POST",
        headers: { cookie: admin.cookie },
        body: JSON.stringify({ email: `noone-${T}@test.com`, role: "viewer" }),
      });
      expect(res.status).toBe(404);
    });

    it("operator cannot invite", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members`, {
        method: "POST",
        headers: { cookie: operator.cookie },
        body: JSON.stringify({ email: `invite-${T}@test.com`, role: "viewer" }),
      });
      expect(res.status).toBe(403);
    });

    it("viewer cannot invite", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members`, {
        method: "POST",
        headers: { cookie: viewer.cookie },
        body: JSON.stringify({ email: `invite-${T}@test.com`, role: "viewer" }),
      });
      expect(res.status).toBe(403);
    });
  });

  // ── PATCH /members/{id} (change role) ───────────────────────────────

  describe("PATCH /api/orgs/{slug}/members/{id} (change role)", () => {
    it("admin can change a member's role", async () => {
      // Get a real membership ID from the list
      const { body: list } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/members`, {
        headers: { cookie: admin.cookie },
      });
      const target = list.find((m: { role: string; id: string }) => m.role === "viewer");
      if (!target) return; // skip if no viewer to demote

      const { res, body } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/members/${target.id}`,
        {
          method: "PATCH",
          headers: { cookie: admin.cookie },
          body: JSON.stringify({ role: "operator" }),
        },
      );
      expect(res.status).toBe(200);
      expect(body.role).toBe("operator");
      testMembershipId = target.id;
    });

    it("operator cannot change role", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/members/${testMembershipId}`,
        {
          method: "PATCH",
          headers: { cookie: operator.cookie },
          body: JSON.stringify({ role: "viewer" }),
        },
      );
      expect(res.status).toBe(403);
    });

    it("viewer cannot change role", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/members/${testMembershipId}`,
        {
          method: "PATCH",
          headers: { cookie: viewer.cookie },
          body: JSON.stringify({ role: "admin" }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /members/{id} (remove) ───────────────────────────────────

  describe("DELETE /api/orgs/{slug}/members/{id} (remove)", () => {
    it("operator cannot remove members", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/members/${testMembershipId}`,
        { method: "DELETE", headers: { cookie: operator.cookie } },
      );
      expect(res.status).toBe(403);
    });

    it("viewer cannot remove members", async () => {
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/members/${testMembershipId}`,
        { method: "DELETE", headers: { cookie: viewer.cookie } },
      );
      expect(res.status).toBe(403);
    });

    it("admin can remove a member", async () => {
      if (!testMembershipId) return;
      const { res } = await fetchJSON(
        `${BASE}/api/orgs/${orgSlug}/members/${testMembershipId}`,
        { method: "DELETE", headers: { cookie: admin.cookie } },
      );
      expect(res.status).toBe(204);
      testMembershipId = "";
    });
  });
});
