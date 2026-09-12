// @vitest-environment happy-dom
/**
 * Calendar Domain — Month Grid Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CalendarMonthGrid } from "./calendar-month-grid";
import type { CalendarDayDto } from "@/lib/client/calendar";

describe("CalendarMonthGrid Component", () => {
  const mockDays: Record<string, CalendarDayDto> = {
    "2026-09-02": {
      date: "2026-09-02",
      tradeCount: 3,
      winCount: 2,
      lossCount: 1,
      breakevenCount: 0,
      openCount: 0,
      netPnl: "750.00",
      winRate: 66.67,
      totalR: "2.10",
      hasJournalEntry: true,
      journalEntryId: "j-1",
      journalMood: "VERY_GOOD",
      journalNotes: "Great session",
      trades: [],
    },
    "2026-09-05": {
      date: "2026-09-05",
      tradeCount: 1,
      winCount: 0,
      lossCount: 1,
      breakevenCount: 0,
      openCount: 0,
      netPnl: "-320.00",
      winRate: 0,
      totalR: "-1.00",
      hasJournalEntry: false,
      journalEntryId: null,
      journalMood: null,
      journalNotes: null,
      trades: [],
    },
  };

  it("renders month grid day cells, P&L values, and trade counts", () => {
    const handleSelectDate = vi.fn();

    render(
      <CalendarMonthGrid
        month="2026-09"
        days={mockDays}
        selectedDate={null}
        onSelectDate={handleSelectDate}
        bestDayDate="2026-09-02"
        worstDayDate="2026-09-05"
      />,
    );

    expect(screen.getByTestId("calendar-month-grid")).toBeDefined();

    // Day 2 (Winning Day)
    const day2 = screen.getByTestId("calendar-day-cell-2026-09-02");
    expect(day2.textContent).toContain("+$750.00");
    expect(day2.textContent).toContain("3T");
    expect(day2.textContent).toContain("+2.10R");
    expect(day2.textContent).toContain("Best");
    expect(screen.getByTestId("journal-indicator-2026-09-02")).toBeDefined();

    // Day 5 (Losing Day)
    const day5 = screen.getByTestId("calendar-day-cell-2026-09-05");
    expect(day5.textContent).toContain("-$320.00");
    expect(day5.textContent).toContain("1T");
    expect(day5.textContent).toContain("-1.00R");
    expect(day5.textContent).toContain("Worst");
  });

  it("calls onSelectDate when clicking an active day cell", () => {
    const handleSelectDate = vi.fn();

    render(
      <CalendarMonthGrid
        month="2026-09"
        days={mockDays}
        selectedDate={null}
        onSelectDate={handleSelectDate}
        bestDayDate="2026-09-02"
        worstDayDate="2026-09-05"
      />,
    );

    fireEvent.click(screen.getByTestId("calendar-day-cell-2026-09-02"));
    expect(handleSelectDate).toHaveBeenCalledWith("2026-09-02");
  });
});
