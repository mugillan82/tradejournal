/**
 * Authentication Layout
 *
 * Shared shell for sign-in and sign-up pages.
 * Dark trading/analytics aesthetic with responsive layout.
 */

import { type ReactNode } from "react";
import { BrandMark } from "@/components/brand/brand-mark";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Ambient background glow */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-[-10%] w-[600px] h-[400px] bg-blue-600/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-slate-800/60">
        <BrandMark />
        <a
          href="https://tradejournal.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150"
        >
          tradejournal.app
        </a>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 px-6 py-4 text-center">
        <p className="text-xs text-slate-600">
          &copy; {new Date().getFullYear()} TradeJournal. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
