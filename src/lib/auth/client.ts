/**
 * Better Auth Client (Browser-safe)
 *
 * Typed client helper for authentication from the browser.
 * Use this in client components and client-side code.
 */

import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client instance.
 * Targets the default `/api/auth/*` endpoint.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
});

/**
 * Convenient exports for common auth operations.
 */
export const { signIn, signUp, signOut, useSession, getSession } = authClient;
