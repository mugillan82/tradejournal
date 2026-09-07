/**
 * Auth Module — Public API
 *
 * Re-exports the auth configuration, client, and server-side
 * session utilities for application use.
 *
 * NOTE: Do NOT import this barrel from client components.
 * Import from "./client" on the client and "./config" or "./session" on the server.
 */

export { auth, type Auth, type Session } from "./config";
export {
  getServerSession,
  getServerUser,
  getServerUserId,
  requireServerUser,
  requireServerUserId,
} from "./session";
