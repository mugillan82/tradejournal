/**
 * Dashboard Domain — Accounts Summary Card
 *
 * Displays portfolio trading accounts, types, currencies, and balance details.
 */

"use client";

import React from "react";
import { Wallet, ShieldCheck } from "@/components/icons";
import type { TradingAccountDto } from "@/lib/client/dashboard";

interface DashboardAccountsCardProps {
  accounts: ReadonlyArray<TradingAccountDto>;
}

function formatCurrency(valStr: string | null | undefined, currency = "USD"): string {
  if (!valStr) return "$0.00";
  const num = parseFloat(valStr);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(num);
}

export function DashboardAccountsCard({ accounts }: DashboardAccountsCardProps) {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4"
      data-testid="dashboard-accounts-card"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-100">
            Trading Accounts
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          {accounts.length} Active {accounts.length === 1 ? "Account" : "Accounts"}
        </span>
      </div>

      {accounts.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No trading accounts configured.
        </div>
      ) : (
        <div className="space-y-2.5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-100">{acc.name}</span>
                  {acc.isActive && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Active
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                    {acc.type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Currency: {acc.currency}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-slate-200 font-mono">
                  {acc.currentBalance
                    ? formatCurrency(acc.currentBalance, acc.currency)
                    : formatCurrency(acc.initialBalance, acc.currency)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {acc.currentBalance ? "Current Balance" : "Initial Balance"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
