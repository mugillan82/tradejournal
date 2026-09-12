/**
 * Analytics Domain — Loading Skeleton Component
 */

import React from "react";

export function AnalyticsSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" data-testid="analytics-skeleton">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-800/80 rounded-md animate-pulse" />
          <div className="h-4 w-72 bg-slate-800/50 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Filter toolbar skeleton */}
      <div className="h-24 rounded-xl border border-slate-800 bg-slate-900/60 p-4 animate-pulse" />

      {/* 8 KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-slate-800 bg-slate-900/60 p-4 animate-pulse"
          />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-80 rounded-xl border border-slate-800 bg-slate-900/60 p-5 animate-pulse" />

      {/* Summary insights skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-slate-800 bg-slate-900/60 p-4 animate-pulse"
          />
        ))}
      </div>

      {/* Breakdown table skeleton */}
      <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/60 p-5 animate-pulse" />
    </div>
  );
}
