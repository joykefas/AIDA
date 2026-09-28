"use client";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function rawFetch(path: string, init?: RequestInit) {
  const isFormData = init?.body instanceof FormData;
  return fetch(`/api${path}`, {
    ...init,
    headers: {
      // Let the browser set the multipart boundary itself for FormData bodies.
      ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "include",
  });
}

/** Turns a failed response into a message that's safe to show a user directly:
 * extracts the API's own `message` field (our exception filters always write
 * intentional, human-readable text there — validation errors, "account
 * already exists", etc.) instead of dumping the raw `{"message":...,
 * "error":...,"statusCode":...}` JSON body at them. Only falls back to a
 * generic line when the body genuinely isn't parseable JSON or has no
 * message field at all. */
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.clone().json();
    const message = (data as { message?: unknown } | null)?.message;
    if (Array.isArray(message) && message.every((m) => typeof m === "string") && message.length > 0) {
      return message.join(". ");
    }
    if (typeof message === "string" && message.trim()) return message;
  } catch {
    // Not JSON, or shape didn't match — fall through to the generic message.
  }
  return res.status >= 500 ? "Something went wrong on our end. Try again in a moment." : "Something went wrong. Try again.";
}

let refreshInFlight: Promise<boolean> | null = null;
let isRefreshingPage = false;

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = rawFetch("/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function isAuthPage(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return (
    p === "/login" ||
    p === "/register" ||
    p === "/admin/login" ||
    p === "/session-expired" ||
    p.startsWith("/reset-password") ||
    p.startsWith("/forgot-password")
  );
}

function refreshPage() {
  if (typeof window === "undefined") return;
  try {
    window.location.reload();
  } catch {
    window.location.href = window.location.href;
  }
}

/** Client Component fetch — goes through the /api/:path* rewrite in next.config.ts so
 * the browser sees a same-origin request and the API's cookies attach normally.
 * On a 401 (expired 15-minute access token) it attempts one silent refresh via
 * the 30-day refresh cookie before giving up. If refreshing the token fails or the
 * retried request also returns 401 unauthorized, it refreshes the page so the
 * proxy middleware automatically redirects the user to login. */
export async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await rawFetch(path, init);

  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(path, init);
    }

    if (!refreshed || res.status === 401) {
      if (!isRefreshingPage && !isAuthPage()) {
        isRefreshingPage = true;
        refreshPage();
      }
      return new Promise<never>(() => {});
    }
  }

  if (!res.ok) {
    throw new ApiClientError(res.status, await readErrorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
