/**
 * /dashboard — Protected page (proof-of-concept)
 *
 * Intentionally minimal. The application shell now provides the
 * sidebar/topbar/navigation. This page exists to prove:
 *   - The application shell renders
 *   - Server-side authentication works (requireServerUser in (app) layout)
 *   - Navigation works
 *   - Sign-out works
 *
 * No metrics, cards, or charts are built here — those will be
 * added in future steps.
 */

import { getServerUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  // The (app) layout already guarantees a real user, but we read
  // it here so we can display a welcome line that doesn't include
  // sensitive fields.
  const user = await getServerUser();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto">
      <div className="space-y-6">
        {/* Page header */}
        <header className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
              aria-hidden="true"
            />
            Authenticated
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-50">
            Dashboard
          </h2>
          <p className="text-sm text-slate-400">
            Welcome back,{" "}
            <span className="text-slate-200">
              {user?.name ?? user?.email?.split("@")[0] ?? "trader"}
            </span>
            .
          </p>
        </header>

        {/* Proof-of-concept panel */}
        <section
          aria-labelledby="shell-proof-heading"
          className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
        >
          <header className="px-5 py-3 border-b border-slate-800">
            <h3
              id="shell-proof-heading"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Application shell proof
            </h3>
          </header>
          <div className="p-5 space-y-3 text-sm text-slate-400">
            <p>
              This is the application shell. Sidebar navigation, topbar
              user menu, and sign-out are wired up below.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                Server-side session validation:{" "}
                <span className="text-slate-300">passed</span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                Application layout (sidebar + topbar):{" "}
                <span className="text-slate-300">rendering</span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                Navigation entries:{" "}
                <span className="text-slate-300">see sidebar</span>
              </li>
              <li className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                Sign out:{" "}
                <span className="text-slate-300">
                  use the top-right user menu
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
