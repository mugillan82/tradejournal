"use client";

import React, { useMemo } from "react";
import type { TradingAccountDto } from "@/lib/client/accounts";
import { Wallet, CheckCircle, Power, TrendingUp, TrendingDown } from "@/components/icons";

interface AccountsSummaryBarProps {
  accounts: ReadonlyArray<TradingAccountDto>;
}

export function AccountsSummaryBar({ accounts }: AccountsSummaryBarProps) {
  const totalCount = accounts.length;
  const activeCount = accounts.filter((a) => a.isActive).length;
  const inactiveCount = totalCount - activeCount;

  // Aggregate balance per currency
  const currencySummaries = useMemo(() => {
    const map = new Map<
      string,
      { initial: number; current: number; count: number }
    >();

    for (const acc of accounts) {
      const curr = acc.currency || "USD";
      const existing = map.get(curr) || { initial: 0, current: 0, count: 0 };
      const initVal = acc.initialBalance ? parseFloat(acc.initialBalance) : 0;
      const currVal = acc.currentBalance ? parseFloat(acc.currentBalance) : 0;

      map.set(curr, {
        initial: existing.initial + (isNaN(initVal) ? 0 : initVal),
        current: existing.current + (isNaN(currVal) ? 0 : currVal),
        count: existing.count + 1,
      });
    }

    return Array.from(map.entries()).map(([currency, data]) => ({
      currency,
      initial: data.initial,
      current: data.current,
      delta: data.current - data.initial,
      count: data.count,
    }));
  }, [accounts]);

  const uniqueCurrencies = currencySummaries.length;

  return (
    <section aria-label="Account Summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Accounts */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Accounts</span>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
            <Wallet size={16} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100">{totalCount}</span>
          <span className="text-xs text-slate-400">
            {uniqueCurrencies === 1 ? `(${currencySummaries[0]?.currency})` : `${uniqueCurrencies} currencies`}
          </span>
        </div>
      </div>

      {/* Active Accounts */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Active Accounts</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle size={16} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-400">{activeCount}</span>
          <span className="text-xs text-slate-400">in use</span>
        </div>
      </div>

      {/* Inactive Accounts */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Inactive Accounts</span>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
            <Power size={16} />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-400">{inactiveCount}</span>
          <span className="text-xs text-slate-400">archived</span>
        </div>
      </div>

      {/* Portfolio Balance / Currency Context */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">
            {uniqueCurrencies === 1 ? "Combined Balance" : "Portfolios by Currency"}
          </span>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
            {uniqueCurrencies === 1 && (currencySummaries[0]?.delta ?? 0) >= 0 ? (
              <TrendingUp size={16} className="text-emerald-400" />
            ) : (
              <TrendingDown size={16} className="text-rose-400" />
            )}
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {currencySummaries.length === 0 ? (
            <div className="text-lg font-bold text-slate-400">0.00</div>
          ) : uniqueCurrencies === 1 ? (
            <div>
              <div className="text-2xl font-bold text-slate-100">
                {currencySummaries[0].current.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs font-normal text-slate-400">
                  {currencySummaries[0].currency}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <span className="text-slate-400">Initial:</span>
                <span className="text-slate-300">
                  {currencySummaries[0].initial.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`ml-1 font-medium ${
                    currencySummaries[0].delta >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ({currencySummaries[0].delta >= 0 ? "+" : ""}
                  {currencySummaries[0].delta.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })})
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 max-h-16 overflow-y-auto pr-1">
              {currencySummaries.map((cs) => (
                <div key={cs.currency} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">{cs.currency}:</span>
                  <span className="text-slate-100 font-mono">
                    {cs.current.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
