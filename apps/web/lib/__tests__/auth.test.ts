import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "@/lib/auth";

describe("signToken", () => {
  it("returns a JWT string", async () => {
    const token = await signToken({
      userId: "user-1",
      email: "test@example.com",
      name: "Test User",
      orgId: "org-1",
      orgSlug: "test-org",
      role: "owner",
    });
    expect(token).toBeTypeOf("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("includes all payload fields", async () => {
    const payload = {
      userId: "user-2",
      email: "alice@example.com",
      name: "Alice",
      orgId: "org-2",
      orgSlug: "alice-workspace",
      role: "owner",
    };
    const token = await signToken(payload);
    const decoded = await verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(payload.userId);
    expect(decoded!.email).toBe(payload.email);
    expect(decoded!.name).toBe(payload.name);
    expect(decoded!.orgId).toBe(payload.orgId);
    expect(decoded!.orgSlug).toBe(payload.orgSlug);
    expect(decoded!.role).toBe(payload.role);
  });

  it("handles null name", async () => {
    const token = await signToken({
      userId: "user-3",
      email: "test@example.com",
      name: null,
      orgId: "org-3",
      orgSlug: "test-org",
      role: "viewer",
    });
    const decoded = await verifyToken(token);
    expect(decoded!.name).toBeNull();
  });
});

describe("verifyToken", () => {
  it("returns null for an empty string", async () => {
    const result = await verifyToken("");
    expect(result).toBeNull();
  });

  it("returns null for a garbage token", async () => {
    const result = await verifyToken("not.a.valid.jwt");
    expect(result).toBeNull();
  });

  it("returns null for a tampered token", async () => {
    const token = await signToken({
      userId: "user-4",
      email: "test@example.com",
      name: "Test",
      orgId: "org-4",
      orgSlug: "test-org",
      role: "operator",
    });
    // Modify the payload portion (middle segment) to break the signature
    const parts = token.split(".");
    parts[1] = parts[1].replace(/[a-zA-Z0-9_-]/g, "X");
    const tampered = parts.join(".");
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    // A JWT signed with a completely different key
    const foreignToken =
      "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ4In0.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const result = await verifyToken(foreignToken);
    expect(result).toBeNull();
  });

  it("round-trips role correctly for all 4 roles", async () => {
    const roles = ["owner", "admin", "operator", "viewer"];
    for (const role of roles) {
      const token = await signToken({
        userId: "user-5",
        email: "test@example.com",
        name: "Test",
        orgId: "org-5",
        orgSlug: "test-org",
        role,
      });
      const decoded = await verifyToken(token);
      expect(decoded!.role).toBe(role);
    }
  });
});
