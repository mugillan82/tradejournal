/**
 * Calendar Domain — Day Detail Panel Component
 *
 * Slide-over / panel view showing comprehensive performance, trade list,
 * and journal logs for the selected calendar day.
 */

"use client";

import React from "react";
import Link from "next/link";
import type { CalendarDayDto } from "@/lib/client/calendar";

interface CalendarDayDetailPanelProps {
  day: CalendarDayDto | null;
  dateStr: string;
  onClose: () => void;
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const d = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
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

export function CalendarDayDetailPanel({
  day,
  dateStr,
  onClose,
}: CalendarDayDetailPanelProps) {
  const fullDateHeading = formatFullDate(dateStr);
  const netPnlNum = day ? parseFloat(day.netPnl || "0") : 0;
  const isPnlPositive = netPnlNum > 0;
  const isPnlNegative = netPnlNum < 0;

  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/95 p-5 shadow-lg space-y-5"
      data-testid="calendar-day-detail-panel"
    >
      {/* Panel Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Day Details
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 mt-0.5" data-testid="day-detail-date">
            {fullDateHeading}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close day details"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          data-testid="close-day-detail-btn"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Daily Metrics Summary */}
      {day && day.tradeCount > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-lg bg-slate-800/80 p-2.5 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-medium">Daily Net P&L</div>
            <div
              className={`text-base font-bold font-mono mt-0.5 ${
                isPnlPositive
                  ? "text-emerald-400"
                  : isPnlNegative
                    ? "text-rose-400"
                    : "text-slate-300"
              }`}
              data-testid="day-detail-net-pnl"
            >
              {formatCurrency(day.netPnl)}
            </div>
          </div>

          <div className="rounded-lg bg-slate-800/80 p-2.5 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-medium">Win Rate</div>
            <div className="text-base font-bold font-mono mt-0.5 text-slate-200" data-testid="day-detail-win-rate">
              {day.winRate}%
            </div>
            <div className="text-[10px] text-slate-400">
              {day.winCount}W • {day.lossCount}L
            </div>
          </div>

          <div className="rounded-lg bg-slate-800/80 p-2.5 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-medium">Trades</div>
            <div className="text-base font-bold font-mono mt-0.5 text-slate-200">
              {day.tradeCount}
            </div>
            <div className="text-[10px] text-slate-400">
              {day.openCount > 0 ? `${day.openCount} open` : "all closed"}
            </div>
          </div>

          <div className="rounded-lg bg-slate-800/80 p-2.5 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-medium">Realized R</div>
            <div
              className={`text-base font-bold font-mono mt-0.5 ${
                day.totalR && parseFloat(day.totalR) > 0
                  ? "text-emerald-400"
                  : day.totalR && parseFloat(day.totalR) < 0
                    ? "text-rose-400"
                    : "text-slate-400"
              }`}
            >
              {day.totalR !== null
                ? parseFloat(day.totalR) > 0
                  ? `+${day.totalR}R`
                  : `${day.totalR}R`
                : "—"}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-800/40 p-4 text-center border border-slate-800 text-xs text-slate-400">
          No trades closed or recorded on this day.
        </div>
      )}

      {/* Journal Entry Section */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span>📝</span>
            <span>Daily Journal</span>
          </div>

          <Link
            href={`/journal`}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            {day?.hasJournalEntry ? "Open Journal →" : "+ Write Journal Entry"}
          </Link>
        </div>

        {day?.hasJournalEntry ? (
          <div className="text-xs space-y-1.5 pt-1">
            {day.journalMood && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Mood: {day.journalMood.replace("_", " ")}
              </div>
            )}
            {day.journalNotes ? (
              <p className="text-slate-300 text-xs leading-relaxed italic bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                &ldquo;{day.journalNotes}&rdquo;
              </p>
            ) : (
              <p className="text-slate-400 text-xs italic">Journal entry recorded without notes.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No journal log recorded for this date. Capture your psychology and market context.
          </p>
        )}
      </div>

      {/* Trades List */}
      {day && day.trades.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Trades on this Date ({day.trades.length})</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {day.trades.map((trade) => {
              const tradeNetPnlNum = trade.netPnl ? parseFloat(trade.netPnl) : 0;
              const isWin = tradeNetPnlNum > 0;
              const isLoss = tradeNetPnlNum < 0;

              return (
                <Link
                  key={trade.id}
                  href={`/trades/${trade.id}`}
                  className="block rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800/80 p-3 transition-colors shadow-sm group"
                  data-testid={`day-trade-item-${trade.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100 font-mono group-hover:text-indigo-300 transition-colors">
                        {trade.title || "Untitled Trade"}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          trade.side === "LONG"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {trade.side}
                      </span>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {trade.status}
                      </span>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-bold font-mono ${
                          isWin
                            ? "text-emerald-400"
                            : isLoss
                              ? "text-rose-400"
                              : "text-slate-300"
                        }`}
                      >
                        {formatCurrency(trade.netPnl)}
                      </div>
                      {trade.actualRMultiple && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {parseFloat(trade.actualRMultiple) > 0
                            ? `+${trade.actualRMultiple}R`
                            : `${trade.actualRMultiple}R`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div>
                      Qty: <span className="text-slate-200 font-mono">{parseFloat(trade.quantity)}</span>
                    </div>
                    <div>•</div>
                    <div>
                      Entry: <span className="text-slate-200 font-mono">${parseFloat(trade.entryPrice).toFixed(2)}</span>
                    </div>
                    {trade.exitPrice && (
                      <>
                        <div>•</div>
                        <div>
                          Exit: <span className="text-slate-200 font-mono">${parseFloat(trade.exitPrice).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    {trade.strategy && (
                      <>
                        <div>•</div>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 text-[10px]">
                          {trade.strategy.name}
                        </span>
                      </>
                    )}
                    {trade.setup && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {trade.setup.name}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
