/**
 * Calendar Domain — Filter Toolbar Component
 *
 * Provides multi-dimensional filters (Account, Symbol, Direction, Status, Strategy, Setup, Tag, Mistake)
 * with active filter count and reset capabilities.
 */

"use client";

import React, { useState } from "react";
import type { CalendarFilterInput } from "@/lib/client/calendar";
import type { FilterOptionItem } from "@/lib/client/analytics";

interface CalendarFilterToolbarProps {
  filters: CalendarFilterInput;
  options: {
    accounts: FilterOptionItem[];
    strategies: FilterOptionItem[];
    setups: FilterOptionItem[];
    tags: FilterOptionItem[];
    mistakes: FilterOptionItem[];
  };
  onFilterChange: (newFilters: CalendarFilterInput) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

export function CalendarFilterToolbar({
  filters,
  options,
  onFilterChange,
  onResetFilters,
  isLoading = false,
}: CalendarFilterToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const [symbolInput, setSymbolInput] = useState(filters.symbol || "");
  const [prevSymbol, setPrevSymbol] = useState(filters.symbol);

  // Sync symbol input during render if external prop changes
  if (filters.symbol !== prevSymbol) {
    setPrevSymbol(filters.symbol);
    setSymbolInput(filters.symbol || "");
  }

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      ...filters,
      symbol: symbolInput.trim() || undefined,
    });
  };

  // Count active filters
  let activeFilterCount = 0;
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
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 shadow-sm space-y-3"
      data-testid="calendar-filter-toolbar"
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Filters</span>
          {activeFilterCount > 0 && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
              {activeFilterCount} active
            </span>
          )}
        </div>

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
              className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
              data-testid="calendar-reset-filters-btn"
            >
              Reset All
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

      {/* Primary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {/* Account */}
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
            data-testid="filter-calendar-account"
          >
            <option value="">All Accounts</option>
            {options.accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} {acc.currency ? `(${acc.currency})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Symbol */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Symbol</label>
          <form onSubmit={handleSymbolSubmit} className="relative">
            <input
              type="text"
              placeholder="e.g. NVDA"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value)}
              onBlur={() =>
                onFilterChange({
                  ...filters,
                  symbol: symbolInput.trim() || undefined,
                })
              }
              className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 uppercase font-mono placeholder:normal-case placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              data-testid="filter-calendar-symbol"
            />
          </form>
        </div>

        {/* Direction */}
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
            data-testid="filter-calendar-side"
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
                status: (e.target.value as "OPEN" | "CLOSED" | "CANCELLED") || undefined,
              })
            }
            className="w-full h-8 px-2 rounded-lg bg-slate-800 border border-slate-700/80 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            data-testid="filter-calendar-status"
          >
            <option value="">All Statuses</option>
            <option value="CLOSED">Closed Only</option>
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
            data-testid="filter-calendar-strategy"
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
            data-testid="filter-calendar-setup"
          >
            <option value="">All Setups</option>
            {options.setups.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Extended Filters Row */}
      {showMore && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/60">
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
              data-testid="filter-calendar-tag"
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
              data-testid="filter-calendar-mistake"
            >
              <option value="">All Mistakes</option>
              {options.mistakes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
