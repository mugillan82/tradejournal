/**
 * Trade Empty State Component
 *
 * Dedicated views for:
 * 1. `isFiltered = false`: Zero total trade records exist.
 * 2. `isFiltered = true`: Current filters return no matching records.
 */

import Link from "next/link";
import { PlusCircle, Filter } from "@/components/icons";

interface TradeEmptyStateProps {
  isFiltered: boolean;
  onClearFilters?: () => void;
}

export function TradeEmptyState({ isFiltered, onClearFilters }: TradeEmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 sm:p-12 text-center my-6">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4">
          <Filter size={24} />
        </div>
        <h3 className="text-base font-semibold text-slate-200">No matching trades found</h3>
        <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
          No trade records match your currently active filters. Try adjusting your criteria or clearing filters.
        </p>
        {onClearFilters && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 sm:p-12 text-center my-6">
      <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
        <PlusCircle size={24} />
      </div>
      <h3 className="text-base font-semibold text-slate-100">No trade records yet</h3>
      <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
        Your journal is empty. Log your first execution to start tracking performance, R-multiples, and strategy metrics.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/trades/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/40"
        >
          <PlusCircle size={16} />
          <span>Add Your First Trade</span>
        </Link>
        <Link
          href="/import/smart"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          <span>Import Trades</span>
        </Link>
      </div>
    </div>
  );
}
