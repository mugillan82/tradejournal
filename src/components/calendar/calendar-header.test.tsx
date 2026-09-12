// @vitest-environment happy-dom
/**
 * Calendar Domain — Header Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { CalendarHeader } from "./calendar-header";

describe("CalendarHeader Component", () => {
  it("renders the current month heading and controls correctly", () => {
    const handleMonthChange = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <CalendarHeader
        currentMonth="2026-09"
        onMonthChange={handleMonthChange}
        onRefresh={handleRefresh}
      />,
    );

    expect(screen.getByTestId("calendar-month-heading").textContent).toContain("September 2026");
    expect(screen.getByTestId("calendar-prev-month")).toBeDefined();
    expect(screen.getByTestId("calendar-next-month")).toBeDefined();
    expect(screen.getByTestId("calendar-today-btn")).toBeDefined();
    expect(screen.getByTestId("calendar-refresh-btn")).toBeDefined();
  });

  it("navigates to previous and next months when clicking navigation buttons", () => {
    const handleMonthChange = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <CalendarHeader
        currentMonth="2026-09"
        onMonthChange={handleMonthChange}
        onRefresh={handleRefresh}
      />,
    );

    fireEvent.click(screen.getByTestId("calendar-prev-month"));
    expect(handleMonthChange).toHaveBeenCalledWith("2026-08");

    fireEvent.click(screen.getByTestId("calendar-next-month"));
    expect(handleMonthChange).toHaveBeenCalledWith("2026-10");
  });

  it("handles year transition from January to December and vice versa", () => {
    const handleMonthChange = vi.fn();
    const handleRefresh = vi.fn();

    const { rerender } = render(
      <CalendarHeader
        currentMonth="2026-01"
        onMonthChange={handleMonthChange}
        onRefresh={handleRefresh}
      />,
    );

    fireEvent.click(screen.getByTestId("calendar-prev-month"));
    expect(handleMonthChange).toHaveBeenCalledWith("2025-12");

    rerender(
      <CalendarHeader
        currentMonth="2026-12"
        onMonthChange={handleMonthChange}
        onRefresh={handleRefresh}
      />,
    );

    fireEvent.click(screen.getByTestId("calendar-next-month"));
    expect(handleMonthChange).toHaveBeenCalledWith("2027-01");
  });

  it("triggers onRefresh when clicking the refresh button", () => {
    const handleMonthChange = vi.fn();
    const handleRefresh = vi.fn();

    render(
      <CalendarHeader
        currentMonth="2026-09"
        onMonthChange={handleMonthChange}
        onRefresh={handleRefresh}
      />,
    );

    fireEvent.click(screen.getByTestId("calendar-refresh-btn"));
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });
});
