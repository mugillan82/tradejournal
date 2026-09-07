/**
 * Server-side Session Utilities
 *
 * Provides reusable helpers for retrieving and asserting
 * authenticated sessions in Server Components, Server Actions,
 * and Route Handlers.
 *
 * Per-user data isolation is enforced here: every protected
 * resource should use the returned `userId` to scope queries.
 */

import "server-only";

import { headers } from "next/headers";
import { auth } from "./config";

/**
 * Returns the active session for the current request, or null
 * if the user is not authenticated.
 */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Returns the authenticated user, or null if no session exists.
 * Use this when the caller may be anonymous.
 */
export async function getServerUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

/**
 * Returns the authenticated user ID, or null if no session.
 * Use this in places that only need a scalar scope value.
 */
export async function getServerUserId(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.id ?? null;
}

/**
 * Returns the authenticated user, throwing if not present.
 * Use this in code paths that require an authenticated user.
 */
export async function requireServerUser() {
  const user = await getServerUser();
  if (!user) {
    throw new Error("Unauthorized: authentication required");
  }
  return user;
}

/**
 * Returns the authenticated user ID, throwing if not present.
 * Use this in protected API routes or server actions.
 */
export async function requireServerUserId(): Promise<string> {
  const userId = await getServerUserId();
  if (!userId) {
    throw new Error("Unauthorized: authentication required");
  }
  return userId;
}
