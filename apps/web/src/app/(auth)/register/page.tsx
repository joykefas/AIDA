"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateOfBirthInput } from "@/components/ui/date-of-birth-input";
import { FormError } from "@/components/ui/form-error";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { clientFetch, ApiClientError } from "@/lib/api-client";
import type { RegisterRequest } from "@aida/shared";

function ageFromBirthdate(birthdate: string): number | null {
  if (!birthdate) return null;
  const dob = new Date(birthdate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [birthdate, setBirthdate] = useState("");
  const [parentalConsentGiven, setParentalConsentGiven] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const age = ageFromBirthdate(birthdate);
  const underThirteen = age !== null && age < 13;
  const canContinueStepOne = age !== null && (!underThirteen || parentalConsentGiven);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await clientFetch<{ ok: true }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          birthdate: new Date(birthdate).toISOString(),
          parentalConsentGiven,
        } satisfies RegisterRequest),
      });
      router.push("/onboarding/learning-style");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg shadow-neutral-900/5 dark:shadow-none">
      <CardHeader>
        <div className="mb-1 flex gap-1.5" aria-hidden>
          <span className={`h-1 w-8 rounded-full ${step === 1 ? "bg-brand-600" : "bg-brand-200 dark:bg-brand-900"}`} />
          <span className={`h-1 w-8 rounded-full ${step === 2 ? "bg-brand-600" : "bg-brand-200 dark:bg-brand-900"}`} />
        </div>
        <CardTitle>{step === 1 ? "How old are you?" : "Create your account"}</CardTitle>
        <CardDescription>
          {step === 1
            ? "We ask this first, it shapes how your account is set up, before anything else."
            : "Almost there, just an email and password."}
        </CardDescription>
      </CardHeader>

      {step === 1 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
        >
          <CardContent className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="birthdate">Date of birth</Label>
              <DateOfBirthInput id="birthdate" onChange={setBirthdate} />
            </div>

            {underThirteen && (
              <div className="flex items-start gap-2 rounded-lg border border-review-600/30 bg-review-100 p-3 text-sm text-review-900 dark:bg-review-900/20 dark:text-review-100">
                <input
                  id="consent"
                  type="checkbox"
                  className="mt-0.5"
                  checked={parentalConsentGiven}
                  onChange={(e) => setParentalConsentGiven(e.target.checked)}
                />
                <label htmlFor="consent">
                  A parent or guardian has reviewed and consented to this account, as required for
                  users under 13.
                </label>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={!canContinueStepOne}>
              Continue
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      ) : (
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            {error && <FormError message={error} />}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back
            </button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
