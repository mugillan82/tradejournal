"use client";

import React from "react";
import type { DataManagementOverviewDto } from "@/lib/client/data-management";
import {
  Wallet,
  LineChart,
  Activity,
  BookOpen,
  NotebookPen,
  ClipboardList,
  Tags,
  Target,
  Layers,
  AlertTriangle,
  FileText,
} from "@/components/icons";

interface DataOverviewGridProps {
  overview: DataManagementOverviewDto | null;
  isLoading: boolean;
}

interface StatItem {
  id: string;
  label: string;
  count: number | undefined;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  badge?: string;
}

export function DataOverviewGrid({ overview, isLoading }: DataOverviewGridProps) {
  const stats: StatItem[] = [
    {
      id: "accounts",
      label: "Trading Accounts",
      count: overview?.accounts,
      icon: Wallet,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "trades",
      label: "Trades Recorded",
      count: overview?.trades,
      icon: LineChart,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "executions",
      label: "Executions",
      count: overview?.executions,
      icon: Activity,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      id: "journalEntries",
      label: "Journal Entries",
      count: overview?.journalEntries,
      icon: BookOpen,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      id: "tradeNotes",
      label: "Trade Notes",
      count: overview?.tradeNotes,
      icon: NotebookPen,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
    {
      id: "reviews",
      label: "Trade Reviews",
      count: overview?.reviews,
      icon: ClipboardList,
      color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    },
    {
      id: "tags",
      label: "Tags Defined",
      count: overview?.tags,
      icon: Tags,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      id: "strategies",
      label: "Strategies",
      count: overview?.strategies,
      icon: Target,
      color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    },
    {
      id: "setups",
      label: "Setups",
      count: overview?.setups,
      icon: Layers,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      id: "mistakes",
      label: "Mistakes Tracked",
      count: overview?.mistakes,
      icon: AlertTriangle,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
    {
      id: "attachments",
      label: "Attachments (Meta)",
      count: overview?.attachments,
      icon: FileText,
      color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-200">
          User Data Overview
        </h2>
        <span className="text-xs text-zinc-500">
          Strictly isolated to your authenticated account
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {stats.map((stat) => {
          const IconComp = stat.icon;
          return (
            <div
              key={stat.id}
              data-testid={`overview-card-${stat.id}`}
              className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 truncate max-w-[120px]" title={stat.label}>
                  {stat.label}
                </span>
                <div className={`p-1.5 rounded-md border ${stat.color}`}>
                  <IconComp size={14} />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-zinc-100">
                {isLoading ? (
                  <div className="h-6 w-12 bg-zinc-800 animate-pulse rounded" />
                ) : (
                  (stat.count ?? 0).toLocaleString()
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
