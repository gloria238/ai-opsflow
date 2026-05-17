import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("hashPassword", () => {
  it("returns a string different from the input", async () => {
    const hash = await hashPassword("mySecret123");
    expect(hash).toBeTypeOf("string");
    expect(hash).not.toBe("mySecret123");
  });

  it("produces a bcrypt hash (starts with $2a$ or $2b$)", async () => {
    const hash = await hashPassword("mySecret123");
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
  });

  it("produces different hashes for the same password (salt)", async () => {
    const h1 = await hashPassword("samePassword");
    const h2 = await hashPassword("samePassword");
    expect(h1).not.toBe(h2);
  });
});

describe("verifyPassword", () => {
  it("returns true for a matching password", async () => {
    const hash = await hashPassword("correct-horse-battery");
    const result = await verifyPassword("correct-horse-battery", hash);
    expect(result).toBe(true);
  });

  it("returns false for a wrong password", async () => {
    const hash = await hashPassword("correct-horse-battery");
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  it("returns false for an empty password", async () => {
    const hash = await hashPassword("somePassword");
    const result = await verifyPassword("", hash);
    expect(result).toBe(false);
  });

  it("returns false for a similar but different password", async () => {
    const hash = await hashPassword("Password1");
    const result = await verifyPassword("password1", hash); // different case
    expect(result).toBe(false);
  });
});
