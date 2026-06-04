import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Production Middleware
 *
 * ONLY checks for authentication cookie.
 * Does NOT fetch, does NOT call MSAL, does NOT decode tokens.
 *
 * Rules:
 * - Public paths: allow all
 * - Auth routes (/auth/*): allow all (they handle their own flow)
 * - Protected routes: require mynsa_access_token cookie
 */

const PUBLIC_PATHS = [
  "/",
  "/favicon.ico",
  "/_next/",
  "/_static/",
  "/robots.txt",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

function withNoIndex(response: NextResponse) {
  response.headers.set(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet",
  );
  return response;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths - no auth required
  if (isPublicPath(pathname)) {
    return withNoIndex(NextResponse.next());
  }

  // Auth routes - let them handle their own flow
  if (pathname.startsWith("/auth")) {
    return withNoIndex(NextResponse.next());
  }

  // Protected routes - require cookie
  const hasToken = req.cookies.has("mynsa_access_token");

  if (!hasToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return withNoIndex(NextResponse.redirect(url));
  }

  return withNoIndex(NextResponse.next());
}

export const config = {
  // match all routes (we handle internal exceptions in code)
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
