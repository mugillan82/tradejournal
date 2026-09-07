/**
 * AppShell
 *
 * The authenticated application layout wrapper.
 * Provides the sidebar (desktop) + topbar structure used by all
 * protected application routes.
 *
 * - Sidebar is visible on large viewports (≥1024px).
 * - Mobile navigation is handled by MobileSidebar in the Topbar.
 * - Topbar is always visible and includes the user menu.
 */

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  /** Authenticated user display name (shown in sidebar footer and user menu). */
  userDisplayName?: string | null;
  /** Authenticated user email. */
  userEmail: string;
  /** Optional page title shown in the topbar. */
  pageTitle?: React.ReactNode;
  /** Page content rendered in the main area. */
  children: React.ReactNode;
}

export function AppShell({
  userDisplayName,
  userEmail,
  pageTitle,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Desktop sidebar — hidden on < lg */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar userDisplayName={userDisplayName ?? undefined} />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          pageTitle={pageTitle}
        />

        {/* Scrollable page content */}
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
