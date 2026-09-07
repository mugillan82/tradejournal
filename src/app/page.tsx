import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { BrandMark } from "@/components/brand/brand-mark";

/**
 * / (Home)
 *
 * Marketing-style landing surface for TradeJournal.
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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full space-y-8 text-center">
        <BrandMark size="lg" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-50">
            TradeJournal
          </h1>
          <p className="text-sm text-slate-400">
            A modern trading log and analytics platform. Log every trade,
            review your edge, and improve with data.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors duration-150"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors duration-150"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
