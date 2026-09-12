/**
 * Analytics Domain — Filter Toolbar Component
 *
 * Provides interactive date range presets and multi-dimensional filters
 * (Account, Symbol, Side, Status, Strategy, Setup, Tag, Mistake).
 */

"use client";

import React, { useState } from "react";
import type { AnalyticsFilterInput, FilterOptionItem } from "@/lib/client/analytics";

interface AnalyticsFilterToolbarProps {
  filters: AnalyticsFilterInput;
  options: {
    accounts: FilterOptionItem[];
    strategies: FilterOptionItem[];
    setups: FilterOptionItem[];
    tags: FilterOptionItem[];
    mistakes: FilterOptionItem[];
  };
  onFilterChange: (newFilters: AnalyticsFilterInput) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

type DatePreset = "all" | "today" | "week" | "month" | "30d" | "ytd" | "custom";

export function AnalyticsFilterToolbar({
  filters,
  options,
  onFilterChange,
  onResetFilters,
  isLoading = false,
}: AnalyticsFilterToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const [symbolInput, setSymbolInput] = useState(filters.symbol || "");
  const [prevSymbol, setPrevSymbol] = useState(filters.symbol);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>("all");

  // Sync symbol input during render if external prop changes
  if (filters.symbol !== prevSymbol) {
    setPrevSymbol(filters.symbol);
    setSymbolInput(filters.symbol || "");
  }

  // Derive active preset
  const activePreset: DatePreset = !filters.dateFrom && !filters.dateTo ? "all" : selectedPreset;

  const handlePresetSelect = (preset: DatePreset) => {
    setSelectedPreset(preset);
    const now = new Date();

    if (preset === "all") {
      onFilterChange({ ...filters, dateFrom: undefined, dateTo: undefined });
      return;
    }

    if (preset === "today") {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      onFilterChange({ ...filters, dateFrom: from, dateTo: to });
      return;
    }

    if (preset === "week") {
      const day = now.getUTCDay();
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0));
      onFilterChange({ ...filters, dateFrom: from, dateTo: undefined });
      return;
    }

    if (preset === "month") {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      onFilterChange({ ...filters, dateFrom: from, dateTo: undefined });
      return;
    }

    if (preset === "30d") {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      onFilterChange({ ...filters, dateFrom: from, dateTo: undefined });
      return;
    }

    if (preset === "ytd") {
      const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
      onFilterChange({ ...filters, dateFrom: from, dateTo: undefined });
      return;
    }

