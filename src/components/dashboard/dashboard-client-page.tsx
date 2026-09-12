/**
 * Dashboard Domain — Client Page Orchestrator
 *
 * Interactive coordinator for the /dashboard route.
 * Manages URL query params, AbortController requests, and renders the complete
 * high-density trading command center.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  fetchDashboardOverview,
  buildDashboardQueryString,
  type DashboardOverviewDto,
  type DashboardFilterInput,
  DashboardClientApiError,
} from "@/lib/client/dashboard";

import { DashboardHeader } from "./dashboard-header";
import { DashboardPerformanceHero } from "./dashboard-performance-hero";
import { DashboardTodayCard } from "./dashboard-today-card";
import { DashboardRecentTrades } from "./dashboard-recent-trades";
import { DashboardBreakdownsSection } from "./dashboard-breakdowns-section";
import { DashboardCalendarPreview } from "./dashboard-calendar-preview";
import { DashboardAccountsCard } from "./dashboard-accounts-card";
import { DashboardJournalPreview } from "./dashboard-journal-preview";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { DashboardErrorState } from "./dashboard-error-state";

export function DashboardClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const searchParamsString = searchParams.toString();

  // Parse filters from URL
  const filters: DashboardFilterInput = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const tradingAccountId = params.get("tradingAccountId") || undefined;
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");

    return {
      tradingAccountId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };
  }, [searchParamsString]);

  const [dashboardData, setDashboardData] = useState<DashboardOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Update URL parameters
  const updateUrlParams = useCallback(
    (newFilters: DashboardFilterInput) => {
      const qs = buildDashboardQueryString(newFilters);
      const targetUrl = qs ? `${pathname}?${qs}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [pathname, router],
  );

  // Fetch dashboard data
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function runFetch() {
      setIsRefreshing(true);
      setError(null);

      try {
        const data = await fetchDashboardOverview(filters, controller.signal);
        if (!ignore) {
          setDashboardData(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
          const msg =
            err instanceof DashboardClientApiError
              ? err.message
              : "Failed to load dashboard. Please try again.";
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

  const handleAccountChange = (accountId?: string) => {
    updateUrlParams({
      ...filters,
      tradingAccountId: accountId,
    });
  };

  const handleReload = () => {
    setReloadTrigger((prev) => prev + 1);
  };

  if (isLoading && dashboardData === null && !error) {
    return <DashboardSkeleton />;
  }

  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
      data-testid="dashboard-page"
    >
      {/* 1. Header with Account Filter & Refresh */}
      <DashboardHeader
        accounts={dashboardData?.accounts || []}
        selectedAccountId={filters.tradingAccountId}
        onAccountChange={handleAccountChange}
        onRefresh={handleReload}
        isRefreshing={isRefreshing}
      />

      {/* 2. Error State */}
      {error && (
        <DashboardErrorState message={error} onRetry={handleReload} />
      )}

      {/* 3. Empty State (Zero Accounts & Trades) */}
      {!error && dashboardData && dashboardData.performance.totalTrades === 0 && dashboardData.accounts.length === 0 && (
        <DashboardEmptyState hasAccount={false} />
      )}

      {/* 4. Main Dashboard Grid */}
      {!error && dashboardData && (dashboardData.performance.totalTrades > 0 || dashboardData.accounts.length > 0) && (
        <div className="space-y-6">
          {/* Performance Hero (Net P&L, Win Rate, Profit Factor, Equity Curve) */}
          <DashboardPerformanceHero
            metrics={dashboardData.performance}
            equityCurve={dashboardData.equityCurve}
          />

          {/* Today & Current Month Context */}
          <DashboardTodayCard
            today={dashboardData.today}
            currentMonth={dashboardData.currentMonth}
          />

          {/* Breakdown Highlights (Top Symbols, Strategies, Long vs Short) */}
          <DashboardBreakdownsSection
            topSymbols={dashboardData.topSymbols}
            topStrategies={dashboardData.topStrategies}
            direction={dashboardData.direction}
          />

          {/* Recent Trades & Calendar Preview Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardRecentTrades trades={dashboardData.recentTrades} />
            <DashboardCalendarPreview calendar={dashboardData.calendar} />
          </div>

          {/* Accounts & Journal Preview Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardAccountsCard accounts={dashboardData.accounts} />
            <DashboardJournalPreview entries={dashboardData.recentJournalEntries} />
          </div>

          {/* Quick Actions Shortcuts */}
          <DashboardQuickActions />
        </div>
      )}
    </div>
  );
}
