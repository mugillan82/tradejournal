/**
 * Dashboard Domain — Recent Trades Component
 *
 * Compact recent trade activity list with direct navigation to trade details.
 */

"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, ExternalLink } from "@/components/icons";
import type { TradeDto } from "@/lib/client/dashboard";

interface DashboardRecentTradesProps {
  trades: ReadonlyArray<TradeDto>;
}

function formatCurrency(valStr: string | null | undefined): string {
  if (!valStr) return "$0.00";
  const num = parseFloat(valStr);
  if (isNaN(num)) return "$0.00";
  const sign = num > 0 ? "+" : num < 0 ? "-" : "";
  const abs = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dateObj = d instanceof Date ? d : new Date(d);
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function DashboardRecentTrades({ trades }: DashboardRecentTradesProps) {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4"
      data-testid="dashboard-recent-trades"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Recent Trades
          </h2>
          <span className="text-xs text-slate-400">({trades.length})</span>
        </div>
        <Link
          href="/trades"
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <span>View all trades</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {trades.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No recent trades found. Log a trade to get started.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="pb-2.5">Date</th>
                <th className="pb-2.5">Symbol</th>
                <th className="pb-2.5">Side</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">R-Mult</th>
                <th className="pb-2.5 text-right">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {trades.map((t) => {
                const pnlNum = parseFloat(t.netPnl || "0");
                const isWin = pnlNum > 0;
                const isLoss = pnlNum < 0;

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="py-2.5 text-slate-400 whitespace-nowrap">
                      {formatDate(t.entryDate)}
                    </td>
                    <td className="py-2.5 font-bold text-slate-200">
                      <Link
                        href={`/trades/${t.id}`}
                        className="hover:text-indigo-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>{t.title || "Trade"}</span>
                      </Link>
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          t.side === "LONG"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {t.side === "LONG" ? (
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        ) : (
                          <ArrowDownRight className="w-2.5 h-2.5" />
                        )}
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          t.status === "CLOSED"
                            ? "bg-slate-800 text-slate-300"
                            : t.status === "OPEN"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-300 font-mono">
                      {t.actualRMultiple ? `${t.actualRMultiple}R` : "—"}
                    </td>
                    <td
                      className={`py-2.5 text-right font-bold font-mono whitespace-nowrap ${
                        isWin
                          ? "text-emerald-400"
                          : isLoss
                            ? "text-rose-400"
                            : "text-slate-300"
                      }`}
                    >
                      {formatCurrency(t.netPnl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
