// @vitest-environment happy-dom
/**
 * Calendar Domain — Day Detail Panel Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CalendarDayDetailPanel } from "./calendar-day-detail-panel";
import type { CalendarDayDto } from "@/lib/client/calendar";

describe("CalendarDayDetailPanel Component", () => {
  const mockDay: CalendarDayDto = {
    date: "2026-09-02",
    tradeCount: 2,
    winCount: 2,
    lossCount: 0,
    breakevenCount: 0,
    openCount: 0,
    netPnl: "750.00",
    winRate: 100,
    totalR: "3.50",
    hasJournalEntry: true,
    journalEntryId: "j-1",
    journalMood: "VERY_GOOD",
    journalNotes: "Executed planned strategy flawlessly",
    trades: [
      {
        id: "trade-1",
        title: "AAPL",
        side: "LONG",
        status: "CLOSED",
        entryDate: "2026-09-02T10:00:00Z",
        exitDate: "2026-09-02T15:00:00Z",
        entryPrice: "150.00000000",
        exitPrice: "155.00000000",
        quantity: "100.00000000",
        grossPnl: "500.00",
        netPnl: "480.00",
        actualRMultiple: "2.40",
        riskAmount: "200.00",
        tradingAccount: { id: "acc-1", name: "Main", currency: "USD" },
        strategy: { id: "s-1", name: "Breakout" },
        setup: { id: "set-1", name: "Bull Flag" },
        tags: [{ id: "t-1", name: "Tech", color: "#10b981" }],
        mistakes: [],
      },
    ],
  };

  it("renders day details, daily metrics, journal context, and trade links", () => {
    const handleClose = vi.fn();

    render(
      <CalendarDayDetailPanel
        day={mockDay}
        dateStr="2026-09-02"
        onClose={handleClose}
      />,
    );

    expect(screen.getByTestId("day-detail-date").textContent).toContain("September 2, 2026");
    expect(screen.getByTestId("day-detail-net-pnl").textContent).toContain("+$750.00");
    expect(screen.getByTestId("day-detail-win-rate").textContent).toContain("100%");
    expect(screen.getByText(/Executed planned strategy flawlessly/)).toBeDefined();

    // Trade Item
    const tradeItem = screen.getByTestId("day-trade-item-trade-1");
    expect(tradeItem.textContent).toContain("AAPL");
    expect(tradeItem.textContent).toContain("+$480.00");
    expect(tradeItem.getAttribute("href")).toBe("/trades/trade-1");
  });

  it("triggers onClose when clicking the close button", () => {
    const handleClose = vi.fn();

    render(
      <CalendarDayDetailPanel
        day={mockDay}
        dateStr="2026-09-02"
        onClose={handleClose}
      />,
    );

    fireEvent.click(screen.getByTestId("close-day-detail-btn"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
