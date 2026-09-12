/**
 * Calendar Domain — Skeleton Component
 *
 * Shimmering loading placeholder during initial and month navigation data fetches.
 */

import React from "react";

export function CalendarSkeleton() {
  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-pulse"
      data-testid="calendar-skeleton"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-800 rounded-lg" />
          <div className="h-4 w-64 bg-slate-800/60 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-800 rounded-lg" />
          <div className="h-9 w-32 bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-900/80 rounded-xl border border-slate-800 p-3 space-y-2">
            <div className="h-3 w-16 bg-slate-800 rounded" />
            <div className="h-6 w-24 bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      {/* Filter Toolbar Skeleton */}
      <div className="h-20 bg-slate-900/60 rounded-xl border border-slate-800 p-4" />

      {/* Month Grid Skeleton */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900 py-3 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 w-12 bg-slate-800 rounded mx-auto" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[1px] bg-slate-800/80">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-900/90 p-2 space-y-2">
              <div className="h-4 w-4 bg-slate-800 rounded" />
              {i % 3 === 0 && <div className="h-4 w-16 bg-slate-800/60 rounded" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
