/**
 * Calendar Domain — Month Grid Component
 *
 * Renders a high-density 7-column monthly trading calendar with daily P&L,
 * win/loss badges, R-multiples, journal entry indicators, and best/worst day markers.
 */

"use client";

import React from "react";
import type { CalendarDayDto } from "@/lib/client/calendar";

interface CalendarMonthGridProps {
  month: string; // YYYY-MM
  days: Record<string, CalendarDayDto>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  bestDayDate: string | null;
  worstDayDate: string | null;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatPnl(pnlStr: string | null | undefined): string {
  if (!pnlStr) return "$0.00";
  const num = parseFloat(pnlStr);
  if (isNaN(num)) return "$0.00";
  const sign = num > 0 ? "+" : num < 0 ? "-" : "";
  const abs = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

export function CalendarMonthGrid({
  month,
  days,
  selectedDate,
  onSelectDate,
  bestDayDate,
  worstDayDate,
}: CalendarMonthGridProps) {
  const [yearStr, monthNumStr] = month.split("-");
  const year = parseInt(yearStr || "2026", 10);
  const monthIndex = parseInt(monthNumStr || "1", 10) - 1;

  const firstDayOfMonth = new Date(Date.UTC(year, monthIndex, 1));
  const startDayOfWeek = firstDayOfMonth.getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  // Today in UTC
  const now = new Date();
  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  // Build array of leading previous month days
  const leadingDays: number[] = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    leadingDays.push(daysInPrevMonth - i);
  }

  // Current month days
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Trailing next month days to complete a full 7-day row
  const totalCellsSoFar = leadingDays.length + currentDays.length;
  const trailingCount = (7 - (totalCellsSoFar % 7)) % 7;
  const trailingDays = Array.from({ length: trailingCount }, (_, i) => i + 1);

  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden"
      data-testid="calendar-month-grid"
    >
      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/95 text-center text-xs font-semibold text-slate-400 py-2.5">
        {WEEKDAY_NAMES.map((dayName, idx) => (
          <div
            key={dayName}
            className={idx === 0 || idx === 6 ? "text-slate-500" : "text-slate-300"}
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr gap-[1px] bg-slate-800/80">
        {/* Leading Previous Month Padding Cells */}
        {leadingDays.map((dayNum) => (
          <div
            key={`prev-${dayNum}`}
            className="min-h-[90px] sm:min-h-[110px] p-2 bg-slate-950/40 text-slate-600 select-none flex flex-col justify-between"
          >
            <span className="text-xs font-mono">{dayNum}</span>
          </div>
        ))}

        {/* Current Month Active Days */}
        {currentDays.map((dayNum) => {
          const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const dayData = days[dateStr];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasTrades = dayData && dayData.tradeCount > 0;
          const netPnlNum = dayData ? parseFloat(dayData.netPnl || "0") : 0;
          const isPnlPositive = netPnlNum > 0;
          const isPnlNegative = netPnlNum < 0;
          const isBestDay = bestDayDate === dateStr && hasTrades && isPnlPositive;
          const isWorstDay = worstDayDate === dateStr && hasTrades && isPnlNegative;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`min-h-[90px] sm:min-h-[110px] p-2 sm:p-2.5 text-left flex flex-col justify-between transition-all relative group focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                isSelected
                  ? "bg-slate-800 ring-2 ring-indigo-500 z-10"
                  : hasTrades
                    ? isPnlPositive
                      ? "bg-emerald-950/20 hover:bg-emerald-950/30"
                      : isPnlNegative
                        ? "bg-rose-950/20 hover:bg-rose-950/30"
                        : "bg-slate-900 hover:bg-slate-800/80"
                    : "bg-slate-900/90 hover:bg-slate-800/60"
              }`}
              data-testid={`calendar-day-cell-${dateStr}`}
            >
              {/* Day Header Row: Date number, Today dot, Journal icon, Best/Worst tag */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-mono font-medium ${
                    isToday
                      ? "px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold"
                      : isSelected
                        ? "text-indigo-400 font-bold"
                        : "text-slate-300"
                  }`}
                >
                  {dayNum}
                </span>

                <div className="flex items-center gap-1">
                  {/* Journal Indicator */}
                  {dayData?.hasJournalEntry && (
                    <span
                      className="text-[11px] hover:scale-110 transition-transform"
                      title={dayData.journalNotes || "Journal recorded"}
                      data-testid={`journal-indicator-${dateStr}`}
                    >
                      📝
                    </span>
                  )}

                  {/* Best / Worst Day Marker */}
                  {isBestDay && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      title="Best trading day of the month"
                    >
                      Best
                    </span>
                  )}
                  {isWorstDay && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      title="Worst trading day of the month"
                    >
                      Worst
                    </span>
                  )}
                </div>
              </div>

              {/* Day Performance Content */}
              {hasTrades ? (
                <div className="mt-1 space-y-1">
                  {/* Net P&L */}
                  <div
                    className={`text-xs sm:text-sm font-bold font-mono truncate ${
                      isPnlPositive
                        ? "text-emerald-400"
                        : isPnlNegative
                          ? "text-rose-400"
                          : "text-slate-400"
                    }`}
                  >
                    {formatPnl(dayData.netPnl)}
                  </div>

                  {/* Badges: Trade Count, Win/Loss, Total R */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="bg-slate-800 text-slate-300 px-1 py-0.2 rounded font-mono">
                      {dayData.tradeCount}T
                    </span>

                    {dayData.winCount > 0 || dayData.lossCount > 0 ? (
                      <span className="text-slate-400 font-mono">
                        <span className="text-emerald-400">{dayData.winCount}W</span>
                        {dayData.lossCount > 0 && (
                          <>
                            {" "}
                            <span className="text-rose-400">{dayData.lossCount}L</span>
                          </>
                        )}
                      </span>
                    ) : null}

                    {dayData.totalR !== null && (
                      <span
                        className={`font-mono px-1 py-0.2 rounded ${
                          parseFloat(dayData.totalR) > 0
                            ? "bg-emerald-500/10 text-emerald-300"
                            : parseFloat(dayData.totalR) < 0
                              ? "bg-rose-500/10 text-rose-300"
                              : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {parseFloat(dayData.totalR) > 0 ? `+${dayData.totalR}R` : `${dayData.totalR}R`}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-end">
                  {/* Quiet state for days without trades */}
                  <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    No trades
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {/* Trailing Next Month Padding Cells */}
        {trailingDays.map((dayNum) => (
          <div
            key={`next-${dayNum}`}
            className="min-h-[90px] sm:min-h-[110px] p-2 bg-slate-950/40 text-slate-600 select-none flex flex-col justify-between"
          >
            <span className="text-xs font-mono">{dayNum}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
