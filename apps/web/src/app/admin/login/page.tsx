"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, ShieldAlert, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import { UserRole, type LoginRequest, type UserProfile } from "@aida/shared";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <Suspense fallback={null}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Authenticate with the API
      await clientFetch<{ ok: true }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password } satisfies LoginRequest),
      });

      // Verify the user role is authorized for admin access
      const user = await clientFetch<UserProfile>("/users/me");

      if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPPORT) {
        // Clear session immediately if user is not authorized for admin
        try {
          await clientFetch("/auth/logout", { method: "POST" });
        } catch {
          // Ignore logout error
        }
        setError("Access Denied: This console is strictly restricted to platform administrators and authorized staff. Please use the student portal.");
        return;
      }

      const next = searchParams.get("next");
      router.push(next && next.startsWith("/admin") ? next : "/admin");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Authentication failed. Verify your administrator credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex items-center gap-2">
          <Image src="/brand/dark_logo_single.png" alt="AIDA Logo" width={32} height={32} />
          <span className="font-heading text-xl font-bold tracking-tight text-white">AIDA</span>
          <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Console
          </span>
        </div>
        <h1 className="text-sm font-medium text-slate-400">Restricted Operations &amp; Administration</h1>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Lock className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Privileged Access</span>
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight text-white">Admin Authentication</CardTitle>
          <CardDescription className="text-slate-400">
            Sign in with administrator credentials to manage platform telemetry, user privacy, and system pipelines.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-xs font-medium text-slate-300">
                Administrative Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aida.app"
                className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500 focus-visible:border-amber-500 focus-visible:ring-amber-500/30"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password" className="text-xs font-medium text-slate-300">
                  Password
                </Label>
              </div>
              <PasswordInput
                id="admin-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-500 focus-visible:border-amber-500 focus-visible:ring-amber-500/30"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
                <ShieldAlert className="size-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              className="w-full bg-amber-500 font-medium text-slate-950 transition hover:bg-amber-400"
              disabled={loading}
            >
              {loading ? (
                "Verifying credentials…"
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  Sign in to Console
                </span>
              )}
            </Button>

            <div className="pt-2 text-center text-xs text-slate-500">
              <span>Standard student? </span>
              <Link href="/login" className="font-medium text-slate-300 underline hover:text-white">
                Access Student Portal
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
