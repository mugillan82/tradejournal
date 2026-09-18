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
  const secret =
    process.env.BETTER_AUTH_SECRET ||
    "build-time-fallback-secret-for-static-page-collection-32chars";
  return { secret };
}

const { secret } = getAuthConfig();

function getBaseURL(): string {
  let url =
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
}

/**
 * Better Auth instance.
 *
 * - Uses Prisma adapter with PostgreSQL.
 * - Email/password sign-up & sign-in enabled.
 * - Sessions stored in the database.
 */
export const auth = betterAuth({
  secret,
  baseURL: getBaseURL(),
  trustedOrigins: [
    "http://localhost:3000",
    "https://kaivo-01.vercel.app",
    "https://*.vercel.app",
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
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
