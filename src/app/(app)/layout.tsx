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
import { getUserPreferences } from "@/lib/trading/settings/service";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative server-side authentication check.
  const user = await getServerUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Load initial preferences server-side for zero-flicker rendering
  let initialPreferences = null;
  try {
    initialPreferences = await getUserPreferences(user.id);
  } catch {
    // Graceful fallback to client fetch if DB read fails
  }

  // Build a non-sensitive display label for the sidebar/user menu.
  // Prefer preference display name, then auth name, then local-part of email.
  const displayName =
    initialPreferences?.displayName?.trim() ||
    user.name?.trim() ||
    user.email.split("@")[0] ||
    "User";

  return (
    <SettingsProvider initialPreferences={initialPreferences}>
      <AppShell userDisplayName={displayName} userEmail={user.email}>
        {children}
      </AppShell>
    </SettingsProvider>
  );
}

