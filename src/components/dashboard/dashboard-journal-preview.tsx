/**
 * Dashboard Domain — Recent Journal Activity Component
 *
 * Displays recent journal thoughts, mood ratings, and direct links to journal context.
 */

"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Smile, Zap } from "@/components/icons";
import type { JournalEntryDto } from "@/lib/client/dashboard";

interface DashboardJournalPreviewProps {
  entries: ReadonlyArray<JournalEntryDto>;
}

function formatDate(d: Date | string): string {
  const dateObj = d instanceof Date ? d : new Date(d);
  return dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function DashboardJournalPreview({ entries }: DashboardJournalPreviewProps) {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4"
      data-testid="dashboard-journal-preview"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-slate-100">
            Recent Journal Entries
          </h2>
        </div>
        <Link
          href="/daily-journal"
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <span>Open Daily Journal</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No recent journal reflections recorded.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  {formatDate(entry.entryDate)}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {entry.mood && (
                    <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                      <Smile className="w-3 h-3 text-amber-400" />
                      {entry.mood}
                    </span>
                  )}
                  {entry.energy !== null && entry.energy !== undefined && (
                    <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      Energy: {entry.energy}/10
                    </span>
                  )}
                </div>
              </div>

              {entry.notes && (
                <p className="text-xs text-slate-400 line-clamp-2">
                  {entry.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
