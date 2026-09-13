// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { StructuredImportClientPage } from "@/components/imports/structured-import-client-page";
import * as accountsClient from "@/lib/client/accounts";
import * as importsClient from "@/lib/client/imports";
import type { ImportPreview } from "@/lib/trading/import/types";

vi.mock("@/lib/client/accounts", () => ({
  fetchTradingAccountsClient: vi.fn(),
}));

vi.mock("@/lib/client/imports", () => ({
  createImportPreview: vi.fn(),
  confirmImport: vi.fn(),
}));

const mockAccounts = [
  {
    id: "acc-1",
    userId: "user-1",
    name: "Interactive Brokers",
    currency: "USD",
    type: "LIVE",
    initialBalance: "10000.00",
    currentBalance: "10500.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockPreviewData: ImportPreview = {
  totalRecords: 2,
  validRecords: 2,
  invalidRecords: 0,
  duplicateRecords: 0,
  possibleDuplicates: 0,
  headers: ["Symbol", "Side", "Quantity", "Entry Price", "Entry Date"],
  unmappedColumns: [],
  missingRequiredFields: [],
  candidates: [
    {
      candidateId: "cand-1",
      tradingAccountId: "acc-1",
      title: "EURUSD",
      side: "LONG",
      quantity: "1.0",
      entryPrice: "1.0850",
      entryDate: new Date("2024-01-15T10:00:00Z"),
      exitPrice: "1.0920",
      exitDate: new Date("2024-01-15T15:00:00Z"),
      netPnl: "70.00",
      status: "CLOSED",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    },
    {
      candidateId: "cand-2",
      tradingAccountId: "acc-1",
      title: "GBPUSD",
      side: "SHORT",
      quantity: "2.0",
      entryPrice: "1.2650",
      entryDate: new Date("2024-01-16T09:00:00Z"),
      exitPrice: null,
      exitDate: null,
      netPnl: null,
      status: "OPEN",
      validationIssues: [],
      confidence: { score: 0.9, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    },
  ],
};

describe("StructuredImportClientPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(accountsClient.fetchTradingAccountsClient).mockResolvedValue({
      items: mockAccounts,
      total: 1,
      page: 1,
      pageSize: 50,
    });
    vi.mocked(importsClient.createImportPreview).mockResolvedValue(mockPreviewData);
  });

  it("loads and displays the trading account in the selector", async () => {
    render(<StructuredImportClientPage />);

    await waitFor(() => {
      expect(screen.getByText(/Interactive Brokers \(USD\)/i)).toBeTruthy();
    });
    expect(screen.getByText("Upload Structured File")).toBeTruthy();
  });

  it("completes the full flow: upload -> mapping -> preview -> confirm -> results", async () => {
    render(<StructuredImportClientPage />);

    await waitFor(() => {
      expect(screen.getByText(/Interactive Brokers \(USD\)/i)).toBeTruthy();
    });

    // 1. Select a file via input
    const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
    const testFile = new File(["Symbol,Side\nEURUSD,BUY"], "trades.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Expect filename to appear
    expect(screen.getAllByText("trades.csv").length).toBeGreaterThanOrEqual(1);

    // 2. Click "Parse & Map Columns"
    const parseBtn = screen.getByText("Parse & Map Columns");
    fireEvent.click(parseBtn);

    // Should transition to MAPPING step
    await waitFor(() => {
      expect(screen.getByText("Column Mapping")).toBeTruthy();
    });

    // 3. Click "Generate Preview"
    const generatePreviewBtn = screen.getByText("Generate Preview");
    fireEvent.click(generatePreviewBtn);

    // Should transition to PREVIEW step
    await waitFor(() => {
      expect(screen.getByText("EURUSD")).toBeTruthy();
      expect(screen.getByText("GBPUSD")).toBeTruthy();
    });

    // Check stats
    expect(screen.getByText("Valid Records")).toBeTruthy();

    // 4. Confirm Import
    vi.mocked(importsClient.confirmImport).mockResolvedValue({
      successful: 2,
      failed: 0,
      errors: [],
      trades: [
        { candidateId: "cand-1", tradeId: "t-1" },
        { candidateId: "cand-2", tradeId: "t-2" },
      ],
    });

    const confirmBtn = screen.getByText(/Confirm & Import \(2\) Trades/i);
    fireEvent.click(confirmBtn);

    // Should transition to RESULTS step
    await waitFor(() => {
      expect(screen.getByText("Import Complete")).toBeTruthy();
      expect(screen.getByText("Successfully Imported")).toBeTruthy();
      expect(screen.getByText("View Trades in Journal")).toBeTruthy();
    });
  });
});
