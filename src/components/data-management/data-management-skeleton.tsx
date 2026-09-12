"use client";

import React from "react";

export function DataManagementSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="pb-6 border-b border-zinc-800 space-y-2">
        <div className="h-8 w-64 bg-zinc-800 rounded-lg" />
        <div className="h-4 w-96 bg-zinc-850 rounded" />
      </div>

      {/* Overview grid skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-40 bg-zinc-800 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 11 }).map((_, idx) => (
            <div key={idx} className="h-20 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5" />
          ))}
        </div>
      </div>

      {/* Export cards skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-32 bg-zinc-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-44 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5" />
          ))}
        </div>
      </div>
    </div>
  );
}
