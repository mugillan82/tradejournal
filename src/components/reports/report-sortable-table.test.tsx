// @vitest-environment happy-dom
/**
 * Reports Domain — Sortable Table Component Tests
 */

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ReportSortableTable, type ColumnDef } from "./report-sortable-table";

interface TestRow {
  symbol: string;
  pnl: number;
  trades: number;
}

describe("ReportSortableTable Component", () => {
  const columns: ColumnDef<TestRow>[] = [
    { key: "symbol", label: "Symbol", align: "left" },
    { key: "trades", label: "Trades", align: "right" },
    { key: "pnl", label: "P&L", align: "right" },
  ];

  const mockData: TestRow[] = [
    { symbol: "AAPL", trades: 5, pnl: 500 },
    { symbol: "MSFT", trades: 2, pnl: -200 },
    { symbol: "NVDA", trades: 10, pnl: 1500 },
  ];

  it("renders table headers and rows accurately", () => {
    render(<ReportSortableTable columns={columns} data={mockData} defaultSortKey="symbol" />);

    expect(screen.getByText("Symbol")).toBeDefined();
    expect(screen.getByText("Trades")).toBeDefined();
    expect(screen.getByText("P&L")).toBeDefined();

    expect(screen.getByText("AAPL")).toBeDefined();
    expect(screen.getByText("MSFT")).toBeDefined();
    expect(screen.getByText("NVDA")).toBeDefined();
  });

  it("sorts rows when clicking a table header", () => {
    render(<ReportSortableTable columns={columns} data={mockData} defaultSortKey="trades" defaultSortDir="desc" />);

    // Initial desc by trades: NVDA (10), AAPL (5), MSFT (2)
    const rows = screen.getAllByTestId(/report-row-/);
    expect(rows[0].textContent).toContain("NVDA");
    expect(rows[1].textContent).toContain("AAPL");
    expect(rows[2].textContent).toContain("MSFT");

    // Click Trades header to toggle to ascending
    fireEvent.click(screen.getByText("Trades"));

    const ascRows = screen.getAllByTestId(/report-row-/);
    expect(ascRows[0].textContent).toContain("MSFT");
    expect(ascRows[1].textContent).toContain("AAPL");
    expect(ascRows[2].textContent).toContain("NVDA");
  });

  it("renders empty message when data is empty", () => {
    render(<ReportSortableTable columns={columns} data={[]} emptyMessage="No rows found" />);

    expect(screen.getByText("No rows found")).toBeDefined();
  });
});