    if (preset === "custom") {
      // Leave dates untouched or prompt
    }
  };

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      ...filters,
      symbol: symbolInput.trim() || undefined,
    });
  };

  // Count active filters
  let activeFilterCount = 0;
  if (filters.dateFrom || filters.dateTo) activeFilterCount++;
  if (filters.tradingAccountId) activeFilterCount++;
  if (filters.symbol) activeFilterCount++;
  if (filters.side) activeFilterCount++;
  if (filters.status) activeFilterCount++;
  if (filters.strategyId) activeFilterCount++;
  if (filters.setupId) activeFilterCount++;
  if (filters.tagId) activeFilterCount++;
  if (filters.mistakeId) activeFilterCount++;

  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm"
      data-testid="analytics-filter-toolbar"
    >
      {/* Date Range Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <span className="text-xs font-medium text-slate-400 mr-1.5 hidden sm:inline">Range:</span>
          {(
            [
              ["all", "All Time"],
              ["30d", "Last 30 Days"],
              ["month", "This Month"],
              ["ytd", "Year to Date"],
              ["custom", "Custom"],
            ] as const
          ).map(([key, label]) => {
            const isActive = activePreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetSelect(key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-slate-700 text-slate-100 border border-slate-600"
                    : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                data-testid={`date-preset-${key}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Reset & Active Filter Count */}
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 animate-pulse mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Updating...
            </span>
          )}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium flex items-center gap-1"
              data-testid="reset-filters-btn"
            >
              <span>Reset</span>
              <span className="text-[10px] bg-rose-500/20 px-1.5 py-0.2 rounded-full font-mono">
                {activeFilterCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowMore((prev) => !prev)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 transition-colors"
          >
            {showMore ? "Fewer Filters" : "More Filters"}
          </button>
        </div>
      </div>

      {/* Primary Filter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-3">
        {/* Trading Account */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Account</label>
          <select
            value={filters.tradingAccountId || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                tradingAccountId: e.target.value || undefined,
              })
            }
            className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            data-testid="filter-account"
          >
            <option value="">All Accounts</option>
            {options.accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.currency ? `(${acc.currency})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Symbol Search */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Symbol</label>
          <form onSubmit={handleSymbolSubmit} className="relative">
            <input
              type="text"
              placeholder="e.g. AAPL"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              onBlur={() =>
                onFilterChange({
                  ...filters,
                  symbol: symbolInput.trim() || undefined,
                })
              }
              className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 uppercase font-mono placeholder:normal-case placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              data-testid="filter-symbol"
            />
          </form>
        </div>

        {/* Side */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Direction</label>
          <select
            value={filters.side || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                side: (e.target.value as "LONG" | "SHORT") || undefined,
              })
            }
            className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            data-testid="filter-side"
          >
            <option value="">All Sides</option>
            <option value="LONG">Long Only</option>
            <option value="SHORT">Short Only</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
          <select
            value={filters.status || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: (e.target.value as "CLOSED" | "OPEN" | "CANCELLED") || undefined,
              })
            }
            className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            data-testid="filter-status"
          >
            <option value="">All Statuses</option>
            <option value="CLOSED">Closed (Realized)</option>
            <option value="OPEN">Open Only</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Strategy */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Strategy</label>
          <select
            value={filters.strategyId || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                strategyId: e.target.value || undefined,
              })
            }
            className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            data-testid="filter-strategy"
          >
            <option value="">All Strategies</option>
            {options.strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Setup */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Setup</label>
          <select
            value={filters.setupId || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                setupId: e.target.value || undefined,
              })
            }
            className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            data-testid="filter-setup"
          >
            <option value="">All Setups</option>
            {options.setups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expanded Second Row */}
      {showMore && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-3 mt-3 border-t border-slate-800/80 animate-in fade-in duration-150">
          {/* Tag */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Tag</label>
            <select
              value={filters.tagId || ""}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  tagId: e.target.value || undefined,
                })
              }
              className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              data-testid="filter-tag"
            >
              <option value="">All Tags</option>
              {options.tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mistake */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Mistake</label>
            <select
              value={filters.mistakeId || ""}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  mistakeId: e.target.value || undefined,
                })
              }
              className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              data-testid="filter-mistake"
            >
              <option value="">All Mistakes</option>
              {options.mistakes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date From */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Date From</label>
            <input
              type="date"
              value={
                filters.dateFrom
                  ? (filters.dateFrom instanceof Date ? filters.dateFrom : new Date(filters.dateFrom))
                      .toISOString()
                      .slice(0, 10)
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value ? new Date(`${e.target.value}T00:00:00.000Z`) : undefined;
                setSelectedPreset("custom");
                onFilterChange({ ...filters, dateFrom: val });
              }}
              className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              data-testid="filter-date-from"
            />
          </div>

          {/* Custom Date To */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Date To</label>
            <input
              type="date"
              value={
                filters.dateTo
                  ? (filters.dateTo instanceof Date ? filters.dateTo : new Date(filters.dateTo))
                      .toISOString()
                      .slice(0, 10)
                  : ""
              }
              onChange={(e) => {
                const val = e.target.value ? new Date(`${e.target.value}T23:59:59.999Z`) : undefined;
                setSelectedPreset("custom");
                onFilterChange({ ...filters, dateTo: val });
              }}
              className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              data-testid="filter-date-to"
            />
          </div>
        </div>
      )}
    </div>
  );
}
