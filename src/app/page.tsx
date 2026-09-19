import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { ShuffleQuotes } from "@/components/ui/shuffle-quotes";

/**
 * / (Home)
 *
 * Marketing-style landing surface for KAIVO.
 * If the visitor is already authenticated, route them straight to
 * the dashboard. Otherwise, give them an entry point to sign in or
 * create an account.
 */
export default async function HomePage() {
  const user = await getServerUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-600/[0.08] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[250px] bg-violet-600/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="max-w-md w-full space-y-8 text-center relative z-10">
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-50 drop-shadow-[0_0_35px_rgba(168,85,247,0.25)]">
            KAI<span className="text-purple-400">VO</span>
          </h1>
          <ShuffleQuotes />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-all duration-150 shadow-lg shadow-purple-900/30 hover:shadow-purple-700/40"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/80 px-6 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all duration-150"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
