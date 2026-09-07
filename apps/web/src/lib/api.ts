import "server-only";
import { cookies } from "next/headers";
import { ApiError } from "./api-error";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:6001";

export { ApiError };

/** Mirrors lib/api-client.ts's readErrorMessage: extracts the API's own
 * `message` field (our exception filters always write intentional,
 * human-readable text there) instead of leaking the raw JSON error envelope
 * to whatever renders the thrown error. Only falls back to a generic line
 * when the body genuinely isn't parseable JSON or has no message field. */
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

/** Server Component / Route Handler fetch — talks to the API directly, forwarding the incoming request's cookies. */
export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      Cookie: cookieHeader,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
