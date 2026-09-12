// @vitest-environment happy-dom
/**
 * Analytics Domain — Filter Toolbar Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { AnalyticsFilterToolbar } from "./analytics-filter-toolbar";

describe("AnalyticsFilterToolbar Component", () => {
  const mockOptions = {
    accounts: [{ id: "acc-1", name: "Interactive Brokers", currency: "USD" }],
    strategies: [{ id: "strat-1", name: "Momentum" }],
    setups: [{ id: "setup-1", name: "Breakout" }],
    tags: [{ id: "tag-1", name: "Earnings", color: "#ff0000" }],
    mistakes: [{ id: "m-1", name: "FOMO" }],
  };

  it("renders filter controls and date presets", () => {
    const handleFilterChange = vi.fn();
    const handleResetFilters = vi.fn();

    render(
      <AnalyticsFilterToolbar
        filters={{}}
        options={mockOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />,
    );

    expect(screen.getByTestId("analytics-filter-toolbar")).toBeDefined();
    expect(screen.getByTestId("date-preset-all")).toBeDefined();
    expect(screen.getByTestId("filter-account")).toBeDefined();
    expect(screen.getByTestId("filter-symbol")).toBeDefined();
    expect(screen.getByTestId("filter-side")).toBeDefined();
  });

  it("triggers onFilterChange when selecting an account filter", () => {
    const handleFilterChange = vi.fn();

    render(
      <AnalyticsFilterToolbar
        filters={{}}
        options={mockOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={vi.fn()}
      />,
    );

    const accountSelect = screen.getByTestId("filter-account");
    fireEvent.change(accountSelect, { target: { value: "acc-1" } });

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tradingAccountId: "acc-1",
      }),
    );
  });

  it("triggers onResetFilters when clicking the reset button", () => {
    const handleReset = vi.fn();

    render(
      <AnalyticsFilterToolbar
        filters={{ symbol: "TSLA", side: "LONG" }}
        options={mockOptions}
        onFilterChange={vi.fn()}
        onResetFilters={handleReset}
      />,
    );

    const resetBtn = screen.getByTestId("reset-filters-btn");
    expect(resetBtn).toBeDefined();
    fireEvent.click(resetBtn);

    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it("updates date range when selecting a date preset", () => {
    const handleFilterChange = vi.fn();

    render(
      <AnalyticsFilterToolbar
        filters={{}}
        options={mockOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={vi.fn()}
      />,
    );

    const monthPresetBtn = screen.getByTestId("date-preset-month");
    fireEvent.click(monthPresetBtn);

    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: expect.any(Date),
      }),
    );
  });
});
