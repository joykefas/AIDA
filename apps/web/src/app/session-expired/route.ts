import { NextResponse } from "next/server";

/**
 * Unconditionally clears both auth cookies and sends the browser to /login.
 * Deliberately outside proxy.ts's matched routes, so nothing here can ever
 * be caught in the redirect ping-pong that happens when a page tries to
 * bounce to /login while the browser still holds a cookie proxy.ts reads as
 * "logged in" — this route always wins and always breaks that loop.
 */
export async function GET(request: Request) {
  const url = new URL("/login", request.url);
  const res = NextResponse.redirect(url);
  res.cookies.delete("aida_access");
  res.cookies.delete("aida_refresh");
  return res;
}
