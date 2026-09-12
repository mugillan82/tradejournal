"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TradingAccountDto } from "@/lib/client/accounts";
import {
  getTradingAccountClient,
  TradingAccountClientApiError,
} from "@/lib/client/accounts";
import {
  fetchAnalyticsOverview,
  type AnalyticsOverviewDto,
} from "@/lib/client/analytics";
import { fetchTrades } from "@/lib/client/trades";
import type { TradeDto } from "@/lib/trading/trade/types";
import { AccountEditModal } from "./account-edit-modal";
import { AccountDeleteModal } from "./account-delete-modal";
import { AccountStatusModal } from "./account-status-modal";
import {
  ArrowLeft,
  Wallet,
  Pencil,
  Trash2,
  Power,
  LineChart,
  BarChart3,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  CheckCircle,
} from "@/components/icons";

interface AccountDetailClientPageProps {
  id: string;
}

function getTypeBadgeStyle(type: string): { bg: string; text: string; border: string; label: string } {
  switch (type.toUpperCase()) {
    case "LIVE":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/20",
        label: "Live",
      };
    case "PAPER_TRADING":
      return {
        bg: "bg-sky-500/10",
        text: "text-sky-400",
        border: "border-sky-500/20",
        label: "Paper Trading",
      };
    case "SIMULATION":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/20",
        label: "Simulation",
      };
    case "DEMO":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/20",
        label: "Demo",
      };
    default:
      return {
        bg: "bg-slate-800",
        text: "text-slate-300",
        border: "border-slate-700",
        label: type,
      };
  }
}

