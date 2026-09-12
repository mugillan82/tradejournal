/**
 * Reports Domain — Direction Tab Component
 *
 * Long vs Short comparative performance analysis.
 */

"use client";

import React from "react";
import type { DirectionReportDto } from "@/lib/client/reports";

interface ReportDirectionTabProps {
  direction: DirectionReportDto;
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

export function ReportDirectionTab({ direction }: ReportDirectionTabProps) {
  const { long, short } = direction;

  const longPnlNum = parseFloat(long.netPnl || "0");
  const shortPnlNum = parseFloat(short.netPnl || "0");

  return (
    <div className="space-y-6" data-testid="report-direction-tab">
      {/* 1. Long vs Short Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Long Positions */}
        <div className="rounded-xl border border-emerald-900/40 bg-slate-900/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">
                LONG TRADES
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {long.tradeCount} Trades ({long.winCount}W • {long.lossCount}L)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Net P&L</div>
              <div
                className={`text-base font-bold font-mono mt-0.5 ${
                  longPnlNum > 0
                    ? "text-emerald-400"
                    : longPnlNum < 0
                      ? "text-rose-400"
                      : "text-slate-300"
                }`}
                data-testid="direction-long-net-pnl"
              >
                {formatCurrency(long.netPnl)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Win Rate</div>
              <div className="text-base font-bold font-mono mt-0.5 text-slate-200">
                {long.winRate}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Avg Trade P&L</div>
              <div className="text-base font-bold font-mono mt-0.5 text-slate-200">
                {formatCurrency(long.averageTradePnl)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Gross Profit</div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {formatCurrency(long.grossProfit)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Gross Loss</div>
              <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
                {formatCurrency(long.grossLoss)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Average R</div>
              <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                {long.averageR ? `${long.averageR}R` : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Short Positions */}
        <div className="rounded-xl border border-rose-900/40 bg-slate-900/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <h3 className="font-bold text-sm text-rose-400 uppercase tracking-wider">
                SHORT TRADES
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {short.tradeCount} Trades ({short.winCount}W • {short.lossCount}L)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Net P&L</div>
              <div
                className={`text-base font-bold font-mono mt-0.5 ${
                  shortPnlNum > 0
                    ? "text-emerald-400"
                    : shortPnlNum < 0
                      ? "text-rose-400"
                      : "text-slate-300"
                }`}
                data-testid="direction-short-net-pnl"
              >
                {formatCurrency(short.netPnl)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Win Rate</div>
              <div className="text-base font-bold font-mono mt-0.5 text-slate-200">
                {short.winRate}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Avg Trade P&L</div>
              <div className="text-base font-bold font-mono mt-0.5 text-slate-200">
                {formatCurrency(short.averageTradePnl)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Gross Profit</div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {formatCurrency(short.grossProfit)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Gross Loss</div>
              <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
                {formatCurrency(short.grossLoss)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium">Average R</div>
              <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                {short.averageR ? `${short.averageR}R` : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
