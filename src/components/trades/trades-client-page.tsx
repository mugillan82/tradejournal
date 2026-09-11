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
import { PlusCircle, Download } from "@/components/icons";

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Trade Log
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
            />
          </div>

          {/* Mobile Cards View */}
          <TradeCardList trades={trades} accounts={accounts} />

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
    </div>
  );
}
