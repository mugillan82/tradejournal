"use client";

import React from "react";
import { Wallet, Plus } from "@/components/icons";
import { StrokeText } from "@/components/ui/stroke-text";

interface AccountsHeaderProps {
  onAddAccount: () => void;
}

export function AccountsHeader({ onAddAccount }: AccountsHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Wallet size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl flex items-center min-h-[36px]">
            <StrokeText
              text="Trading Accounts"
              fontSize={28}
              fontWeight={700}
              strokeColor="#a855f7"
              fillColor="#f8fafc"
              strokeWidth={1.3}
              drawDuration={1.2}
              fillDelay={0.15}
              fillMode="wipe"
              trigger="mount"
              replayOnHover
            />
          </h1>
        </div>
        <p className="text-sm text-slate-400">
          Manage your live, paper trading, simulation, and demo portfolios.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAddAccount}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        >
          <Plus size={16} />
          <span>Add Account</span>
        </button>
      </div>
    </header>
  );
}
