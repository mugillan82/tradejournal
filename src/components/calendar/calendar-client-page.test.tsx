// @vitest-environment happy-dom
/**
 * Calendar Domain — Client Page Integration Tests
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { CalendarClientPage } from "./calendar-client-page";
import * as calendarClient from "@/lib/client/calendar";
import * as analyticsClient from "@/lib/client/analytics";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams("month=2026-09"),
  usePathname: () => "/calendar",
}));

const mockCalendarData: calendarClient.MonthCalendarDto = {
  month: "2026-09",
  summary: {
    month: "2026-09",
    totalTrades: 3,
    closedTrades: 3,
    openTrades: 0,
    winningTrades: 2,
    losingTrades: 1,
    breakevenTrades: 0,
    netPnl: "750.00",
    grossProfit: "1000.00",
    grossLoss: "250.00",
    winRate: 66.67,
    profitFactor: "4.00",
    winningDays: 1,
    losingDays: 1,
    breakevenDays: 0,
    bestDay: { date: "2026-09-02", netPnl: "1000.00" },
    worstDay: { date: "2026-09-05", netPnl: "-250.00" },
    averageDailyPnl: "375.00",
    totalRisk: "500.00",
    averageR: "2.10",
  },
  days: {
    "2026-09-02": {
      date: "2026-09-02",
      tradeCount: 2,
      winCount: 2,
      lossCount: 0,
      breakevenCount: 0,
      openCount: 0,
      netPnl: "1000.00",
      winRate: 100,
      totalR: "3.50",
      hasJournalEntry: true,
      journalEntryId: "j-1",
      journalMood: "VERY_GOOD",
      journalNotes: "Strong session",
      trades: [
        {
          id: "trade-1",
          title: "AAPL",
          side: "LONG",
          status: "CLOSED",
          entryDate: "2026-09-02T10:00:00Z",
          exitDate: "2026-09-02T15:00:00Z",
          entryPrice: "150.00000000",
          exitPrice: "160.00000000",
          quantity: "100.00000000",
          grossPnl: "1000.00",
          netPnl: "1000.00",
          actualRMultiple: "3.50",
          riskAmount: "285.00",
          tradingAccount: { id: "acc-1", name: "Main", currency: "USD" },
          strategy: null,
          setup: null,
          tags: [],
          mistakes: [],
        },
      ],
    },
  },
};

describe("CalendarClientPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton initially and full calendar upon successful data fetch", async () => {
    vi.spyOn(calendarClient, "fetchMonthCalendar").mockResolvedValue(mockCalendarData);
    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<CalendarClientPage />);

    expect(screen.getByTestId("calendar-skeleton")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId("calendar-page")).toBeDefined();
    });

    expect(screen.getByTestId("calendar-header")).toBeDefined();
    expect(screen.getByTestId("calendar-summary-bar")).toBeDefined();
    expect(screen.getByTestId("calendar-filter-toolbar")).toBeDefined();
    expect(screen.getByTestId("calendar-month-grid")).toBeDefined();
    expect(screen.getByTestId("summary-net-pnl").textContent).toContain("+$750.00");
  });

  it("opens day detail panel upon clicking a calendar day cell and dismisses on close", async () => {
    vi.spyOn(calendarClient, "fetchMonthCalendar").mockResolvedValue(mockCalendarData);
    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<CalendarClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-day-cell-2026-09-02")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("calendar-day-cell-2026-09-02"));

    await waitFor(() => {
      expect(screen.getByTestId("calendar-day-detail-panel")).toBeDefined();
    });

    expect(screen.getByTestId("day-detail-net-pnl").textContent).toContain("+$1,000.00");

    fireEvent.click(screen.getByTestId("close-day-detail-btn"));

    expect(screen.queryByTestId("calendar-day-detail-panel")).toBeNull();
  });

  it("renders error state on API failure and retries on button click", async () => {
    const fetchSpy = vi
      .spyOn(calendarClient, "fetchMonthCalendar")
      .mockRejectedValueOnce(new calendarClient.CalendarClientApiError("Network timeout", 500))
      .mockResolvedValueOnce(mockCalendarData);

    vi.spyOn(analyticsClient, "fetchFilterOptions").mockResolvedValue({
      accounts: [],
      strategies: [],
      setups: [],
      tags: [],
      mistakes: [],
    });

    render(<CalendarClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-error-state")).toBeDefined();
    });

    expect(screen.getByText("Network timeout")).toBeDefined();

    const retryBtn = screen.getByTestId("calendar-retry-btn");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-page")).toBeDefined();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
