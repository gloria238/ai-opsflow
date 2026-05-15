"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVerifyUrl("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      if (data.requiresVerification && data.verifyUrl) {
        setVerifyUrl(data.verifyUrl);
        toast.info("Verification link generated");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-xl border border-zinc-200/60 bg-white shadow-card p-8">
        <div className="text-center mb-8">
          <div className="inline-flex size-10 rounded-lg bg-blue-600 items-center justify-center text-white font-bold text-sm mb-4">
            O
          </div>
          <h1 className="text-lg font-semibold text-zinc-900">Create an account</h1>
          <p className="text-sm text-zinc-500 mt-1">Get started with OpsFlow.</p>
        </div>

        {verifyUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-center">
              <p className="text-sm font-medium text-blue-800 mb-2">Verify Your Email</p>
              <p className="text-xs text-blue-600 mb-3">
                Click the link below to complete registration. This link expires in 10 minutes.
              </p>
              <a
                href={verifyUrl}
                className="inline-block rounded-lg bg-blue-600 text-white text-sm font-medium px-6 py-2.5 hover:bg-blue-700 transition-colors"
              >
                Complete Registration
              </a>
              <p className="text-xs text-blue-500 mt-3">
                After verification, sign in with your email and password.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="block w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="block w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="block w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-zinc-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
