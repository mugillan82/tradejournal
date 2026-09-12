/**
 * Analytics Domain — Breakdowns & Performance Dimensions Section
 *
 * Tabbed breakdown views across 8 dimensions:
 * 1. By Symbol
 * 2. By Strategy
 * 3. By Setup
 * 4. By Tag
 * 5. By Mistake
 * 6. By Account
 * 7. Long vs Short
 * 8. Daily Performance
 */

"use client";

import React, { useState } from "react";
import type {
  CorePerformanceMetricsDto,
  PerformanceByAccountItemDto,
  PerformanceByDateItemDto,
  PerformanceByMistakeItemDto,
  PerformanceBySetupItemDto,
  PerformanceByStrategyItemDto,
  PerformanceBySymbolItemDto,
  PerformanceByTagItemDto,
} from "@/lib/client/analytics";

interface AnalyticsBreakdownsSectionProps {
  metrics: CorePerformanceMetricsDto;
  byDate: ReadonlyArray<PerformanceByDateItemDto>;
  bySymbol: ReadonlyArray<PerformanceBySymbolItemDto>;
  byStrategy: ReadonlyArray<PerformanceByStrategyItemDto>;
  bySetup: ReadonlyArray<PerformanceBySetupItemDto>;
  byTag: ReadonlyArray<PerformanceByTagItemDto>;
  byMistake: ReadonlyArray<PerformanceByMistakeItemDto>;
  byAccount: ReadonlyArray<PerformanceByAccountItemDto>;
}

type BreakdownTab =
  | "symbol"
  | "strategy"
  | "setup"
  | "tag"
  | "mistake"
  | "account"
  | "direction"
  | "daily";

function formatCurrency(amountStr: string | null | undefined): {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
} {
  if (!amountStr) return { formatted: "$0.00", isPositive: false, isNegative: false };
  const num = parseFloat(amountStr);
  if (isNaN(num)) return { formatted: "$0.00", isPositive: false, isNegative: false };
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return {
    formatted: isNeg ? `-${formatted}` : formatted,
    isPositive: num > 0,
    isNegative: num < 0,
  };
}

