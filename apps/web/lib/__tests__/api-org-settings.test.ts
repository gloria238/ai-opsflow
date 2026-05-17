/// <reference types="vitest" />
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TestUser } from "./helpers";
import { fetchJSON, BASE, waitForServer, getTestUser, getOwner, getOrgSlug } from "./helpers";

let admin: TestUser, operator: TestUser, viewer: TestUser, owner: TestUser;
let orgSlug: string;

describe("Org Settings API", () => {
  beforeAll(async () => {
    await waitForServer();
    owner = await getOwner();
    admin = await getTestUser("admin");
    operator = await getTestUser("operator");
    viewer = await getTestUser("viewer");
    orgSlug = await getOrgSlug();
  }, 30000);

  // ── GET /orgs/{slug} ────────────────────────────────────────────────

  describe("GET /api/orgs/{slug}", () => {
    it("all 4 roles can view org details", async () => {
      for (const u of [owner, admin, operator, viewer]) {
        const { res, body } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}`, {
          headers: { cookie: u.cookie },
        });
        expect(res.status).toBe(200);
        expect(body.slug).toBe(orgSlug);
      }
    });
  });

  // ── PATCH /orgs/{slug} ──────────────────────────────────────────────

  describe("PATCH /api/orgs/{slug} (manage_org only)", () => {
    it("owner can update org name", async () => {
      const { res, body } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}`, {
        method: "PATCH",
        headers: { cookie: owner.cookie },
        body: JSON.stringify({ name: "Updated Test Org" }),
      });
      expect(res.status).toBe(200);
      expect(body.name).toBe("Updated Test Org");
    });

    it("admin cannot update org (no manage_org)", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}`, {
        method: "PATCH",
        headers: { cookie: admin.cookie },
        body: JSON.stringify({ name: "Hacked" }),
      });
      expect(res.status).toBe(403);
    });

    it("operator cannot update org", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}`, {
        method: "PATCH",
        headers: { cookie: operator.cookie },
        body: JSON.stringify({ name: "Hacked" }),
      });
      expect(res.status).toBe(403);
    });

    it("viewer cannot update org", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}`, {
        method: "PATCH",
        headers: { cookie: viewer.cookie },
        body: JSON.stringify({ name: "Hacked" }),
      });
      expect(res.status).toBe(403);
    });
  });
});
