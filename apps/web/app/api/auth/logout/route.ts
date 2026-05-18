import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { extractJti } from "@/lib/auth";
import { revokeToken } from "@/lib/token-blacklist";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (token) {
    const jti = extractJti(token);
    if (jti) await revokeToken(jti).catch(() => {});
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
