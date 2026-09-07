/**
 * Database Module — Public API
 *
 * Re-exports the Prisma client and database configuration
 * for application use.
 */

export { prisma } from "./client";
export { databaseConfig } from "./env";
export { checkDatabaseHealth, type HealthCheckResult } from "./health";
