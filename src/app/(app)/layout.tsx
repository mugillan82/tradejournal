/**
 * Authenticated Application Layout
 *
 * Server-side layout for all protected application routes.
 * Performs the authoritative authentication check here so that
 * the application shell and its children never need to worry
 * about an anonymous user.
 *
 * The proxy.ts layer also blocks unauthenticated requests at the
 * edge, but the layout is the in-process source of truth — every
 * page nested under this layout can safely assume `user` is real.
 *
 * Auth UI and public marketing pages do NOT render through this
 * layout — they live outside the (app) route group.
 */

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative server-side authentication check.
  // The proxy layer already blocks unauthenticated requests at the
  // edge, but the layout is the in-process source of truth — every
  // page nested under this layout can safely assume `user` is real.
  // We call requireServerUser's strategy (getServerUser + redirect)
  // here so that any race or proxy miss redirects cleanly.
  const user = await getServerUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Build a non-sensitive display label for the sidebar/user menu.
  // Prefer name; fall back to local-part of email.
  const displayName = user.name?.trim() || user.email.split("@")[0] || "User";

  return (
    <AppShell userDisplayName={displayName} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
