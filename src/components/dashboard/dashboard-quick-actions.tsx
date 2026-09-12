/**
 * Dashboard Domain — Quick Actions Component
 *
 * Fast navigation shortcuts for common trader workflows.
 */

"use client";

import React from "react";
import Link from "next/link";
import { PlusCircle, ListOrdered, BarChart3, Calendar, FileText, BookOpen } from "@/components/icons";

export function DashboardQuickActions() {
  const actions = [
    {
      title: "Add New Trade",
      description: "Log an entry, stop, target & tags",
      href: "/trades/new",
      icon: PlusCircle,
      accentColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: "View All Trades",
      description: "Filter, search, and edit trades",
      href: "/trades",
      icon: ListOrdered,
      accentColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Analytics Dashboard",
      description: "KPIs, drawdowns & win rates",
      href: "/analytics",
      icon: BarChart3,
      accentColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Trading Calendar",
      description: "Daily P&L & monthly heatmap",
      href: "/calendar",
      icon: Calendar,
      accentColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      title: "Advanced Reports",
      description: "Deep-dive dimensional reports",
      href: "/reports",
      icon: FileText,
      accentColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Daily Journal",
      description: "Log daily reflections & mindset",
      href: "/daily-journal",
      icon: BookOpen,
      accentColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4"
      data-testid="dashboard-quick-actions"
    >
      <h2 className="text-sm font-semibold text-slate-100">
        Quick Actions & Navigation
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.href}
              href={act.href}
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/50 hover:border-slate-700 transition-all flex flex-col items-center text-center space-y-2 group"
            >
              <div className={`p-2 rounded-lg border ${act.accentColor} group-hover:scale-110 transition-transform`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                  {act.title}
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                  {act.description}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
