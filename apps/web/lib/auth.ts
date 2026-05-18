import { SignJWT, jwtVerify } from "jose";

function generateId(): string {
  // Edge-compatible: use Web Crypto API when available, fallback to Node crypto
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // Node.js < 19 fallback (only used in unit tests)
  const { randomUUID } = require("crypto") as typeof import("crypto");
  return randomUUID();
}

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET environment variable is required");
const JWT_SECRET = new TextEncoder().encode(secret);

export interface JwtPayload {
  userId: string;
  email: string;
  name: string | null;
  orgId: string;
  orgSlug: string;
  role: string;
  jti: string;
}

export async function signToken(payload: Omit<JwtPayload, "jti">): Promise<string> {
  return new SignJWT({ ...payload, jti: generateId() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export function extractJti(token: string): string | null {
  try {
    // Minimal extraction without full verification — just decode the JWT payload.
    // Edge-compatible: uses atob instead of Node.js Buffer.
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Convert base64url → base64, then decode
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json);
    return payload.jti || null;
  } catch {
    return null;
  }
}
