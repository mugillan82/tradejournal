// @vitest-environment happy-dom
/**
 * Reports Domain — Tab Navigation Component Tests
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ReportsTabNavigation } from "./reports-tab-navigation";

describe("ReportsTabNavigation Component", () => {
  it("renders all 9 report tab buttons with active styling", () => {
    const handleTabChange = vi.fn();

    render(
      <ReportsTabNavigation
        activeTab="overview"
        onTabChange={handleTabChange}
        counts={{
          symbols: 5,
          strategies: 3,
          setups: 2,
          tags: 4,
          mistakes: 1,
          accounts: 2,
        }}
      />,
    );

    expect(screen.getByTestId("report-tab-overview")).toBeDefined();
    expect(screen.getByTestId("report-tab-symbols")).toBeDefined();
    expect(screen.getByTestId("report-tab-strategies")).toBeDefined();
    expect(screen.getByTestId("report-tab-setups")).toBeDefined();
    expect(screen.getByTestId("report-tab-tags")).toBeDefined();
    expect(screen.getByTestId("report-tab-mistakes")).toBeDefined();
    expect(screen.getByTestId("report-tab-accounts")).toBeDefined();
    expect(screen.getByTestId("report-tab-direction")).toBeDefined();
    expect(screen.getByTestId("report-tab-time")).toBeDefined();

    // Verify count badge rendered
    expect(screen.getByTestId("report-tab-symbols").textContent).toContain("5");
  });

  it("calls onTabChange when clicking a tab button", () => {
    const handleTabChange = vi.fn();

    render(
      <ReportsTabNavigation
        activeTab="overview"
        onTabChange={handleTabChange}
      />,
    );

    fireEvent.click(screen.getByTestId("report-tab-symbols"));
    expect(handleTabChange).toHaveBeenCalledWith("symbols");

    fireEvent.click(screen.getByTestId("report-tab-direction"));
    expect(handleTabChange).toHaveBeenCalledWith("direction");
  });
});
