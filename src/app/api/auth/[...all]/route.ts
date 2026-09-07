/**
 * Better Auth API Route
 *
 * Handles all Better Auth HTTP requests (sign-in, sign-up, sign-out,
 * session retrieval, etc.) via Next.js App Router.
 */

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/config";

export const { POST, GET } = toNextJsHandler(auth);
