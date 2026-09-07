/**
 * /dashboard — Protected page
 *
 * This page requires authentication. The proxy layer redirects
 * unauthenticated users to /sign-in before they reach this page.
 * For authoritative session validation, this page uses
 * requireServerUserId() at the server level.
 *
 * NOTE: This is a minimal proof-of-concept page. The real dashboard
 * UI will be built in future steps.
 */

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  // Defense-in-depth: redirect if session is missing (proxy already handles this)
  const user = await getServerUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-400">
          Dashboard
        </h1>
        <p className="text-sm text-slate-400">
          Welcome back, {user.name ?? user.email}
        </p>
        <div className="text-xs text-slate-500">
          User ID: {user.id}
          <br />
          Email: {user.email}
          <br />
          Verified: {user.emailVerified ? "Yes" : "No"}
        </div>
      </div>
    </main>
  );
}
