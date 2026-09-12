/**
 * Analytics Domain — Analytics Client Page Component
 *
 * Interactive orchestrator for the `/analytics` page.
 * Synchronizes filter state with URL parameters, manages data fetching
 * with AbortController stale-request protection, and renders KPIs,
 * charts, and multi-dimensional breakdowns.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  fetchAnalyticsOverview,
  fetchFilterOptions,
  buildAnalyticsQueryString,
  type AnalyticsFilterInput,
  type AnalyticsOverviewDto,
  type FilterOptionItem,
  AnalyticsClientApiError,
} from "@/lib/client/analytics";

import { AnalyticsKpiGrid } from "./analytics-kpi-grid";
import { AnalyticsPerformanceChart } from "./analytics-performance-chart";
import { AnalyticsSummaryCards } from "./analytics-summary-cards";
import { AnalyticsFilterToolbar } from "./analytics-filter-toolbar";
import { AnalyticsBreakdownsSection } from "./analytics-breakdowns-section";
import { AnalyticsSkeleton } from "./analytics-skeleton";
import { AnalyticsEmptyState } from "./analytics-empty-state";
import { AnalyticsErrorState } from "./analytics-error-state";

export function AnalyticsClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // SearchParams string for stable memoization
  const searchParamsString = searchParams.toString();

  // Filters parsed from URL
  const filters = useMemo((): AnalyticsFilterInput => {
    const params = new URLSearchParams(searchParamsString);
    const result: Record<string, unknown> = {};

    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    const tradingAccountId = params.get("tradingAccountId");
    const symbol = params.get("symbol");
    const side = params.get("side");
    const status = params.get("status");
    const strategyId = params.get("strategyId");
    const setupId = params.get("setupId");
    const tagId = params.get("tagId");
    const mistakeId = params.get("mistakeId");

    if (dateFrom) result.dateFrom = new Date(dateFrom);
    if (dateTo) result.dateTo = new Date(dateTo);
    if (tradingAccountId) result.tradingAccountId = tradingAccountId;
    if (symbol) result.symbol = symbol;
    if (side === "LONG" || side === "SHORT") result.side = side;
    if (status === "OPEN" || status === "CLOSED" || status === "CANCELLED") result.status = status;
    if (strategyId) result.strategyId = strategyId;
    if (setupId) result.setupId = setupId;
    if (tagId) result.tagId = tagId;
    if (mistakeId) result.mistakeId = mistakeId;

    return result as AnalyticsFilterInput;
  }, [searchParamsString]);

  const [overview, setOverview] = useState<AnalyticsOverviewDto | null>(null);
  const [filterOptions, setFilterOptions] = useState<{
    accounts: FilterOptionItem[];
    strategies: FilterOptionItem[];
    setups: FilterOptionItem[];
    tags: FilterOptionItem[];
    mistakes: FilterOptionItem[];
  }>({
    accounts: [],
    strategies: [],
    setups: [],
    tags: [],
    mistakes: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Load filter options once
  useEffect(() => {
    const controller = new AbortController();
    fetchFilterOptions(controller.signal).then(setFilterOptions);
    return () => controller.abort();
  }, []);

  // Update URL search parameters when filters change
  const updateUrlParams = useCallback(
    (newFilters: AnalyticsFilterInput) => {
      const qs = buildAnalyticsQueryString(newFilters);
      const targetUrl = qs ? `${pathname}?${qs}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [pathname, router],
  );

  // Fetch analytics data whenever filters or reloadTrigger change
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function runFetch() {
      setIsRefreshing(true);
      setError(null);

      try {
        const data = await fetchAnalyticsOverview(filters, controller.signal);
        if (!ignore) {
          setOverview(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
          const msg =
            err instanceof AnalyticsClientApiError
              ? err.message
              : "Failed to load analytics. Please try again.";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    runFetch();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [filters, reloadTrigger]);

  const handleFilterChange = (newFilters: AnalyticsFilterInput) => {
    updateUrlParams(newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters: AnalyticsFilterInput = {};
    updateUrlParams(emptyFilters);
  };

  const handleReload = () => {
    setReloadTrigger((prev) => prev + 1);
  };

  if (isLoading && overview === null && !error) {
    return <AnalyticsSkeleton />;
  }

  const hasActiveFilters = Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.tradingAccountId ||
      filters.symbol ||
      filters.side ||
      filters.status ||
      filters.strategyId ||
      filters.setupId ||
      filters.tagId ||
      filters.mistakeId,
  );

  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6"
      data-testid="analytics-page"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>Analytics & Performance</span>
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-normal">
                <svg
                  className="animate-spin h-3 w-3 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Refreshing...
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Production performance engine evaluating realized P&L, edge metrics, and equity curve
          </p>
        </div>

        <button
          type="button"
          onClick={handleReload}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 shadow-sm"
          data-testid="analytics-refresh-btn"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filter Toolbar */}
      <AnalyticsFilterToolbar
        filters={filters}
        options={filterOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isLoading={isRefreshing}
      />

      {/* Error state */}
      {error && (
        <AnalyticsErrorState
          message={error}
          onRetry={handleReload}
        />
      )}

      {/* Empty state or Main Dashboard */}
      {!error && overview && (
        <>
          {overview.metrics.totalTrades === 0 ? (
            <AnalyticsEmptyState
              hasFilters={hasActiveFilters}
              onResetFilters={handleResetFilters}
            />
          ) : (
            <div className="space-y-5 sm:space-y-6">
              {/* Primary KPI Grid (8 metrics) */}
              <AnalyticsKpiGrid metrics={overview.metrics} />

              {/* Performance Equity Curve Chart */}
              <AnalyticsPerformanceChart
                equityCurve={overview.equityCurve}
                hasInitialBalance={Boolean(filters.tradingAccountId)}
              />

              {/* Summary Insights (Drawdown, Streaks, Durations, Risk) */}
              <AnalyticsSummaryCards metrics={overview.metrics} />

              {/* Multi-dimensional Breakdowns (Symbol, Strategy, Setup, Tag, Mistake, Account, Long/Short, Daily) */}
              <AnalyticsBreakdownsSection
                metrics={overview.metrics}
                byDate={overview.byDate}
                bySymbol={overview.bySymbol}
                byStrategy={overview.byStrategy}
                bySetup={overview.bySetup}
                byTag={overview.byTag}
                byMistake={overview.byMistake}
                byAccount={overview.byAccount}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
