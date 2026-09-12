/**
 * Dashboard Domain — Loading Skeleton
 */

"use client";

import React from "react";

export function DashboardSkeleton() {
  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-pulse"
      data-testid="dashboard-skeleton"
    >
      {/* Header Skeleton */}
      <div className="flex justify-between items-center pb-5 border-b border-slate-800">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-800 rounded" />
          <div className="h-3 w-72 bg-slate-800/60 rounded" />
        </div>
        <div className="h-9 w-32 bg-slate-800 rounded" />
      </div>

      {/* Hero Skeleton */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="sm:col-span-2 h-28 bg-slate-800/80 rounded-xl" />
          <div className="h-28 bg-slate-800/80 rounded-xl" />
          <div className="h-28 bg-slate-800/80 rounded-xl" />
          <div className="h-28 bg-slate-800/80 rounded-xl" />
        </div>
        <div className="h-56 bg-slate-950/80 rounded-xl" />
      </div>

      {/* Today / Month Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-24 bg-slate-900/60 rounded-xl border border-slate-800" />
        <div className="h-24 bg-slate-900/60 rounded-xl border border-slate-800" />
      </div>

      {/* Grid Rows Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800" />
        <div className="h-64 bg-slate-900/60 rounded-xl border border-slate-800" />
      </div>
    </div>
  );
}
