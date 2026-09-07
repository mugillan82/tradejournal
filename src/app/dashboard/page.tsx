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
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function DashboardPage() {
  // Defense-in-depth: redirect if session is missing (proxy already handles this)
  const user = await getServerUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Minimal nav bar */}
      <header className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
        <span className="text-sm font-medium text-slate-300">
          TradeJournal
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{user.email}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
                aria-hidden="true"
              />
              Authenticated
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-50">
              Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Welcome back,{" "}
              <span className="text-slate-200">{user.name ?? user.email}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left text-xs text-slate-500 font-mono space-y-1.5">
            <div>
              <span className="text-slate-600">user.id</span>{" "}
              <span className="text-slate-400">{user.id}</span>
            </div>
            <div>
              <span className="text-slate-600">user.email</span>{" "}
              <span className="text-slate-400">{user.email}</span>
            </div>
            <div>
              <span className="text-slate-600">user.name</span>{" "}
              <span className="text-slate-400">{user.name ?? "—"}</span>
            </div>
            <div>
              <span className="text-slate-600">user.emailVerified</span>{" "}
              <span className="text-slate-400">
                {String(user.emailVerified)}
              </span>
            </div>
          </div>

          <div className="pt-4">
            <SignOutButton />
          </div>

          <p className="text-xs text-slate-600 pt-2">
            Dashboard UI will be built in future steps.
          </p>
        </div>
      </div>
    </main>
  );
}
