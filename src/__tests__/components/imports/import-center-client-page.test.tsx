// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ImportCenterClientPage } from "@/components/imports/import-center-client-page";

describe("ImportCenterClientPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the page header and main title", () => {
    render(<ImportCenterClientPage />);
    expect(screen.getByText("Trade Import Center")).toBeTruthy();
    expect(
      screen.getByText(/Import your historical and ongoing trading activity into TradeJournal/i)
    ).toBeTruthy();
  });

  it("renders the three source import cards with correct actions", () => {
    render(<ImportCenterClientPage />);

    // Card 1: Smart Screenshot Import
    expect(screen.getByText("Smart Screenshot Import")).toBeTruthy();
    expect(screen.getByText("Launch Smart Agent")).toBeTruthy();

    // Card 2: CSV Spreadsheet Import
    expect(screen.getByText("CSV Spreadsheet Import")).toBeTruthy();
    expect(screen.getByText("Import CSV File")).toBeTruthy();

    // Card 3: Excel XLSX Import
    expect(screen.getByText("Excel (.xlsx) Import")).toBeTruthy();
    expect(screen.getByText("Import Excel Workbook")).toBeTruthy();
  });

  it("exposes pipeline guarantee badges and descriptions", () => {
    render(<ImportCenterClientPage />);
    expect(screen.getByText("Account Ownership")).toBeTruthy();
    expect(screen.getByText("Exact Duplicate Detection")).toBeTruthy();
    expect(screen.getByText("Decimal Financial Precision")).toBeTruthy();
    expect(screen.getByText("Full Analytics Sync")).toBeTruthy();
  });
});
