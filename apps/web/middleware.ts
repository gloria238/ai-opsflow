import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, extractJti } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTokenRevoked } from "@/lib/token-blacklist";

const publicPaths = ["/", "/login", "/register", "/docs"];
const authApiPaths = ["/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/verify"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "127.0.0.1";

    const { allowed, remaining, reset } = await checkRateLimit(ip);

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(reset));

    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(reset),
        },
      });
    }

    // Carry over rate limit headers on allowed responses too
    if (pathname.startsWith("/api/auth/")) {
      return response;
    }
  }

  // Allow public paths, auth API routes, and webhook triggers
  if (
    publicPaths.some((p) => pathname === p) ||
    authApiPaths.some((p) => pathname.startsWith(p)) ||
    pathname.match(/^\/api\/orgs\/[^/]+\/workflows\/[^/]+\/webhook$/)
  ) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check if token has been revoked (logout, password change, etc.)
  if (payload.jti) {
    const revoked = await isTokenRevoked(payload.jti);
    if (revoked) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set("session", "", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 0, path: "/" });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
