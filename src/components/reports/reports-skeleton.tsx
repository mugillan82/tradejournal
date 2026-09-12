/**
 * Reports Domain — Skeleton Component
 */

import React from "react";

export function ReportsSkeleton() {
  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-pulse"
      data-testid="reports-skeleton"
    >
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-800 rounded-lg" />
          <div className="h-4 w-72 bg-slate-800/60 rounded" />
        </div>
        <div className="h-8 w-24 bg-slate-800 rounded-lg" />
      </div>

      {/* Filter Toolbar Skeleton */}
      <div className="h-24 bg-slate-900/60 rounded-xl border border-slate-800 p-4" />

      {/* Tab Navigation Skeleton */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-slate-800 rounded-lg" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-900/80 rounded-xl border border-slate-800 p-4 space-y-2">
            <div className="h-3 w-16 bg-slate-800 rounded" />
            <div className="h-6 w-24 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
