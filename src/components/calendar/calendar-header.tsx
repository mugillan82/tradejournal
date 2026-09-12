/**
 * Calendar Domain — Header Component
 *
 * Provides month navigation (Previous, Today, Next), formatted month heading,
 * month selector jump, and refresh indicator.
 */

"use client";

import React from "react";

interface CalendarHeaderProps {
  currentMonth: string; // YYYY-MM
  onMonthChange: (newMonth: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarHeader({
  currentMonth,
  onMonthChange,
  onRefresh,
  isRefreshing = false,
}: CalendarHeaderProps) {
  const [yearStr, monthNumStr] = currentMonth.split("-");
  const year = parseInt(yearStr || "2026", 10);
  const monthNum = parseInt(monthNumStr || "1", 10);
  const monthName = MONTH_NAMES[monthNum - 1] || "Month";

  const handlePrevMonth = () => {
    let newYear = year;
    let newMonth = monthNum - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    const mStr = String(newMonth).padStart(2, "0");
    onMonthChange(`${newYear}-${mStr}`);
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = monthNum + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const mStr = String(newMonth).padStart(2, "0");
    onMonthChange(`${newYear}-${mStr}`);
  };

  const handleToday = () => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    onMonthChange(`${y}-${m}`);
  };

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800"
      data-testid="calendar-header"
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>Trading Calendar</span>
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-normal">
                <svg
                  className="animate-spin h-3 w-3 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Updating...
              </span>
            )}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Daily performance calendar and journal logs for {monthName} {year}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Month Navigation Controls */}
        <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 shadow-sm">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            data-testid="calendar-prev-month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            data-testid="calendar-today-btn"
          >
            Today
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next Month"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            data-testid="calendar-next-month"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Current Month & Year Display */}
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-semibold text-slate-200 tracking-wide flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span data-testid="calendar-month-heading">
            {monthName} {year}
          </span>
        </div>

        {/* Refresh Action */}
        <button
          type="button"
          onClick={onRefresh}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors shadow-sm"
          title="Refresh Calendar"
          data-testid="calendar-refresh-btn"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
