"use client";

import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";

/**
 * Catches serverFetch failures from every page in this route group — most
 * pages (Home, Library, Review, Progress) call serverFetch directly with no
 * try/catch of their own, only the layout guards its one call. A 401 here
 * means the session genuinely died between proxy.ts's check and this
 * request; route through /session-expired so cookies actually get cleared
 * instead of bouncing back into the same redirect loop proxy.ts prevents.
 */
export default function AppError({ error }: { error: Error & { digest?: string } }) {
  const isExpiredSession = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    // A real browser navigation, not router.push() — /session-expired is a
    // Route Handler that clears cookies via a Set-Cookie response header,
    // which client-side RSC navigation wouldn't apply the same way.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (isExpiredSession) window.location.href = "/session-expired";
  }, [isExpiredSession]);

  if (isExpiredSession) return null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="font-heading text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        That didn&apos;t load correctly. Try again, and if it keeps happening, come back in a bit.
      </p>
      <Button onClick={() => window.location.reload()}>
        <RefreshCcw className="size-4" />
        Reload
      </Button>
    </div>
  );
}
