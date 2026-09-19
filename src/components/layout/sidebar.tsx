/**
 * Sidebar Navigation — Stitch Obsidian Orbit Edition
 *
 * Fixed desktop sidebar for the authenticated application shell.
 * Features Obsidian glass aesthetics, orbital active beacons,
 * smart badges, and real-time terminal telemetry status.
 */

"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { navigation } from "@/lib/navigation";
import { BranchedMenu } from "@/components/layout/branched-menu";

interface SidebarProps {
  /** Shown at the bottom of the sidebar */
  userDisplayName?: string;
  onOpenCommandPalette?: () => void;
}

const SIDEBAR_WIDTH = "w-60";

export function Sidebar({ userDisplayName, onOpenCommandPalette }: SidebarProps) {
  return (
    <aside
      className={`${SIDEBAR_WIDTH} flex flex-col h-full border-r border-white/[0.07] bg-[#07050b] relative z-20 select-none overflow-hidden`}
    >
      {/* Ambient Top Light Beam */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-500/[0.06] to-transparent pointer-events-none" />

      {/* Logo Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.07] flex-shrink-0 bg-[#07050b]">
        <Link href="/dashboard" className="focus:outline-none">
          <BrandMark size="sm" showWordmark={true} />
        </Link>
      </div>

      {/* Quick Launcher Hint Trigger */}
      {onOpenCommandPalette && (
        <div className="px-3 pt-3 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-800/80 border border-white/[0.06] hover:border-purple-500/30 text-xs text-slate-400 hover:text-slate-200 transition-all group"
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-400/60 group-hover:bg-purple-400 transition-colors" />
              Quick Command
            </span>
            <kbd className="font-mono text-[10px] text-slate-500 group-hover:text-slate-300 px-1 py-0.5 rounded bg-slate-950 border border-slate-800">
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* Navigation Links — Branched Tree Menu */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 overscroll-contain">
        <BranchedMenu items={navigation} width={220} />
      </div>

      {/* Obsidian Orbit Telemetry & User Footer */}
      <div className="flex-shrink-0 border-t border-white/[0.07] bg-[#090710] px-3.5 py-3">
        {/* Orbital System Telemetry Status */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-orbit-radar absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
            </span>
            <span className="text-[10px] font-mono font-medium tracking-wider uppercase text-purple-400/90">
              Orbit Live Sync
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-500 uppercase">
            v2.5
          </span>
        </div>

        {/* User Identity */}
        {userDisplayName && (
          <div className="flex items-center gap-2 px-1 py-1 rounded bg-slate-900/50 border border-white/[0.04]">
            <div className="h-5 w-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">
              {userDisplayName.slice(0, 1).toUpperCase()}
            </div>
            <p
              className="truncate text-xs text-slate-300 font-medium"
              title={userDisplayName}
            >
              {userDisplayName}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
