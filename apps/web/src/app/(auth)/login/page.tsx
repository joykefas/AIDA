"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import type { LoginRequest } from "@aida/shared";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
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
      await clientFetch<{ ok: true }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password } satisfies LoginRequest),
      });
      router.push(searchParams.get("next") ?? "/home");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg shadow-neutral-900/5 dark:shadow-none">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Log in to pick up where you left off.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <FormError message={error} />}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New to AIDA?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
