/**
 * User menu (topbar dropdown)
 *
 * Shows the authenticated user identity and provides sign-out.
 * Clicking the trigger opens a small dropdown with the user
 * display name, email (truncated), and a sign-out button.
 */

"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown } from "@/components/icons";
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
  function handleClickOutside(e: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }

  // Attach/detach click listener
  function toggleOpen() {
    if (open) {
      document.removeEventListener("click", handleClickOutside);
    } else {
      document.addEventListener("click", handleClickOutside, true);
    }
    setOpen((v) => !v);
  }

  function close() {
    document.removeEventListener("click", handleClickOutside);
    setOpen(false);
  }

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
        onClick={toggleOpen}
        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        {/* Avatar */}
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-400"
          aria-hidden="true"
        >
          {initials}
        </span>

        {/* Name / email */}
        <span className="hidden sm:block max-w-[140px] truncate text-slate-400">
          {displayName ?? email}
        </span>

        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`hidden sm:block text-slate-600 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-labelledby={buttonId}
          className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/30 py-1"
          onClick={close}
        >
          {/* User info */}
          <div className="px-3 py-2.5 border-b border-slate-800">
            {displayName && (
              <p className="text-sm font-medium text-slate-200 truncate">
                {displayName}
              </p>
            )}
            <p
              className="text-xs text-slate-500 truncate"
              title={email}
            >
              {email}
            </p>
          </div>

          {/* Sign out */}
          <div className="px-3 py-2">
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
