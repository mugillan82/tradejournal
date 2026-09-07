/**
 * Database Environment Configuration
 *
 * Validates and provides type-safe access to database-related
 * environment variables.
 */

import "server-only";

/**
 * Validates the DATABASE_URL environment variable.
 * Throws a descriptive error if missing or invalid.
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url || url.trim() === "") {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Please configure your .env file with a valid PostgreSQL connection string.",
    );
  }

  // Basic format check
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error(
      "DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://",
    );
  }

  return url;
}

/**
 * Validated database configuration.
 */
export const databaseConfig = {
  get url(): string {
    return getDatabaseUrl();
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? "development";
  },
} as const;
