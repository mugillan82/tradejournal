/**
 * Reports Domain — Time Tab Component
 *
 * Monthly and Daily performance breakdown tables.
 */

"use client";

import React, { useState } from "react";
import type { TimeReportDto } from "@/lib/client/reports";
import { ReportSortableTable, type ColumnDef } from "./report-sortable-table";

interface ReportTimeTabProps {
  time: TimeReportDto;
}

function formatCurrency(valStr: string | null | undefined): string {
  if (!valStr) return "$0.00";
  const num = parseFloat(valStr);
  if (isNaN(num)) return "$0.00";
  const sign = num > 0 ? "+" : num < 0 ? "-" : "";
  const abs = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

export function ReportTimeTab({ time }: ReportTimeTabProps) {
  const [viewMode, setViewMode] = useState<"monthly" | "daily">("monthly");

  const monthlyColumns: ColumnDef<TimeReportDto["monthly"][number]>[] = [
    {
      key: "month",
      label: "Month",
      align: "left",
      render: (r) => <span className="font-semibold text-slate-100">{r.month}</span>,
    },
    {
      key: "tradeCount",
      label: "Trades",
      align: "right",
      render: (r) => <span>{r.tradeCount}</span>,
    },
    {
      key: "record",
      label: "Record",
      align: "center",
      sortable: false,
      render: (r) => (
        <span className="text-slate-400">
          <span className="text-emerald-400">{r.winCount}W</span> •{" "}
          <span className="text-rose-400">{r.lossCount}L</span>
        </span>
      ),
    },
    {
      key: "winRate",
      label: "Win Rate",
      align: "right",
      render: (r) => (
        <span
          className={
            r.winRate >= 50
              ? "text-emerald-400"
              : r.winRate > 0
                ? "text-amber-400"
                : "text-slate-400"
          }
        >
          {r.winRate}%
        </span>
      ),
    },
    {
      key: "averageTradePnl",
      label: "Avg Trade",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.averageTradePnl);
        return (
          <span className={num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}>
            {formatCurrency(r.averageTradePnl)}
          </span>
        );
      },
    },
    {
      key: "netPnl",
      label: "Net P&L",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.netPnl);
        return (
          <span className={`font-bold ${num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}`}>
            {formatCurrency(r.netPnl)}
          </span>
        );
      },
    },
  ];

  const dailyColumns: ColumnDef<TimeReportDto["daily"][number]>[] = [
    {
      key: "date",
      label: "Date",
      align: "left",
      render: (r) => <span className="font-semibold text-slate-100">{r.date}</span>,
    },
    {
      key: "tradeCount",
      label: "Trades",
      align: "right",
      render: (r) => <span>{r.tradeCount}</span>,
    },
    {
      key: "record",
      label: "Record",
      align: "center",
      sortable: false,
      render: (r) => (
        <span className="text-slate-400">
          <span className="text-emerald-400">{r.winCount}W</span> •{" "}
          <span className="text-rose-400">{r.lossCount}L</span>
        </span>
      ),
    },
    {
      key: "winRate",
      label: "Win Rate",
      align: "right",
      render: (r) => (
        <span
          className={
            r.winRate >= 50
              ? "text-emerald-400"
              : r.winRate > 0
                ? "text-amber-400"
                : "text-slate-400"
          }
        >
          {r.winRate}%
        </span>
      ),
    },
    {
      key: "averageTradePnl",
      label: "Avg Trade",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.averageTradePnl);
        return (
          <span className={num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}>
            {formatCurrency(r.averageTradePnl)}
          </span>
        );
      },
    },
    {
      key: "netPnl",
      label: "Net P&L",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.netPnl);
        return (
          <span className={`font-bold ${num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}`}>
            {formatCurrency(r.netPnl)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4" data-testid="report-time-tab">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          {viewMode === "monthly" ? "Monthly Performance Breakdown" : "Daily Performance Breakdown"}
        </h3>

        <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("monthly")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "monthly"
                ? "bg-slate-800 text-slate-100 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "daily"
                ? "bg-slate-800 text-slate-100 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Daily
          </button>
        </div>
      </div>

      {viewMode === "monthly" ? (
        <ReportSortableTable
          columns={monthlyColumns}
          data={time.monthly}
          defaultSortKey="month"
          defaultSortDir="desc"
          emptyMessage="No monthly trading data available."
          testId="time-monthly-table"
        />
      ) : (
        <ReportSortableTable
          columns={dailyColumns}
          data={time.daily}
          defaultSortKey="date"
          defaultSortDir="desc"
          emptyMessage="No daily trading data available."
          testId="time-daily-table"
        />
      )}
    </div>
  );
}