export function AnalyticsBreakdownsSection({
  metrics,
  byDate,
  bySymbol,
  byStrategy,
  bySetup,
  byTag,
  byMistake,
  byAccount,
}: AnalyticsBreakdownsSectionProps) {
  const [activeTab, setActiveTab] = useState<BreakdownTab>("symbol");

  const tabs: Array<{ id: BreakdownTab; label: string; count?: number }> = [
    { id: "symbol", label: "Symbol", count: bySymbol.length },
    { id: "strategy", label: "Strategy", count: byStrategy.length },
    { id: "setup", label: "Setup", count: bySetup.length },
    { id: "tag", label: "Tag", count: byTag.length },
    { id: "mistake", label: "Mistake", count: byMistake.length },
    { id: "account", label: "Account", count: byAccount.length },
    { id: "direction", label: "Long vs Short" },
    { id: "daily", label: "Daily", count: byDate.length },
  ];

  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-sm"
      data-testid="analytics-breakdowns-section"
    >
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Performance Breakdown
          </h3>
          <p className="text-xs text-slate-400">
            Multi-dimensional analysis by instrument, classification, side, and timeline
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                data-testid={`breakdown-tab-${tab.id}`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1 rounded font-mono ${
                      isActive
                        ? "bg-indigo-700 text-indigo-100"
                        : "bg-slate-700/60 text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {/* 1. BY SYMBOL */}
        {activeTab === "symbol" && (
          <div className="overflow-x-auto">
            {bySymbol.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No symbol data available</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Trades</th>
                    <th className="py-2.5 px-3">Win Rate</th>
                    <th className="py-2.5 px-3">Profit Factor</th>
                    <th className="py-2.5 px-3 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {bySymbol.map((item) => {
                    const pnlInfo = formatCurrency(item.netPnl);
                    return (
                      <tr key={item.symbol} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-200 font-mono">
                          {item.symbol}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.tradeCount}{" "}
                          <span className="text-[11px] text-slate-500">
                            ({item.winCount}W · {item.lossCount}L)
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 rounded-full"
                                style={{ width: `${Math.min(100, item.winRate)}%` }}
                              />
                            </div>
                            <span className="font-mono text-slate-300">{item.winRate}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {item.profitFactor ?? "—"}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-semibold ${
                            pnlInfo.isPositive
                              ? "text-emerald-400"
                              : pnlInfo.isNegative
                              ? "text-rose-400"
                              : "text-slate-300"
                          }`}
                        >
                          {pnlInfo.formatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 2. BY STRATEGY */}
        {activeTab === "strategy" && (
          <div className="overflow-x-auto">
            {byStrategy.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No strategy data available</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Strategy</th>
                    <th className="py-2.5 px-3">Trades</th>
                    <th className="py-2.5 px-3">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {byStrategy.map((item) => {
                    const pnlInfo = formatCurrency(item.netPnl);
                    return (
                      <tr key={item.strategyId ?? "none"} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          {item.strategyName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.tradeCount}{" "}
                          <span className="text-[11px] text-slate-500">
                            ({item.winCount}W · {item.lossCount}L)
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-slate-300">{item.winRate}%</span>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-semibold ${
                            pnlInfo.isPositive
                              ? "text-emerald-400"
                              : pnlInfo.isNegative
                              ? "text-rose-400"
                              : "text-slate-300"
                          }`}
                        >
                          {pnlInfo.formatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 3. BY SETUP */}
        {activeTab === "setup" && (
          <div className="overflow-x-auto">
            {bySetup.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No setup data available</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Setup</th>
                    <th className="py-2.5 px-3">Trades</th>
                    <th className="py-2.5 px-3">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {bySetup.map((item) => {
                    const pnlInfo = formatCurrency(item.netPnl);
                    return (
                      <tr key={item.setupId ?? "none"} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          {item.setupName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.tradeCount}{" "}
                          <span className="text-[11px] text-slate-500">
                            ({item.winCount}W · {item.lossCount}L)
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-slate-300">{item.winRate}%</span>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-semibold ${
                            pnlInfo.isPositive
                              ? "text-emerald-400"
                              : pnlInfo.isNegative
                              ? "text-rose-400"
                              : "text-slate-300"
                          }`}
                        >
                          {pnlInfo.formatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 4. BY TAG */}
        {activeTab === "tag" && (
          <div className="overflow-x-auto">
            {byTag.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No tag data available</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Tag</th>
                    <th className="py-2.5 px-3">Trades</th>
                    <th className="py-2.5 px-3">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {byTag.map((item) => {
                    const pnlInfo = formatCurrency(item.netPnl);
                    return (
                      <tr key={item.tagId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-200 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.tagColor || "#64748b" }}
                          />
                          <span>{item.tagName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{item.tradeCount}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{item.winRate}%</td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-semibold ${
                            pnlInfo.isPositive
                              ? "text-emerald-400"
                              : pnlInfo.isNegative
                              ? "text-rose-400"
                              : "text-slate-300"
                          }`}
                        >
                          {pnlInfo.formatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 5. BY MISTAKE */}
        {activeTab === "mistake" && (
          <div className="overflow-x-auto">
            {byMistake.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No mistake tags recorded</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Mistake</th>
                    <th className="py-2.5 px-3">Occurrences</th>
                    <th className="py-2.5 px-3">Net Impact</th>
                    <th className="py-2.5 px-3 text-right">Total Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {byMistake.map((item) => {
                    const pnlInfo = formatCurrency(item.netPnl);
                    const lossInfo = formatCurrency(item.totalLoss);
                    return (
                      <tr key={item.mistakeId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          {item.mistakeName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{item.tradeCount}</td>
                        <td
                          className={`py-2.5 px-3 font-mono font-semibold ${
                            pnlInfo.isPositive
                              ? "text-emerald-400"
                              : pnlInfo.isNegative
                              ? "text-rose-400"
                              : "text-slate-300"
                          }`}
                        >
                          {pnlInfo.formatted}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-400 font-semibold">
                          -{lossInfo.formatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 6. BY ACCOUNT */}
        {activeTab === "account" && (
          <div className="overflow-x-auto">
            {byAccount.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No account data available</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Currency</th>
                    <th className="py-2.5 px-3">Trades</th>
                    <th className="py-2.5 px-3">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {byAccount.map((item) => {
                    const pnlInfo = formatCurrency(item.netPnl);
                    return (
                      <tr key={item.tradingAccountId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-200">
                          {item.accountName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{item.currency}</td>
                        <td className="py-2.5 px-3 text-slate-300">{item.tradeCount}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{item.winRate}%</td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-semibold ${
                            pnlInfo.isPositive
                              ? "text-emerald-400"
                              : pnlInfo.isNegative
                              ? "text-rose-400"
                              : "text-slate-300"
                          }`}
                        >
                          {pnlInfo.formatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 7. LONG VS SHORT */}
        {activeTab === "direction" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* Long Card */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-800/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Long Trades
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {metrics.longTradeCount} Trades
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Win Rate</span>
                  <span className="text-lg font-bold font-mono text-slate-200">
                    {metrics.longTradeCount > 0 ? `${metrics.longWinRate}%` : "—"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Net P&L</span>
                  <span
                    className={`text-lg font-bold font-mono ${
                      parseFloat(metrics.longNetPnl) > 0
                        ? "text-emerald-400"
                        : parseFloat(metrics.longNetPnl) < 0
                        ? "text-rose-400"
                        : "text-slate-200"
                    }`}
                  >
                    {formatCurrency(metrics.longNetPnl).formatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Short Card */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-800/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  Short Trades
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {metrics.shortTradeCount} Trades
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Win Rate</span>
                  <span className="text-lg font-bold font-mono text-slate-200">
                    {metrics.shortTradeCount > 0 ? `${metrics.shortWinRate}%` : "—"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Net P&L</span>
                  <span
                    className={`text-lg font-bold font-mono ${
                      parseFloat(metrics.shortNetPnl) > 0
                        ? "text-emerald-400"
                        : parseFloat(metrics.shortNetPnl) < 0
                        ? "text-rose-400"
                        : "text-slate-200"
                    }`}
                  >
                    {formatCurrency(metrics.shortNetPnl).formatted}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. DAILY PERFORMANCE */}
        {activeTab === "daily" && (
          <div className="overflow-x-auto">
            {byDate.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No daily records available</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Trades</th>
                    <th className="py-2.5 px-3">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {byDate.map((item) => {
                    const pnlInfo = formatCurrency(item.netPnl);
                    return (
                      <tr key={item.date} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                          {item.date}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {item.tradeCount}{" "}
                          <span className="text-[11px] text-slate-500">
                            ({item.winCount}W · {item.lossCount}L)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{item.winRate}%</td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-semibold ${
                            pnlInfo.isPositive
                              ? "text-emerald-400"
                              : pnlInfo.isNegative
                              ? "text-rose-400"
                              : "text-slate-300"
                          }`}
                        >
                          {pnlInfo.formatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
