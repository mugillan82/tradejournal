/**
 * Calendar Domain — Client Page Component
 *
 * Interactive orchestrator for `/calendar`.
 * Manages URL query synchronization for month & dimensional filters,
 * stale-request cancellation with AbortController, daily trade inspections,
 * and journal logs.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  fetchMonthCalendar,
  buildCalendarQueryString,
  type MonthCalendarDto,
  type CalendarFilterInput,
  CalendarClientApiError,
} from "@/lib/client/calendar";
import { fetchFilterOptions, type FilterOptionItem } from "@/lib/client/analytics";

import { CalendarHeader } from "./calendar-header";
import { CalendarSummaryBar } from "./calendar-summary-bar";
import { CalendarFilterToolbar } from "./calendar-filter-toolbar";
import { CalendarMonthGrid } from "./calendar-month-grid";
import { CalendarDayDetailPanel } from "./calendar-day-detail-panel";
import { CalendarSkeleton } from "./calendar-skeleton";
import { CalendarEmptyState } from "./calendar-empty-state";
import { CalendarErrorState } from "./calendar-error-state";

function getCurrentUtcMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function CalendarClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const searchParamsString = searchParams.toString();

  // Parse Month and Filters from URL
  const { month, filters } = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    const rawMonth = params.get("month");
    const validMonth =
      rawMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth)
        ? rawMonth
        : getCurrentUtcMonth();

    const filterObj: CalendarFilterInput = {
      tradingAccountId: params.get("tradingAccountId") || undefined,
      symbol: params.get("symbol") || undefined,
      side: (params.get("side") as CalendarFilterInput["side"]) || undefined,
      status: (params.get("status") as CalendarFilterInput["status"]) || undefined,
      strategyId: params.get("strategyId") || undefined,
      setupId: params.get("setupId") || undefined,
      tagId: params.get("tagId") || undefined,
      mistakeId: params.get("mistakeId") || undefined,
    };

    return { month: validMonth, filters: filterObj };
  }, [searchParamsString]);

  const [calendarData, setCalendarData] = useState<MonthCalendarDto | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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

  // Update URL search parameters when month or filters change
  const updateUrlParams = useCallback(
    (newMonth: string, newFilters: CalendarFilterInput) => {
      const qs = buildCalendarQueryString(newMonth, newFilters);
      const targetUrl = qs ? `${pathname}?${qs}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [pathname, router],
  );

  // Fetch month calendar data
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function runFetch() {
      setIsRefreshing(true);
      setError(null);

      try {
        const data = await fetchMonthCalendar(month, filters, controller.signal);
        if (!ignore) {
          setCalendarData(data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
          const msg =
            err instanceof CalendarClientApiError
              ? err.message
              : "Failed to load calendar data. Please try again.";
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
  }, [month, filters, reloadTrigger]);

  const handleMonthChange = (newMonth: string) => {
    setSelectedDate(null);
    updateUrlParams(newMonth, filters);
  };

  const handleFilterChange = (newFilters: CalendarFilterInput) => {
    updateUrlParams(month, newFilters);
  };

  const handleResetFilters = () => {
    updateUrlParams(month, {});
  };

  const handleReload = () => {
    setReloadTrigger((prev) => prev + 1);
  };

  const hasActiveFilters = Boolean(
    filters.tradingAccountId ||
      filters.symbol ||
      filters.side ||
      filters.status ||
      filters.strategyId ||
      filters.setupId ||
      filters.tagId ||
      filters.mistakeId,
  );

  if (isLoading && calendarData === null && !error) {
    return <CalendarSkeleton />;
  }

  const selectedDayData = selectedDate && calendarData ? calendarData.days[selectedDate] ?? null : null;

  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6"
      data-testid="calendar-page"
    >
      {/* 1. Header */}
      <CalendarHeader
        currentMonth={month}
        onMonthChange={handleMonthChange}
        onRefresh={handleReload}
        isRefreshing={isRefreshing}
      />

      {/* 2. Month Performance Summary Bar */}
      {calendarData && (
        <CalendarSummaryBar summary={calendarData.summary} />
      )}

      {/* 3. Filter Toolbar */}
      <CalendarFilterToolbar
        filters={filters}
        options={filterOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isLoading={isRefreshing}
      />

      {/* 4. Error state */}
      {error && (
        <CalendarErrorState
          message={error}
          onRetry={handleReload}
        />
      )}

      {/* 5. Main Calendar Content */}
      {!error && calendarData && (
        <div className="space-y-6">
          {calendarData.summary.totalTrades === 0 && !hasActiveFilters && Object.keys(calendarData.days).length === 0 ? (
            <CalendarEmptyState
              month={month}
              hasFilters={hasActiveFilters}
              onResetFilters={handleResetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Calendar Grid */}
              <div className={selectedDate ? "lg:col-span-8 xl:col-span-8" : "lg:col-span-12"}>
                <CalendarMonthGrid
                  month={month}
                  days={calendarData.days}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => setSelectedDate((prev) => (prev === date ? null : date))}
                  bestDayDate={calendarData.summary.bestDay?.date ?? null}
                  worstDayDate={calendarData.summary.worstDay?.date ?? null}
                />
              </div>

              {/* Day Detail Panel */}
              {selectedDate && (
                <div className="lg:col-span-4 xl:col-span-4 sticky top-4">
                  <CalendarDayDetailPanel
                    day={selectedDayData}
                    dateStr={selectedDate}
                    onClose={() => setSelectedDate(null)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
