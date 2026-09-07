/**
 * Better Auth Configuration
 *
 * Server-side authentication configuration for TradeJournal.
 * Defines providers, plugins, and database integration.
 */

import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db/client";

/**
 * Validates that required auth environment variables are set.
 */
function getAuthConfig() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET environment variable is not set. " +
        "Run: openssl rand -base64 32",
    );
  }
  return { secret };
}

const { secret } = getAuthConfig();

/**
 * Better Auth instance.
 *
 * - Uses Prisma adapter with PostgreSQL.
 * - Email/password sign-up & sign-in enabled.
 * - Sessions stored in the database.
 */
export const auth = betterAuth({
  secret,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    cookiePrefix: "tradejournal",
  },
});

/**
 * Inferred types from Better Auth configuration.
 * Use these for type-safe access to user/session data.
 */
export type Auth = typeof auth;
export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
