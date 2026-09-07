"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import type { ForgotPasswordRequest } from "@aida/shared";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await clientFetch<{ ok: boolean }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email } satisfies ForgotPasswordRequest),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg shadow-neutral-900/5 dark:shadow-none">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter the email associated with your account and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>

      {submitted ? (
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-900/30">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="text-sm font-medium">Check your email</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            If an account exists for <span className="font-semibold text-foreground">{email}</span>, you will receive a
            password reset link shortly.
          </p>
          <Link href="/login" className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
            <ArrowLeft className="size-4" /> Back to log in
          </Link>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
              />
            </div>
            {error && <FormError message={error} />}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              <Mail className="size-4 mr-1.5" />
              {loading ? "Sending link…" : "Send Reset Link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
