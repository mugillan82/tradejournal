/**
 * Topbar
 *
 * Application top bar rendered inside the authenticated AppShell.
 * Contains:
 * - Mobile menu trigger (hidden on desktop)
 * - Page context title (optional slot)
 * - UserMenu (sign-out)
 */

import { MobileSidebar } from "./mobile-sidebar";
import { UserMenu } from "./user-menu";

interface TopbarProps {
  /** Display name for the user menu */
  userDisplayName?: string | null;
  /** Email for the user menu */
  userEmail: string;
  /** Optional page title or context to render in the topbar */
  pageTitle?: React.ReactNode;
}

export function Topbar({
  userDisplayName,
  userEmail,
  pageTitle,
}: TopbarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-30">
      {/* Left: mobile trigger + optional page context */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger — hidden at lg+ (sidebar visible) */}
        <MobileSidebar userDisplayName={userDisplayName ?? undefined} />

        {pageTitle && (
          <h1 className="text-sm font-medium text-slate-300 truncate">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right: user menu */}
      <div className="flex items-center gap-1">
        <UserMenu displayName={userDisplayName} email={userEmail} />
      </div>
    </header>
  );
}
