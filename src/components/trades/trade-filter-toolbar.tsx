/**
 * Trade Filter Toolbar
 *
 * Exposes existing API-supported filters:
 * - account
 * - side (LONG / SHORT)
 * - status (OPEN / CLOSED / CANCELLED)
 * - search (text search over title/notes)
 * - date range (entryDateFrom / entryDateTo)
 *
 * Shows active filter chips and clear actions.
 */

"use client";

import type { TradeListFilters, TradeSideValue, TradeStatusValue } from "@/lib/trading/trade/types";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import { Search, Filter, X as XIcon } from "@/components/icons";

interface TradeFilterToolbarProps {
  filters: TradeListFilters;
  accounts: ReadonlyArray<TradingAccountDto>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterChange: (filters: TradeListFilters) => void;
  onClearFilters: () => void;
}

export function TradeFilterToolbar({
  filters,
  accounts,
  searchQuery,
  onSearchChange,
  onFilterChange,
  onClearFilters,
}: TradeFilterToolbarProps) {
  const hasActiveFilters = Boolean(
    filters.tradingAccountId ||
      filters.side ||
      filters.status ||
      filters.search ||
      filters.entryDateFrom ||
      filters.entryDateTo,
  );

  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      tradingAccountId: val === "ALL" ? undefined : val,
    });
  };

  const handleSideChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      side: val === "ALL" ? undefined : (val as TradeSideValue),
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      status: val === "ALL" ? undefined : (val as TradeStatusValue),
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      entryDateFrom: val ? new Date(val) : undefined,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onFilterChange({
      ...filters,
      entryDateTo: val ? new Date(val) : undefined,
    });
  };

  const selectedAccount = accounts.find((a) => a.id === filters.tradingAccountId);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 mb-6 space-y-4">
      {/* Search and primary filter bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search trades by title or notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label="Clear search text"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* Account Select */}
        <div>
          <label htmlFor="filter-account" className="sr-only">
            Trading Account
          </label>
          <select
            id="filter-account"
            value={filters.tradingAccountId ?? "ALL"}
            onChange={handleAccountChange}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
          >
            <option value="ALL">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>
        </div>

        {/* Side Select */}
        <div>
          <label htmlFor="filter-side" className="sr-only">
            Trade Side
          </label>
          <select
            id="filter-side"
            value={filters.side ?? "ALL"}
            onChange={handleSideChange}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
          >
            <option value="ALL">All Sides</option>
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
        </div>

        {/* Status Select */}
        <div>
          <label htmlFor="filter-status" className="sr-only">
            Trade Status
          </label>
          <select
            id="filter-status"
            value={
              typeof filters.status === "string" ? filters.status : "ALL"
            }
            onChange={handleStatusChange}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Date Range controls + active filter chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5 mr-1">
            <Filter size={14} className="text-slate-500" />
            Date Range:
          </span>

          <input
            type="date"
            aria-label="From date"
            value={
              filters.entryDateFrom
                ? filters.entryDateFrom.toISOString().substring(0, 10)
                : ""
            }
            onChange={handleDateFromChange}
            className="rounded-md border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            aria-label="To date"
            value={
              filters.entryDateTo
                ? filters.entryDateTo.toISOString().substring(0, 10)
                : ""
            }
            onChange={handleDateToChange}
            className="rounded-md border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Active filters:</span>
            {selectedAccount && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
                Account: {selectedAccount.name}
              </span>
            )}
            {filters.side && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
                Side: {filters.side}
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
                Status: {Array.isArray(filters.status) ? filters.status.join(", ") : filters.status}
              </span>
            )}
            {filters.search && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 border border-emerald-500/20">
                Search: &quot;{filters.search}&quot;
              </span>
            )}
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-medium text-slate-400 hover:text-rose-400 underline transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
