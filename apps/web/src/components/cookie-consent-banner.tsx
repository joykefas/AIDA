"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { clientFetch } from "@/lib/api-client";
import type { UserProfile } from "@aida/shared";

const CONSENT_KEY = "aida_cookie_consent";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check localStorage first
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // Check if user has consent stored on backend
      clientFetch<UserProfile>("/users/me")
        .then((user) => {
          if (user?.cookieConsent) {
            localStorage.setItem(CONSENT_KEY, user.cookieConsent);
            setIsVisible(false);
          } else {
            setIsVisible(true);
          }
        })
        .catch(() => {
          // Unauthenticated or network error — show banner after brief delay
          const timer = setTimeout(() => setIsVisible(true), 800);
          return () => clearTimeout(timer);
        });
    }
  }, []);

  const saveConsent = (consent: "accepted" | "essential_only") => {
    localStorage.setItem(CONSENT_KEY, consent);
    if (consent === "essential_only" && typeof window !== "undefined") {
      (window as unknown as Record<string, boolean>)["ga-disable-analytics"] = true;
    }
    setIsVisible(false);

    // Persist to backend if authenticated
    clientFetch("/users/me/cookie-consent", {
      method: "PATCH",
      body: JSON.stringify({ consent }),
    }).catch(() => {
      // Ignore error for guest / unauthenticated visitors
    });
  };

  const handleAccept = () => saveConsent("accepted");
  const handleDecline = () => saveConsent("essential_only");

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 sm:bottom-6 sm:left-auto sm:right-6"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-md dark:bg-card/90 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">Cookie & Privacy Preferences</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and optional anonymized telemetry to improve our AI tutor. Minor accounts are automatically opted out.{" "}
              <Link href="/privacy" className="text-primary underline hover:opacity-80">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={handleDecline}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Essential only
          </button>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 shadow-xs"
          >
            Accept all
          </button>
          <button
            onClick={handleDecline}
            aria-label="Close cookie banner"
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