export function AccountDetailClientPage({ id }: AccountDetailClientPageProps) {
  const router = useRouter();

  const [account, setAccount] = useState<TradingAccountDto | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverviewDto | null>(null);
  const [recentTrades, setRecentTrades] = useState<ReadonlyArray<TradeDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [acc, analyticsData, tradesData] = await Promise.all([
        getTradingAccountClient(id),
        fetchAnalyticsOverview({ tradingAccountId: id }),
        fetchTrades({
          filters: { tradingAccountId: id },
          sort: { field: "entryDate", direction: "desc" },
          pagination: { page: 1, pageSize: 5 },
        }),
      ]);

      setAccount(acc);
      setAnalytics(analyticsData);
      setRecentTrades(tradesData.items);
    } catch (err: unknown) {
      if (err instanceof TradingAccountClientApiError && err.status === 404) {
        setErrorMessage("Trading account not found.");
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load account details.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [acc, analyticsData, tradesData] = await Promise.all([
          getTradingAccountClient(id),
          fetchAnalyticsOverview({ tradingAccountId: id }),
          fetchTrades({
            filters: { tradingAccountId: id },
            sort: { field: "entryDate", direction: "desc" },
            pagination: { page: 1, pageSize: 5 },
          }),
        ]);

        if (!isMounted) return;
        setAccount(acc);
        setAnalytics(analyticsData);
        setRecentTrades(tradesData.items);
      } catch (err: unknown) {
        if (!isMounted) return;
        if (err instanceof TradingAccountClientApiError && err.status === 404) {
          setErrorMessage("Trading account not found.");
        } else {
          setErrorMessage(
            err instanceof Error ? err.message : "Failed to load account details.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div aria-label="Loading account..." className="space-y-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 bg-slate-800 rounded-lg" />
          <div className="h-8 w-48 bg-slate-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-900/60 border border-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-900/60 border border-slate-800 rounded-xl" />
      </div>
    );
  }

  if (errorMessage || !account) {
    return (
      <div className="space-y-6">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Accounts</span>
        </Link>
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-rose-900/50 bg-rose-950/20 backdrop-blur-sm">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-100">Unable to Load Account</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-sm">{errorMessage || "Account not found"}</p>
          <button
            type="button"
            onClick={loadData}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RotateCcw size={15} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const typeInfo = getTypeBadgeStyle(account.type);
  const initVal = account.initialBalance ? parseFloat(account.initialBalance) : 0;
  const currVal = account.currentBalance ? parseFloat(account.currentBalance) : 0;
  const hasBalances = account.initialBalance !== null && account.currentBalance !== null;
  const delta = currVal - initVal;
  const deltaPct = initVal > 0 ? (delta / initVal) * 100 : 0;
  const isProfit = delta >= 0;

  // Analytics metrics
  const netPnlNum = analytics?.metrics.netPnl ? parseFloat(analytics.metrics.netPnl) : 0;
  const isPnlPositive = netPnlNum >= 0;
  const winRate = analytics?.metrics.winRate ?? 0;
  const totalTrades = analytics?.metrics.totalTrades ?? 0;
  const profitFactor = analytics?.metrics.profitFactor ?? "—";
  const expectancy = analytics?.metrics.expectancy ?? "—";
  const equityPoints = analytics?.equityCurve ?? [];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successToast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 text-sm shadow-xl backdrop-blur-md animate-fade-in"
        >
          <CheckCircle size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors py-1 px-2 rounded-lg hover:bg-slate-900/60"
        >
          <ArrowLeft size={14} />
          <span>Back to Accounts</span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <Pencil size={14} />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={() => setIsStatusOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              account.isActive
                ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20"
                : "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20"
            }`}
          >
            <Power size={14} />
            <span>{account.isActive ? "Deactivate" : "Activate"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-500/20"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Account Hero Header */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wallet size={22} />
              </div>
              <h1 className="text-2xl font-bold text-slate-100">{account.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border}`}
              >
                {typeInfo.label}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  account.isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    account.isActive ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />
                {account.isActive ? "Active Account" : "Inactive / Archived"}
              </span>
            </div>
            <p className="text-xs text-slate-400 pl-1">
              Base Currency: <span className="font-mono text-slate-300 font-semibold">{account.currency}</span> • Created on{" "}
              {new Date(account.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Quick Domain Navigation Hub */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/trades?tradingAccountId=${account.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-slate-700/80"
            >
              <LineChart size={14} className="text-sky-400" />
              <span>Trades</span>
            </Link>

            <Link
              href={`/analytics?tradingAccountId=${account.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-slate-700/80"
            >
              <BarChart3 size={14} className="text-emerald-400" />
              <span>Analytics</span>
            </Link>

            <Link
              href={`/calendar?tradingAccountId=${account.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-slate-700/80"
            >
              <CalendarDays size={14} className="text-purple-400" />
              <span>Calendar</span>
            </Link>
          </div>
        </div>

        {/* Balance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs text-slate-400 block font-medium">Initial Balance</span>
            <div className="mt-1 text-xl font-bold font-mono text-slate-200">
              {account.initialBalance
                ? parseFloat(account.initialBalance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}{" "}
              <span className="text-xs font-normal text-slate-400">{account.currency}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs text-slate-400 block font-medium">Current Balance</span>
            <div className="mt-1 text-xl font-bold font-mono text-slate-100">
              {account.currentBalance
                ? parseFloat(account.currentBalance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}{" "}
              <span className="text-xs font-normal text-slate-400">{account.currency}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-xs text-slate-400 block font-medium">Net Balance Return</span>
            <div
              className={`mt-1 text-xl font-bold font-mono flex items-center gap-1.5 ${
                isProfit ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {hasBalances ? (
                <>
                  {isProfit ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  <span>
                    {isProfit ? "+" : ""}
                    {delta.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    ({isProfit ? "+" : ""}
                    {deltaPct.toFixed(1)}%)
                  </span>
                </>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Trading Performance & Analytics */}
      <section aria-labelledby="account-analytics-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="account-analytics-heading" className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 size={18} className="text-emerald-400" />
            <span>Trading Performance</span>
          </h2>
          <Link
            href={`/analytics?tradingAccountId=${account.id}`}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
          >
            <span>Full Analytics Report</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {/* Analytics KPIs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block uppercase font-medium">Net P&L</span>
            <span
              className={`text-lg font-bold font-mono mt-1 block ${
                isPnlPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isPnlPositive ? "+" : ""}
              {analytics?.metrics.netPnl ?? "0.00"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block uppercase font-medium">Win Rate</span>
            <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">
              {winRate.toFixed(1)}%
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block uppercase font-medium">Profit Factor</span>
            <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">
              {profitFactor}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block uppercase font-medium">Total Trades</span>
            <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">
              {totalTrades}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block uppercase font-medium">Expectancy</span>
            <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">
              {expectancy}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block uppercase font-medium">Avg R-Multiple</span>
            <span className="text-lg font-bold font-mono text-slate-100 mt-1 block">
              {analytics?.metrics.averageR ? `${analytics.metrics.averageR}R` : "—"}
            </span>
          </div>
        </div>

        {/* Equity Curve SVG */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Equity Curve (Realized Cumulative P&L)
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {equityPoints.length} trade points
            </span>
          </div>

          {equityPoints.length < 2 ? (
            <div className="flex flex-col items-center justify-center h-36 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <span>Log at least 2 closed trades in this account to render the equity curve.</span>
            </div>
          ) : (
            <div className="relative h-44 w-full">
              {(() => {
                const values = equityPoints.map((p) => parseFloat(p.cumulativePnl));
                const minVal = Math.min(0, ...values);
                const maxVal = Math.max(0, ...values);
                const range = maxVal - minVal || 1;

                const width = 800;
                const height = 150;
                const padY = 15;
                const usableHeight = height - padY * 2;

                const zeroY = padY + usableHeight - ((0 - minVal) / range) * usableHeight;

                const coords = equityPoints.map((p, idx) => {
                  const val = parseFloat(p.cumulativePnl);
                  const x = (idx / (equityPoints.length - 1)) * width;
                  const y = padY + usableHeight - ((val - minVal) / range) * usableHeight;
                  return { x, y, val };
                });

                const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
                const lastVal = values[values.length - 1];
                const isCurvePositive = lastVal >= 0;

                return (
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                    aria-label="Account Equity Curve"
                  >
                    {/* Zero baseline */}
                    <line
                      x1="0"
                      y1={zeroY}
                      x2={width}
                      y2={zeroY}
                      stroke="rgba(148, 163, 184, 0.2)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />

                    {/* Gradient area */}
                    <defs>
                      <linearGradient id={`acc-eq-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={isCurvePositive ? "#10b981" : "#f43f5e"}
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor={isCurvePositive ? "#10b981" : "#f43f5e"}
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d={`${linePath} L ${width} ${zeroY} L 0 ${zeroY} Z`}
                      fill={`url(#acc-eq-${account.id})`}
                    />

                    {/* Stroke line */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke={isCurvePositive ? "#10b981" : "#f43f5e"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                );
              })()}
            </div>
          )}
        </div>
      </section>

      {/* Recent Trades in this Account */}
      <section aria-labelledby="account-recent-trades-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="account-recent-trades-heading" className="text-base font-bold text-slate-100 flex items-center gap-2">
            <LineChart size={18} className="text-sky-400" />
            <span>Recent Trades</span>
          </h2>
          <Link
            href={`/trades?tradingAccountId=${account.id}`}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
          >
            <span>View All Trades</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400">
            No trades recorded for this account yet.{" "}
            <Link href="/trades/new" className="text-emerald-400 hover:underline font-medium ml-1">
              Add a trade
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3">Date</th>
                  <th scope="col" className="px-3 py-3">Symbol / Title</th>
                  <th scope="col" className="px-3 py-3">Side</th>
                  <th scope="col" className="px-3 py-3 text-right">Entry Price</th>
                  <th scope="col" className="px-3 py-3 text-right">Exit Price</th>
                  <th scope="col" className="px-3 py-3 text-right">Net P&L</th>
                  <th scope="col" className="px-3 py-3 text-right">R-Multiple</th>
                  <th scope="col" className="py-3 pl-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {recentTrades.map((trade) => {
                  const pnlNum = trade.netPnl ? parseFloat(trade.netPnl) : 0;
                  const isTradeProfit = pnlNum >= 0;

                  return (
                    <tr key={trade.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 pl-4 pr-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(trade.entryDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-3 py-3 font-semibold text-slate-100">
                        <Link
                          href={`/trades/${trade.id}`}
                          className="hover:text-emerald-400 transition-colors"
                        >
                          {trade.title || "Untitled Trade"}
                        </Link>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trade.side === "LONG"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {trade.side}
                        </span>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap text-right font-mono text-xs text-slate-300">
                        {trade.entryPrice}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap text-right font-mono text-xs text-slate-300">
                        {trade.exitPrice ?? "—"}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap text-right font-mono text-xs font-semibold">
                        {trade.netPnl ? (
                          <span className={isTradeProfit ? "text-emerald-400" : "text-rose-400"}>
                            {isTradeProfit ? "+" : ""}
                            {trade.netPnl}
                          </span>
                        ) : (
                          <span className="text-slate-500">OPEN</span>
                        )}
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap text-right font-mono text-xs">
                        {trade.actualRMultiple ? (
                          <span
                            className={
                              parseFloat(trade.actualRMultiple) >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }
                          >
                            {trade.actualRMultiple}R
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                        <Link
                          href={`/trades/${trade.id}`}
                          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
                        >
                          <span>Details</span>
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modals */}
      <AccountEditModal
        account={account}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={(updated) => {
          setAccount(updated);
          showToast(`Account "${updated.name}" updated successfully.`);
        }}
      />

      <AccountDeleteModal
        account={account}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={() => {
          router.push("/accounts");
        }}
      />

      <AccountStatusModal
        account={account}
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        onSuccess={(updated) => {
          setAccount(updated);
          showToast(`Account is now ${updated.isActive ? "active" : "inactive"}.`);
        }}
      />
    </div>
  );
}
