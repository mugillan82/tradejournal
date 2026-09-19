import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { ShuffleQuotes } from "@/components/ui/shuffle-quotes";
import { StarBorder } from "@/components/ui/star-border";

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

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
          <StarBorder
            as={Link}
            href="/sign-in"
            color="#d946ef"
            speed="6.5s"
            thickness={2.5}
            backgroundColor="#0f0f17"
            textColor="#ffffff"
            borderColor="rgba(217, 70, 239, 0.3)"
            className="hover:scale-105 transition-transform duration-200 shadow-lg shadow-purple-950/40"
          >
            Sign in
          </StarBorder>
          <StarBorder
            as={Link}
            href="/sign-up"
            color="#d946ef"
            speed="6.5s"
            thickness={2.5}
            backgroundColor="#09090b"
            textColor="#f1f5f9"
            borderColor="rgba(255, 255, 255, 0.14)"
            className="hover:scale-105 transition-transform duration-200 shadow-lg shadow-slate-950/40"
          >
            Create account
          </StarBorder>
        </div>
      </div>
    </main>
  );
}
