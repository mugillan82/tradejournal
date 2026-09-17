/**
 * Topbar — Stitch Obsidian Orbit Edition
 *
 * Application top bar rendered inside the authenticated AppShell.
 * Features:
 * - Mobile navigation trigger
 * - Quick Search & Command trigger (⌘K)
 * - Market telemetry / session status pill
 * - Quick Action "+ Log Trade" / "AI Import" button
 * - User profile menu
 */

import Link from "next/link";
import { MobileSidebar } from "./mobile-sidebar";
import { UserMenu } from "./user-menu";
import { Search, Plus, Sparkles } from "@/components/icons";

interface TopbarProps {
  /** Display name for the user menu */
  userDisplayName?: string | null;
  /** Email for the user menu */
  userEmail: string;
  /** Optional page title or context to render in the topbar */
  pageTitle?: React.ReactNode;
  /** Handler to open global command palette */
  onOpenCommandPalette?: () => void;
}

export function Topbar({
  userDisplayName,
  userEmail,
  pageTitle,
  onOpenCommandPalette,
}: TopbarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 sm:px-6 border-b border-white/[0.07] bg-[#07050b]/85 backdrop-blur-md sticky top-0 z-30 select-none">
      {/* Left: Mobile trigger + page context + Command trigger */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger — hidden at lg+ (sidebar visible) */}
        <MobileSidebar
          userDisplayName={userDisplayName ?? undefined}
          onOpenCommandPalette={onOpenCommandPalette}
        />

        {/* Page Context Title */}
        {pageTitle ? (
          <h1 className="text-sm font-semibold text-slate-200 truncate">
            {pageTitle}
          </h1>
        ) : (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Terminal
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-medium text-purple-400">
              Active Session
            </span>
          </div>
        )}

        {/* Global Command Search Pill Trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center gap-2 ml-2 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/[0.08] hover:border-purple-500/30 text-xs text-slate-400 hover:text-slate-200 transition-all group focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500"
          >
            <Search
              size={13}
              className="text-slate-500 group-hover:text-purple-400 transition-colors"
            />
            <span className="text-slate-400 group-hover:text-slate-200">
              Quick Search...
            </span>
            <kbd className="font-mono text-[10px] text-slate-500 px-1 py-0.2 rounded bg-slate-950 border border-slate-800">
              ⌘K
            </kbd>
          </button>
        )}
      </div>

      {/* Right: Market Session Telemetry + Quick Actions + User Menu */}
      <div className="flex items-center gap-2.5">
        {/* Orbit Market Telemetry Pill */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-white/[0.05] text-[11px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-slate-400">MARKETS:</span>
          <span className="text-purple-400 font-semibold">ACTIVE</span>
        </div>

        {/* AI Smart Import Quick Shortcut */}
        <Link
          href="/import/smart"
          title="Smart Import via AI"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 border border-purple-500/25 text-xs font-medium transition-colors"
        >
          <Sparkles size={13} className="text-purple-400" />
          <span className="hidden md:inline">Smart</span> Import
        </Link>

        {/* New Trade Primary Action */}
        <Link
          href="/trades/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-purple-500 to-violet-500 hover:from-purple-500 hover:to-violet-400 text-white text-xs font-semibold shadow-sm shadow-purple-950/60 hover:shadow-purple-500/25 transition-all"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Log Trade</span>
        </Link>

        <div className="h-4 w-[1px] bg-white/[0.08] mx-0.5" />

        {/* User Identity & Dropdown */}
        <UserMenu displayName={userDisplayName} email={userEmail} />
      </div>
    </header>
  );
}
