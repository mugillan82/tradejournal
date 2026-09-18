/**
 * Trades Client Page Component
 *
 * Primary interactive view for `/trades`.
 * Integrates client data fetching, URL query synchronization, debounced search,
 * filtering, sorting, server pagination, summary metrics, table & card view,
 * loading skeletons, empty states, and error handling.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import type {
  TradeDto,
  TradeListFilters,
  TradeSortField,
  SortDirection,
  TradeSideValue,
  TradeStatusValue,
} from "@/lib/trading/trade/types";

import type { TradingAccountDto } from "@/lib/trading/account/types";
import { fetchTrades, fetchTradingAccounts, TradeClientApiError } from "@/lib/client/trades";
import { TradeSummary } from "./trade-summary";
import { TradeFilterToolbar } from "./trade-filter-toolbar";
import { TradeTable } from "./trade-table";
import { TradeCardList } from "./trade-card-list";
import { TradePagination } from "./trade-pagination";
import { TradeSkeleton } from "./trade-skeleton";
import { TradeEmptyState } from "./trade-empty-state";
import { TradeErrorState } from "./trade-error-state";
import { DeleteTradeDialog } from "./delete-trade-dialog";
import { BatchDeleteTradesDialog } from "./batch-delete-trades-dialog";
import { PlusCircle, Download, Trash2, X } from "@/components/icons";
import { StrokeText } from "@/components/ui/stroke-text";

const DEBOUNCE_MS = 300;

export function TradesClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial filters from URL params
  const initialAccountId = searchParams.get("tradingAccountId") || undefined;
  const initialSide = (searchParams.get("side") as TradeSideValue) || undefined;
  const initialStatus = (searchParams.get("status") as TradeStatusValue) || undefined;
  const initialSearch = searchParams.get("search") || "";
  const initialDateFromStr = searchParams.get("entryDateFrom");
  const initialDateToStr = searchParams.get("entryDateTo");
  const initialSortField = (searchParams.get("sortField") as TradeSortField) || "entryDate";
  const initialSortDirection = (searchParams.get("sortDirection") as SortDirection) || "desc";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  const initialPageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  const [filters, setFilters] = useState<TradeListFilters>({
    tradingAccountId: initialAccountId,
    side: initialSide,
    status: initialStatus,
    search: initialSearch || undefined,
    entryDateFrom: initialDateFromStr ? new Date(initialDateFromStr) : undefined,
    entryDateTo: initialDateToStr ? new Date(initialDateToStr) : undefined,
  });

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortField, setSortField] = useState<TradeSortField>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [page, setPage] = useState(isNaN(initialPage) ? 1 : initialPage);
  const [pageSize, setPageSize] = useState(isNaN(initialPageSize) ? 50 : initialPageSize);

  const [trades, setTrades] = useState<ReadonlyArray<TradeDto>>([]);
  const [accounts, setAccounts] = useState<ReadonlyArray<TradingAccountDto>>([]);
  const [total, setTotal] = useState(0);

  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [deletingTrade, setDeletingTrade] = useState<TradeDto | null>(null);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update URL params
  const updateUrlParams = useCallback(
    (
      newFilters: TradeListFilters,
      newSortField: TradeSortField,
      newSortDir: SortDirection,
      newPage: number,
      newPageSize: number,
    ) => {
      const params = new URLSearchParams();
      if (newFilters.tradingAccountId) params.set("tradingAccountId", newFilters.tradingAccountId);
      if (newFilters.side) params.set("side", newFilters.side);
      if (newFilters.status) {
        params.set(
          "status",
          Array.isArray(newFilters.status) ? newFilters.status.join(",") : String(newFilters.status),
        );
      }
      if (newFilters.search) params.set("search", newFilters.search);
      if (newFilters.entryDateFrom) params.set("entryDateFrom", newFilters.entryDateFrom.toISOString());
      if (newFilters.entryDateTo) params.set("entryDateTo", newFilters.entryDateTo.toISOString());

      params.set("sortField", newSortField);
      params.set("sortDirection", newSortDir);
      params.set("page", String(newPage));
      params.set("pageSize", String(newPageSize));

      router.replace(`/trades?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    let isMounted = true;

    async function executeLoad() {
      setIsLoading(true);
      setError(null);

      try {
        const [result, accs] = await Promise.all([
          fetchTrades({
            filters,
            sort: { field: sortField, direction: sortDirection },
            pagination: { page, pageSize },
          }),
          fetchTradingAccounts(),
        ]);

        if (isMounted) {
          setTrades(result.items);
          setTotal(result.total);
          setAccounts(accs);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (err instanceof TradeClientApiError) {
            setError(err.message);
          } else {
            setError("Failed to load trade records. Please check your network connection.");
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    executeLoad();

    return () => {
      isMounted = false;
    };
  }, [filters, sortField, sortDirection, page, pageSize]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetchTrades({
        filters,
        sort: { field: sortField, direction: sortDirection },
        pagination: { page, pageSize },
      }),
      fetchTradingAccounts(),
    ])
      .then(([result, accs]) => {
        setTrades(result.items);
        setTotal(result.total);
        setAccounts(accs);
      })
      .catch((err: unknown) => {
        if (err instanceof TradeClientApiError) {
          setError(err.message);
        } else {
          setError("Failed to load trade records. Please check your network connection.");
        }
      })
      .finally(() => setIsLoading(false));
  };

  // Handle Search Input Change with Debounce
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const updated = {
        ...filters,
        search: query.trim() || undefined,
      };
      setFilters(updated);
      setPage(1);
      updateUrlParams(updated, sortField, sortDirection, 1, pageSize);
    }, DEBOUNCE_MS);
  };

  // Handle Filter Changes
  const handleFilterChange = (newFilters: TradeListFilters) => {
    setFilters(newFilters);
    setPage(1);
    updateUrlParams(newFilters, sortField, sortDirection, 1, pageSize);
  };

  // Clear All Filters
  const handleClearFilters = () => {
    const emptyFilters: TradeListFilters = {};
    setSearchQuery("");
    setFilters(emptyFilters);
    setPage(1);
    updateUrlParams(emptyFilters, sortField, sortDirection, 1, pageSize);
  };

  // Handle Sorting Toggle
  const handleSortChange = (field: TradeSortField) => {
    let nextDir: SortDirection = "desc";
    if (sortField === field) {
      nextDir = sortDirection === "asc" ? "desc" : "asc";
    }
    setSortField(field);
    setSortDirection(nextDir);
    setPage(1);
    updateUrlParams(filters, field, nextDir, 1, pageSize);
  };

  // Handle Page Change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams(filters, sortField, sortDirection, newPage, pageSize);
  };

  // Handle Page Size Change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    updateUrlParams(filters, sortField, sortDirection, 1, newPageSize);
  };

  // Selection handlers
  const handleToggleSelectTrade = (id: string) => {
    setSelectedTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedTradeIds.size === trades.length && trades.length > 0) {
      setSelectedTradeIds(new Set());
    } else {
      setSelectedTradeIds(new Set(trades.map((t) => t.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedTradeIds(new Set());
  };

  const handleSingleTradeDeleted = () => {
    if (deletingTrade) {
      const idToRemove = deletingTrade.id;
      setTrades((prev) => prev.filter((t) => t.id !== idToRemove));
      setSelectedTradeIds((prev) => {
        const next = new Set(prev);
        next.delete(idToRemove);
        return next;
      });
      setTotal((prev) => Math.max(0, prev - 1));
      setDeletingTrade(null);
    }
  };

  const handleBatchTradesDeleted = (deletedIds: string[]) => {
    const deletedSet = new Set(deletedIds);
    setTrades((prev) => prev.filter((t) => !deletedSet.has(t.id)));
    setSelectedTradeIds((prev) => {
      const next = new Set(prev);
      deletedIds.forEach((id) => next.delete(id));
      return next;
    });
    setTotal((prev) => Math.max(0, prev - deletedIds.length));
    setIsBatchDeleteOpen(false);
  };

  const isFiltered = Boolean(
    filters.tradingAccountId ||
      filters.side ||
      filters.status ||
      filters.search ||
      filters.entryDateFrom ||
      filters.entryDateTo,
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl flex items-center min-h-[36px]">
            <StrokeText
              text="Trade Log"
              fontSize={28}
              fontWeight={700}
              strokeColor="#a855f7"
              fillColor="#f8fafc"
              strokeWidth={1.3}
              drawDuration={1.2}
              fillDelay={0.15}
              fillMode="wipe"
              trigger="mount"
              replayOnHover
            />
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            View, filter, and manage your complete trade execution record.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/import/smart"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <Download size={16} />
            <span>Import</span>
          </Link>

          <Link
            href="/trades/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/40"
          >
            <PlusCircle size={16} />
            <span>Add Trade</span>
          </Link>
        </div>
      </div>

      {/* 2. Summary Cards */}
      <TradeSummary trades={trades} total={total} isLoading={isLoading} />

      {/* 3. Filter Toolbar */}
      <TradeFilterToolbar
        filters={filters}
        accounts={accounts}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Batch Selection Action Bar */}
      {selectedTradeIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-indigo-500/30 bg-indigo-950/40 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {selectedTradeIds.size} selected
            </span>
            <p className="text-sm text-slate-300 hidden sm:inline">
              {selectedTradeIds.size === 1
                ? "1 trade selected for action"
                : `${selectedTradeIds.size} trades selected for action`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBatchDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 hover:border-rose-500/60 transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete Selected ({selectedTradeIds.size})</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Deselect all"
            >
              <X size={14} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Table / Cards Content Area */}
      {isLoading ? (
        <TradeSkeleton />
      ) : error ? (
        <TradeErrorState message={error} onRetry={handleRetry} />
      ) : trades.length === 0 ? (
        <TradeEmptyState isFiltered={isFiltered} onClearFilters={handleClearFilters} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <TradeTable
              trades={trades}
              accounts={accounts}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              selectedTradeIds={selectedTradeIds}
              onToggleSelectTrade={handleToggleSelectTrade}
              onToggleSelectAll={handleToggleSelectAll}
              onDeleteTrade={(trade) => setDeletingTrade(trade)}
            />
          </div>

          {/* Mobile Cards View */}
          <TradeCardList
            trades={trades}
            accounts={accounts}
            selectedTradeIds={selectedTradeIds}
            onToggleSelectTrade={handleToggleSelectTrade}
            onDeleteTrade={(trade) => setDeletingTrade(trade)}
          />

          {/* 5. Pagination */}
          <TradePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}

      {/* Single Trade Deletion Dialog */}
      {deletingTrade && (
        <DeleteTradeDialog
          trade={deletingTrade}
          isOpen={Boolean(deletingTrade)}
          onClose={() => setDeletingTrade(null)}
          onSuccess={handleSingleTradeDeleted}
        />
      )}

      {/* Batch Trades Deletion Dialog */}
      <BatchDeleteTradesDialog
        selectedIds={Array.from(selectedTradeIds)}
        isOpen={isBatchDeleteOpen}
        onClose={() => setIsBatchDeleteOpen(false)}
        onSuccess={handleBatchTradesDeleted}
      />
    </div>
  );
}
