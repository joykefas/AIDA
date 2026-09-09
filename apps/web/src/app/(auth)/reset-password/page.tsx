"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import type { ResetPasswordRequest } from "@aida/shared";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Missing reset token. Please request a new password reset link.");
      return;
    }

    setLoading(true);
    try {
      await clientFetch<{ ok: boolean }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword } satisfies ResetPasswordRequest),
      });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg shadow-neutral-900/5 dark:shadow-none">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Your new password must be at least 8 characters long.
        </CardDescription>
      </CardHeader>

      {success ? (
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-900/30">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="text-sm font-medium">Password updated!</p>
          <p className="text-xs text-muted-foreground">Redirecting you to the login page…</p>
          <Link href="/login" className="mt-2 text-sm text-brand-600 hover:underline">
            Click here if you are not redirected
          </Link>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput
                id="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <PasswordInput
                id="confirmPassword"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            {error && <FormError message={error} />}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              <KeyRound className="size-4 mr-1.5" />
              {loading ? "Updating password…" : "Update Password"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Back to{" "}
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
