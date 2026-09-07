/**
 * Prisma Client Singleton
 *
 * Prevents multiple PrismaClient instances during Next.js development
 * hot reload by caching the client in the global scope.
 *
 * In production, the global is also used to persist the client
 * across serverless function invocations.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma client instance.
 * Uses global cache to prevent multiple instances during hot reload.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
