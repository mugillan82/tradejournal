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
import { DashboardCustomizeModal } from "./dashboard-customize-modal";
import { useSettings } from "@/components/settings/settings-provider";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/trading/settings/types";

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

  const { preferences } = useSettings();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const orderedWidgets = useMemo(() => {
    const layout = preferences?.dashboardLayout ?? DEFAULT_DASHBOARD_LAYOUT;
    return [...layout].sort((a, b) => a.order - b.order).filter((w) => w.visible);
  }, [preferences?.dashboardLayout]);

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

  const renderWidget = (id: string) => {
    if (!dashboardData) return null;
    switch (id) {
      case "performance-hero":
        return (
          <DashboardPerformanceHero
            key={id}
            metrics={dashboardData.performance}
            equityCurve={dashboardData.equityCurve}
          />
        );
      case "today-card":
        return (
          <DashboardTodayCard
            key={id}
            today={dashboardData.today}
            currentMonth={dashboardData.currentMonth}
          />
        );
      case "breakdowns":
        return (
          <DashboardBreakdownsSection
            key={id}
            topSymbols={dashboardData.topSymbols}
            topStrategies={dashboardData.topStrategies}
            direction={dashboardData.direction}
          />
        );
      case "recent-trades":
        return (
          <DashboardRecentTrades key={id} trades={dashboardData.recentTrades} />
        );
      case "calendar-preview":
        return (
          <DashboardCalendarPreview key={id} calendar={dashboardData.calendar} />
        );
      case "accounts-card":
        return (
          <DashboardAccountsCard key={id} accounts={dashboardData.accounts} />
        );
      case "journal-preview":
        return (
          <DashboardJournalPreview
            key={id}
            entries={dashboardData.recentJournalEntries}
          />
        );
      case "quick-actions":
        return <DashboardQuickActions key={id} />;
      default:
        return null;
    }
  };

  if (isLoading && dashboardData === null && !error) {
    return <DashboardSkeleton />;
  }

  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
      data-testid="dashboard-page"
    >
      {/* 1. Header with Account Filter, Refresh & Customize */}
      <DashboardHeader
        accounts={dashboardData?.accounts || []}
        selectedAccountId={filters.tradingAccountId}
        onAccountChange={handleAccountChange}
        onRefresh={handleReload}
        isRefreshing={isRefreshing}
        onCustomize={() => setIsCustomizeOpen(true)}
      />

      {/* 2. Error State */}
      {error && (
        <DashboardErrorState message={error} onRetry={handleReload} />
      )}

      {/* 3. Empty State (Zero Accounts & Trades) */}
      {!error && dashboardData && dashboardData.performance.totalTrades === 0 && dashboardData.accounts.length === 0 && (
        <DashboardEmptyState hasAccount={false} />
      )}

      {/* 4. Main Dashboard Grid (Dynamic Widget Ordering) */}
      {!error && dashboardData && (dashboardData.performance.totalTrades > 0 || dashboardData.accounts.length > 0) && (
        <div className="space-y-6">
          {orderedWidgets.map((w) => renderWidget(w.id))}
        </div>
      )}

      {/* 5. Customization Modal */}
      <DashboardCustomizeModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
      />
    </div>
  );
}
