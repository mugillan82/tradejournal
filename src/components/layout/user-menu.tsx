/**
 * User Menu — Stitch Obsidian Orbit Edition
 *
 * Header user identity trigger and dropdown menu.
 * Features glowing orbital avatar halo, account tier badges,
 * and obsidian glass aesthetics.
 */

"use client";

import Link from "next/link";
import { useId, useRef, useState, useEffect } from "react";
import {
  ChevronDown,
  Settings as SettingsIcon,
  HelpCircle,
  Shield,
  Sparkles,
} from "@/components/icons";
import { SignOutButton } from "@/components/auth/sign-out-button";

interface UserMenuProps {
  displayName?: string | null;
  email: string;
}

export function UserMenu({ displayName, email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonId = useId();
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        id={buttonId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent hover:border-white/[0.08] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
      >
        {/* Glowing Orbital Avatar */}
        <div className="relative flex-shrink-0">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600/30 to-violet-500/20 text-[11px] font-bold text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-950"
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-purple-400 border border-[#08070d]" />
        </div>

        {/* Display Name */}
        <span className="hidden sm:block max-w-[130px] truncate text-xs font-medium text-slate-200">
          {displayName ?? email}
        </span>

        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`hidden sm:block text-slate-500 transition-transform duration-200 ${
            open ? "rotate-180 text-purple-400" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Obsidian Glass Dropdown Menu */}
      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-labelledby={buttonId}
          className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/80 py-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Account Header */}
          <div className="px-4 py-3 border-b border-white/[0.08] bg-slate-950/40">
            <div className="flex items-center justify-between mb-1">
              {displayName && (
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {displayName}
                </p>
              )}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30">
                <Shield size={10} /> PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate" title={email}>
              {email}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="py-1.5 border-b border-white/[0.08]">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
            >
              <SettingsIcon size={15} className="text-slate-400" />
              <span>Settings & Preferences</span>
            </Link>
            <Link
              href="/help"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
            >
              <HelpCircle size={15} className="text-slate-400" />
              <span>Documentation & Guides</span>
            </Link>
            <Link
              href="/import/smart"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-purple-300 hover:bg-purple-500/10 transition-colors"
            >
              <Sparkles size={15} className="text-purple-400" />
              <span>Smart Import (AI Vision)</span>
            </Link>
          </div>

          {/* Sign Out Action */}
          <div className="px-3.5 py-2">
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
