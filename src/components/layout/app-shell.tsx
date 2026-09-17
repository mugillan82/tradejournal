/**
 * AppShell — Stitch Obsidian Orbit Application Shell
 *
 * Authenticated application layout wrapper.
 * Provides:
 * - Desktop Obsidian sidebar + Mobile slide drawer
 * - Orbital Topbar with telemetry and quick actions
 * - Global Command Palette (⌘K / Ctrl+K)
 * - Ambient cosmic background canvas
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";

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
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const openCommandPalette = useCallback(() => {
    setIsCommandOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandOpen(false);
  }, []);

  // Global keyboard shortcut listener for ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#06040a] text-slate-100 relative selection:bg-purple-500/30">
      {/* Ambient Cosmic Background Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-purple-500/[0.045] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-violet-600/[0.035] blur-[140px]" />
      </div>

      {/* Desktop Sidebar — hidden on < lg */}
      <div className="hidden lg:flex lg:flex-shrink-0 relative z-20">
        <Sidebar
          userDisplayName={userDisplayName ?? undefined}
          onOpenCommandPalette={openCommandPalette}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
        <Topbar
          userDisplayName={userDisplayName}
          userEmail={userEmail}
          pageTitle={pageTitle}
          onOpenCommandPalette={openCommandPalette}
        />

        {/* Scrollable Page Content */}
        <main
          className="flex-1 overflow-y-auto relative focus:outline-none"
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {/* Global Command Palette Launcher */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={closeCommandPalette}
      />
    </div>
  );
}
