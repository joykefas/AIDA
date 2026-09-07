"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { clientFetch } from "@/lib/api-client";
import { cn } from "cn";

export function LogoutButton({ className }: { className?: string }) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await clientFetch("/auth/logout", { method: "POST" });
    } finally {
      // A real navigation, not router.push() — the logout response clears
      // the session cookies, and the rest of the app's auth-transition
      // points (see (app)/error.tsx) all use a full reload for this reason.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      aria-label="Log out"
      title="Log out"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-danger-600 disabled:opacity-50",
        className,
      )}
    >
      <LogOut className="size-4" />
    </button>
  );
}
