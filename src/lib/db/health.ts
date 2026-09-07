/**
 * Database Health Check
 *
 * Minimal utility to verify PostgreSQL connectivity.
 * Returns timing, database version, and connection status.
 */

import "server-only";

import { prisma } from "./client";

export type HealthCheckResult = {
  status: "healthy" | "unhealthy";
  connected: boolean;
  latencyMs: number;
  database: string;
  version: string | null;
  error?: string;
  timestamp: string;
};

/**
 * Executes a lightweight query against the database to verify connectivity.
 * Returns a structured result for monitoring and diagnostics.
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const start = performance.now();
  const timestamp = new Date().toISOString();

  try {
    // Simple query: SELECT 1
    await prisma.$queryRaw`SELECT 1`;

    // Fetch database version
    const versionResult = await prisma.$queryRaw<{ version: string }[]>`
      SELECT version() AS version
    `;

    const latencyMs = Math.round(performance.now() - start);
    const version = versionResult[0]?.version ?? null;

    return {
      status: "healthy",
      connected: true,
      latencyMs,
      database: "PostgreSQL",
      version,
      timestamp,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      status: "unhealthy",
      connected: false,
      latencyMs,
      database: "PostgreSQL",
      version: null,
      error: errorMessage,
      timestamp,
    };
  }
}
