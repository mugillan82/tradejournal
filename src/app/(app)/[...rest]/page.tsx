/**
 * Unimplemented destination placeholder
 *
 * Rendered when a user navigates to a known navigation destination
 * that hasn't been built yet. Shows a polite coming-soon message
 * with a link back to the dashboard.
 *
 * Only rendered for paths that appear in the navigation configuration.
 * Unknown paths still return 404 via Next.js default behavior.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { isKnownDestination } from "@/lib/navigation";
import { navigation } from "@/lib/navigation";

interface PlaceholderPageProps {
  params: Promise<{ rest: string[] }>;
}

export default async function PlaceholderPage({ params }: PlaceholderPageProps) {
  const { rest } = await params;
  const pathname = `/${rest.join("/")}`;

  // Only render the placeholder for known navigation destinations.
  // Unknown paths redirect to 404 via the Next.js not-found mechanism.
  if (!isKnownDestination(pathname)) {
    redirect("/dashboard");
  }

  // Find the label for this destination
  const label = navigation
    .flatMap((s) => s.items)
    .find((item) => item.href.toLowerCase() === pathname.toLowerCase())?.label ?? pathname;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-2xl mx-auto">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        {/* Icon + header */}
        <div className="px-6 py-8 text-center space-y-3">
          <div
            className="mx-auto h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-600"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-200">{label}</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            This feature is on our roadmap. Come back soon — it&apos;s
            being built with care.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors duration-150"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
