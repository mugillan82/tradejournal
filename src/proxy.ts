/**
 * Next.js Proxy — Authentication Protection Layer
 *
 * Runs before every route in the application.
 * - Public routes: /, /sign-in, /sign-up, /api/auth/*
 * - Protected routes: /dashboard/* (and all other app routes)
 *
 * Strategy: read session cookie (no DB query) for lightweight checks.
 * Authoritative session validation happens inside protected pages/actions.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Cookie prefix configured in auth config (advanced.cookiePrefix).
 * Must match the value in src/lib/auth/config.ts.
 */
const COOKIE_PREFIX = "tradejournal";

/**
 * Extracts the session token value from the request cookie header.
 * Returns null if not present (user is unauthenticated).
 *
 * NOTE: This only checks for cookie existence — it does NOT validate
 * the session. Protected pages/actions MUST call requireServerUserId()
 * for authoritative validation.
 */
function getSessionToken(request: NextRequest): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  // Match "tradejournal-session_token=<value>" or "tradejournal.session_token=<value>"
  const match = cookieHeader.match(
    new RegExp(
      `(?:^|[;\\s])${COOKIE_PREFIX}[-_.]?session_token=([^;\\s]*)`,
      "i",
    ),
  );
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

/**
 * Returns true if the request path is a static asset that should be skipped.
 */
function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

/**
 * Returns true if the request path is an auth page that authenticated
 * users should be redirected away from.
 */
function isAuthPage(pathname: string): boolean {
  return pathname === "/sign-in" || pathname === "/sign-up";
}

/**
 * Returns true if the request path is a public auth API endpoint.
 */
function isAuthApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/auth");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and Next.js internals — pass through
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Auth API endpoints (sign-in, sign-up, sign-out, get-session, etc.)
  // — pass through, Better Auth handles these
  if (isAuthApiPath(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = getSessionToken(request);

  // Auth page: if unauthenticated, allow access. If authenticated, redirect to /dashboard.
  if (isAuthPage(pathname)) {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Home page: allow access regardless of auth status
  if (pathname === "/") {
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!sessionToken) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated user on a protected route: pass through.
  // Authoritative session validation happens in the page itself.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - api (API routes — handled by route handlers)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
