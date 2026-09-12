/**
 * Reports Domain — Client Page Component
 *
 * Interactive orchestrator for `/reports`.
 * Manages URL query synchronization for active report tab and dimensional filters,
 * stale-request protection with AbortController, and renders 9 specialized reports.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  fetchReportOverview,
  buildReportQueryString,
  type ReportOverviewDto,
  type ReportFilterInput,
  type SymbolReportItemDto,
  type StrategyReportItemDto,
  type SetupReportItemDto,
  type TagReportItemDto,
  type MistakeReportItemDto,
  type AccountReportItemDto,
  ReportClientApiError,
} from "@/lib/client/reports";
import { fetchFilterOptions, type FilterOptionItem } from "@/lib/client/analytics";

import { ReportsHeader } from "./reports-header";
import { ReportsTabNavigation, type ReportTabKey } from "./reports-tab-navigation";
import { AnalyticsFilterToolbar } from "../analytics/analytics-filter-toolbar";
import { ReportOverviewTab } from "./report-overview-tab";
import { ReportDirectionTab } from "./report-direction-tab";
import { ReportTimeTab } from "./report-time-tab";
import { ReportSortableTable, type ColumnDef } from "./report-sortable-table";
import { ReportsSkeleton } from "./reports-skeleton";
import { ReportsEmptyState } from "./reports-empty-state";
import { ReportsErrorState } from "./reports-error-state";

function formatCurrency(valStr: string | null | undefined): string {
  if (!valStr) return "$0.00";
  const num = parseFloat(valStr);
  if (isNaN(num)) return "$0.00";
  const sign = num > 0 ? "+" : num < 0 ? "-" : "";
  const abs = Math.abs(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

export function ReportsClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const searchParamsString = searchParams.toString();

  // Parse Tab and Filters from URL
  const { activeTab, filters } = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const rawTab = params.get("tab") as ReportTabKey | null;
    const validTabs: ReportTabKey[] = [
      "overview",
      "symbols",
      "strategies",
      "setups",
      "tags",
      "mistakes",
      "accounts",
      "direction",
      "time",
    ];
    const tab = rawTab && validTabs.includes(rawTab) ? rawTab : "overview";

    const filterObj: Record<string, unknown> = {};
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

    if (dateFrom) filterObj.dateFrom = new Date(dateFrom);
    if (dateTo) filterObj.dateTo = new Date(dateTo);
    if (tradingAccountId) filterObj.tradingAccountId = tradingAccountId;
    if (symbol) filterObj.symbol = symbol;
    if (side === "LONG" || side === "SHORT") filterObj.side = side;
    if (status === "OPEN" || status === "CLOSED" || status === "CANCELLED") filterObj.status = status;
    if (strategyId) filterObj.strategyId = strategyId;
    if (setupId) filterObj.setupId = setupId;
    if (tagId) filterObj.tagId = tagId;
    if (mistakeId) filterObj.mistakeId = mistakeId;

    return { activeTab: tab, filters: filterObj as ReportFilterInput };
  }, [searchParamsString]);

  const [prevActiveTab, setPrevActiveTab] = useState<ReportTabKey>(activeTab);
  const [selectedTab, setSelectedTab] = useState<ReportTabKey>(activeTab);

  // Sync selectedTab if activeTab changed from URL
  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab);
    setSelectedTab(activeTab);
  }

  const [reportData, setReportData] = useState<ReportOverviewDto | null>(null);
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

  // Load classification filter options once
  useEffect(() => {
    const controller = new AbortController();
    fetchFilterOptions(controller.signal).then(setFilterOptions);
    return () => controller.abort();
  }, []);

  // Update URL search parameters when tab or filters change
  const updateUrlParams = useCallback(
    (newTab: ReportTabKey, newFilters: ReportFilterInput) => {
      const qs = buildReportQueryString(newFilters);
      const params = new URLSearchParams(qs);
      if (newTab && newTab !== "overview") {
        params.set("tab", newTab);
      }
      const finalQs = params.toString();
      const targetUrl = finalQs ? `${pathname}?${finalQs}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [pathname, router],
  );

  // Fetch report data whenever filters or reloadTrigger change
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function runFetch() {
      setIsRefreshing(true);
      setError(null);

      try {
        const data = await fetchReportOverview(filters, controller.signal);
        if (!ignore) {
          setReportData(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
          const msg =
            err instanceof ReportClientApiError
              ? err.message
              : "Failed to load report. Please try again.";
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

  const handleTabChange = (newTab: ReportTabKey) => {
    setSelectedTab(newTab);
    updateUrlParams(newTab, filters);
  };

  const handleFilterChange = (newFilters: ReportFilterInput) => {
    updateUrlParams(selectedTab, newFilters);
  };

  const handleResetFilters = () => {
    updateUrlParams(selectedTab, {});
  };

  const handleReload = () => {
    setReloadTrigger((prev) => prev + 1);
  };

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

  if (isLoading && reportData === null && !error) {
    return <ReportsSkeleton />;
  }

  // Column definitions for Tabular Reports
  const symbolColumns: ColumnDef<SymbolReportItemDto>[] = [
    {
      key: "symbol",
      label: "Symbol",
      align: "left",
      render: (r) => <span className="font-bold text-slate-100 uppercase">{r.symbol}</span>,
    },
    { key: "tradeCount", label: "Trades", align: "right" },
    {
      key: "record",
      label: "Record",
      align: "center",
      sortable: false,
      render: (r) => (
        <span className="text-slate-400">
          <span className="text-emerald-400">{r.winCount}W</span> •{" "}
          <span className="text-rose-400">{r.lossCount}L</span>
        </span>
      ),
    },
    {
      key: "winRate",
      label: "Win Rate",
      align: "right",
      render: (r) => (
        <span
          className={
            r.winRate >= 50
              ? "text-emerald-400"
              : r.winRate > 0
                ? "text-amber-400"
                : "text-slate-400"
          }
        >
          {r.winRate}%
        </span>
      ),
    },
    {
      key: "averageTradePnl",
      label: "Avg Trade",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.averageTradePnl);
        return (
          <span className={num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}>
            {formatCurrency(r.averageTradePnl)}
          </span>
        );
      },
    },
    {
      key: "netPnl",
      label: "Net P&L",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.netPnl);
        return (
          <span className={`font-bold ${num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}`}>
            {formatCurrency(r.netPnl)}
          </span>
        );
      },
    },
    {
      key: "profitFactor",
      label: "Profit Factor",
      align: "right",
      render: (r) => <span>{r.profitFactor ?? "—"}</span>,
    },
    {
      key: "averageR",
      label: "Avg R",
      align: "right",
      render: (r) => <span>{r.averageR ? `${r.averageR}R` : "—"}</span>,
    },
  ];

  const strategyColumns: ColumnDef<StrategyReportItemDto>[] = [
    {
      key: "strategyName",
      label: "Strategy",
      align: "left",
      render: (r) => <span className="font-semibold text-slate-100">{r.strategyName}</span>,
    },
    { key: "tradeCount", label: "Trades", align: "right" },
    {
      key: "winRate",
      label: "Win Rate",
      align: "right",
      render: (r) => (
        <span
          className={
            r.winRate >= 50
              ? "text-emerald-400"
              : r.winRate > 0
                ? "text-amber-400"
                : "text-slate-400"
          }
        >
          {r.winRate}%
        </span>
      ),
    },
    {
      key: "averageTradePnl",
      label: "Avg Trade",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.averageTradePnl);
        return (
          <span className={num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}>
            {formatCurrency(r.averageTradePnl)}
          </span>
        );
      },
    },
    {
      key: "netPnl",
      label: "Net P&L",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.netPnl);
        return (
          <span className={`font-bold ${num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}`}>
            {formatCurrency(r.netPnl)}
          </span>
        );
      },
    },
    {
      key: "expectancy",
      label: "Expectancy",
      align: "right",
      render: (r) => <span>{formatCurrency(r.expectancy)}</span>,
    },
    {
      key: "averageR",
      label: "Avg R",
      align: "right",
      render: (r) => <span>{r.averageR ? `${r.averageR}R` : "—"}</span>,
    },
  ];

  const setupColumns: ColumnDef<SetupReportItemDto>[] = [
    {
      key: "setupName",
      label: "Setup",
      align: "left",
      render: (r) => <span className="font-semibold text-slate-100">{r.setupName}</span>,
    },
    { key: "tradeCount", label: "Trades", align: "right" },
    {
      key: "winRate",
      label: "Win Rate",
      align: "right",
      render: (r) => (
        <span
          className={
            r.winRate >= 50
              ? "text-emerald-400"
              : r.winRate > 0
                ? "text-amber-400"
                : "text-slate-400"
          }
        >
          {r.winRate}%
        </span>
      ),
    },
    {
      key: "averageTradePnl",
      label: "Avg Trade",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.averageTradePnl);
        return (
          <span className={num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}>
            {formatCurrency(r.averageTradePnl)}
          </span>
        );
      },
    },
    {
      key: "netPnl",
      label: "Net P&L",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.netPnl);
        return (
          <span className={`font-bold ${num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}`}>
            {formatCurrency(r.netPnl)}
          </span>
        );
      },
    },
    {
      key: "expectancy",
      label: "Expectancy",
      align: "right",
      render: (r) => <span>{formatCurrency(r.expectancy)}</span>,
    },
    {
      key: "averageR",
      label: "Avg R",
      align: "right",
      render: (r) => <span>{r.averageR ? `${r.averageR}R` : "—"}</span>,
    },
  ];

  const tagColumns: ColumnDef<TagReportItemDto>[] = [
    {
      key: "tagName",
      label: "Tag",
      align: "left",
      render: (r) => (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: r.tagColor ? `${r.tagColor}20` : "#3b82f620",
            color: r.tagColor || "#60a5fa",
            borderColor: r.tagColor ? `${r.tagColor}40` : "#3b82f640",
          }}
        >
          {r.tagName}
        </span>
      ),
    },
    { key: "tradeCount", label: "Trades", align: "right" },
    {
      key: "winRate",
      label: "Win Rate",
      align: "right",
      render: (r) => (
        <span
          className={
            r.winRate >= 50
              ? "text-emerald-400"
              : r.winRate > 0
                ? "text-amber-400"
                : "text-slate-400"
          }
        >
          {r.winRate}%
        </span>
      ),
    },
    {
      key: "averageTradePnl",
      label: "Avg Trade",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.averageTradePnl);
        return (
          <span className={num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}>
            {formatCurrency(r.averageTradePnl)}
          </span>
        );
      },
    },
    {
      key: "netPnl",
      label: "Net P&L",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.netPnl);
        return (
          <span className={`font-bold ${num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}`}>
            {formatCurrency(r.netPnl)}
          </span>
        );
      },
    },
    {
      key: "averageR",
      label: "Avg R",
      align: "right",
      render: (r) => <span>{r.averageR ? `${r.averageR}R` : "—"}</span>,
    },
  ];

  const mistakeColumns: ColumnDef<MistakeReportItemDto>[] = [
    {
      key: "mistakeName",
      label: "Mistake",
      align: "left",
      render: (r) => (
        <span className="font-semibold text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/30">
          {r.mistakeName}
        </span>
      ),
    },
    { key: "tradeCount", label: "Trades Affected", align: "right" },
    {
      key: "winRate",
      label: "Win Rate",
      align: "right",
      render: (r) => <span>{r.winRate}%</span>,
    },
    {
      key: "totalLoss",
      label: "Total Loss Impact",
      align: "right",
      render: (r) => <span className="font-bold text-rose-400">-{formatCurrency(r.totalLoss)}</span>,
    },
    {
      key: "averageLoss",
      label: "Avg Loss",
      align: "right",
      render: (r) => <span className="text-rose-400">-{formatCurrency(r.averageLoss)}</span>,
    },
    {
      key: "netPnl",
      label: "Net P&L",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.netPnl);
        return (
          <span className={`font-bold ${num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}`}>
            {formatCurrency(r.netPnl)}
          </span>
        );
      },
    },
  ];

  const accountColumns: ColumnDef<AccountReportItemDto>[] = [
    {
      key: "accountName",
      label: "Account",
      align: "left",
      render: (r) => <span className="font-semibold text-slate-100">{r.accountName}</span>,
    },
    {
      key: "currency",
      label: "Currency",
      align: "center",
      render: (r) => <span className="text-slate-400 font-mono">{r.currency}</span>,
    },
    { key: "tradeCount", label: "Trades", align: "right" },
    {
      key: "winRate",
      label: "Win Rate",
      align: "right",
      render: (r) => (
        <span
          className={
            r.winRate >= 50
              ? "text-emerald-400"
              : r.winRate > 0
                ? "text-amber-400"
                : "text-slate-400"
          }
        >
          {r.winRate}%
        </span>
      ),
    },
    {
      key: "averageTradePnl",
      label: "Avg Trade",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.averageTradePnl);
        return (
          <span className={num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}>
            {formatCurrency(r.averageTradePnl)}
          </span>
        );
      },
    },
    {
      key: "netPnl",
      label: "Net P&L",
      align: "right",
      render: (r) => {
        const num = parseFloat(r.netPnl);
        return (
          <span className={`font-bold ${num > 0 ? "text-emerald-400" : num < 0 ? "text-rose-400" : "text-slate-300"}`}>
            {formatCurrency(r.netPnl)}
          </span>
        );
      },
    },
  ];

  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6"
      data-testid="reports-page"
    >
      {/* 1. Page Header */}
      <ReportsHeader onRefresh={handleReload} isRefreshing={isRefreshing} />

      {/* 2. Filter Toolbar */}
      <AnalyticsFilterToolbar
        filters={filters}
        options={filterOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isLoading={isRefreshing}
      />

      {/* 3. Error state */}
      {error && (
        <ReportsErrorState message={error} onRetry={handleReload} />
      )}

      {/* 4. Report Content */}
      {!error && reportData && (
        <div className="space-y-5">
          {/* Tab Navigation */}
          <ReportsTabNavigation
            activeTab={selectedTab}
            onTabChange={handleTabChange}
            counts={{
              symbols: reportData.symbols.length,
              strategies: reportData.strategies.length,
              setups: reportData.setups.length,
              tags: reportData.tags.length,
              mistakes: reportData.mistakes.length,
              accounts: reportData.accounts.length,
            }}
          />

          {reportData.performance.totalTrades === 0 && !hasActiveFilters ? (
            <ReportsEmptyState
              hasFilters={hasActiveFilters}
              onResetFilters={handleResetFilters}
            />
          ) : (
            <div>
              {selectedTab === "overview" && <ReportOverviewTab report={reportData} />}

              {selectedTab === "symbols" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Performance by Symbol / Instrument
                  </h3>
                  <ReportSortableTable
                    columns={symbolColumns}
                    data={reportData.symbols}
                    defaultSortKey="netPnl"
                    defaultSortDir="desc"
                    emptyMessage="No symbol breakdown data found."
                    testId="report-symbols-table"
                  />
                </div>
              )}

              {selectedTab === "strategies" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Performance by Trading Strategy
                  </h3>
                  <ReportSortableTable
                    columns={strategyColumns}
                    data={reportData.strategies}
                    defaultSortKey="netPnl"
                    defaultSortDir="desc"
                    emptyMessage="No strategy breakdown data found."
                    testId="report-strategies-table"
                  />
                </div>
              )}

              {selectedTab === "setups" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Performance by Technical Setup
                  </h3>
                  <ReportSortableTable
                    columns={setupColumns}
                    data={reportData.setups}
                    defaultSortKey="netPnl"
                    defaultSortDir="desc"
                    emptyMessage="No setup breakdown data found."
                    testId="report-setups-table"
                  />
                </div>
              )}

              {selectedTab === "tags" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Performance by Classification Tag
                  </h3>
                  <ReportSortableTable
                    columns={tagColumns}
                    data={reportData.tags}
                    defaultSortKey="netPnl"
                    defaultSortDir="desc"
                    emptyMessage="No tag breakdown data found."
                    testId="report-tags-table"
                  />
                </div>
              )}

              {selectedTab === "mistakes" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Trading Mistake Cost & Frequency Analysis
                  </h3>
                  <ReportSortableTable
                    columns={mistakeColumns}
                    data={reportData.mistakes}
                    defaultSortKey="totalLoss"
                    defaultSortDir="desc"
                    emptyMessage="No recorded trading mistakes found for current filters."
                    testId="report-mistakes-table"
                  />
                </div>
              )}

              {selectedTab === "accounts" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Performance by Trading Account
                  </h3>
                  <ReportSortableTable
                    columns={accountColumns}
                    data={reportData.accounts}
                    defaultSortKey="netPnl"
                    defaultSortDir="desc"
                    emptyMessage="No account breakdown data found."
                    testId="report-accounts-table"
                  />
                </div>
              )}

              {selectedTab === "direction" && (
                <ReportDirectionTab direction={reportData.direction} />
              )}

              {selectedTab === "time" && <ReportTimeTab time={reportData.time} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
