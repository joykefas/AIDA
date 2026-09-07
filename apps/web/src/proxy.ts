import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "aida_access";
const REFRESH_COOKIE = "aida_refresh";
const AUTH_ROUTES = ["/login", "/register"];
const PROTECTED_PREFIXES = ["/home", "/library", "/tutor", "/review", "/progress", "/onboarding"];
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:6001";

/**
 * Server Components can't set cookies mid-render, so a plain page load (not
 * a client-side navigation) with an expired 15-minute access token had no
 * way to refresh it — the layout would catch the resulting 401 and redirect
 * to /login, but the 30-day refresh cookie was still sitting in the browser,
 * so this proxy would immediately bounce the request straight back to
 * /home. That ping-pong is what ERR_TOO_MANY_REDIRECTS was.
 *
 * Fixed by refreshing here — but a Set-Cookie on the *response* only takes
 * effect on the browser's *next* request. The render that happens as part
 * of *this* request (the layout's serverFetch) still reads the original,
 * stale request cookies via next/headers, so it 401s anyway unless the
 * forwarded *request* headers are patched too. So a successful refresh
 * rewrites the outgoing request's Cookie header (via NextResponse.next({
 * request })) as well as setting the response cookies for the browser.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  const hasRefresh = req.cookies.has(REFRESH_COOKIE);
  const hasAccess = req.cookies.has(ACCESS_COOKIE);

  if (isProtected) {
    if (!hasRefresh) {
      return redirectToLogin(req, pathname);
    }
    if (!hasAccess) {
      const refreshed = await tryRefresh(req);
      if (refreshed) return refreshed;
      return redirectToLogin(req, pathname);
    }
    return NextResponse.next();
  }

  if (isAuthRoute && hasRefresh) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest, from: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", from);
  const res = NextResponse.redirect(url);
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}

/** name=value pairs, ignoring attributes (Path, Max-Age, etc.) — only what's needed to rebuild a request Cookie header. */
function parseSetCookieNameValue(setCookie: string): { name: string; value: string } | null {
  const first = setCookie.split(";")[0];
  const eq = first.indexOf("=");
  if (eq === -1) return null;
  return { name: first.slice(0, eq).trim(), value: first.slice(eq + 1).trim() };
}

/** Calls the API's refresh endpoint and, on success, both patches the forwarded request's cookies (so this render sees the new session) and sets the response cookies (so the browser does too). */
async function tryRefresh(req: NextRequest): Promise<NextResponse | null> {
  try {
    const apiRes = await fetch(`${API_ORIGIN}/auth/refresh`, {
      method: "POST",
      headers: { Cookie: req.headers.get("cookie") ?? "" },
    });
    if (!apiRes.ok) return null;

    const setCookies =
      typeof apiRes.headers.getSetCookie === "function" ? apiRes.headers.getSetCookie() : [];
    if (setCookies.length === 0) return null;

    const parsed = setCookies.map(parseSetCookieNameValue).filter((c) => c !== null);
    if (parsed.length === 0) return null;

    const forwardedCookies = new Map(
      (req.cookies.getAll() ?? []).map((c) => [c.name, c.value] as const),
    );
    for (const { name, value } of parsed) forwardedCookies.set(name, value);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(
      "cookie",
      Array.from(forwardedCookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    );

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    for (const cookie of setCookies) res.headers.append("set-cookie", cookie);
    return res;
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/home/:path*", "/library/:path*", "/tutor/:path*", "/review/:path*", "/progress/:path*", "/onboarding/:path*", "/login", "/register"],
};
