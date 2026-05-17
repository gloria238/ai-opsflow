/// <reference types="vitest" />
import { describe, it, expect, beforeAll } from "vitest";
import type { TestUser } from "./helpers";
import { fetchJSON, BASE, waitForServer, getTestUser, getOwner, getOrgSlug } from "./helpers";

let admin: TestUser, operator: TestUser, viewer: TestUser, owner: TestUser;
let orgSlug: string;

describe("Audit Log API — RBAC", () => {
  beforeAll(async () => {
    await waitForServer();
    owner = await getOwner();
    admin = await getTestUser("admin");
    operator = await getTestUser("operator");
    viewer = await getTestUser("viewer");
    orgSlug = await getOrgSlug();
  }, 30000);

  describe("GET /api/orgs/{slug}/audit-log", () => {
    it("all 4 roles can view audit log", async () => {
      for (const u of [owner, admin, operator, viewer]) {
        const { res, body } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/audit-log`, {
          headers: { cookie: u.cookie },
        });
        expect(res.status).toBe(200);
        expect(body.logs).toBeDefined();
        expect(typeof body.total).toBe("number");
      }
    });

    it("redirects to login without cookie", async () => {
      const { res } = await fetchJSON(`${BASE}/api/orgs/${orgSlug}/audit-log`);
      expect(res.status).toBe(307);
    });
  });
});
