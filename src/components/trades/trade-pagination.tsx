/**
 * Trade Pagination Component
 *
 * Controls server-side pagination (page, pageSize, total).
 */

"use client";

import { ChevronLeft, ChevronRight } from "@/components/icons";

interface TradePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function TradePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: TradePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-xs text-slate-400">
      {/* Record info & page size */}
      <div className="flex items-center gap-4">
        <p>
          Showing <span className="font-semibold text-slate-200">{startItem}</span> to{" "}
          <span className="font-semibold text-slate-200">{endItem}</span> of{" "}
          <span className="font-semibold text-slate-200">{total}</span> trades
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <label htmlFor="page-size-select" className="text-slate-500">
              Per page:
            </label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
          <span>Previous</span>
        </button>

        <span className="px-2 text-slate-400">
          Page <span className="font-semibold text-slate-200">{page}</span> of{" "}
          <span className="font-semibold text-slate-200">{totalPages}</span>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
