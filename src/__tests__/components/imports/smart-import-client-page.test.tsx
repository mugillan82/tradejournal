// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SmartImportClientPage } from "@/components/imports/smart-import-client-page";
import * as accountsClient from "@/lib/client/accounts";

vi.mock("@/lib/client/accounts", () => ({
  fetchTradingAccountsClient: vi.fn(),
}));

const mockAccounts = [
  {
    id: "acc-1",
    userId: "user-1",
    name: "Live MT5 Account",
    currency: "USD",
    type: "LIVE",
    initialBalance: "10000.00",
    currentBalance: "10500.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("SmartImportClientPage - Frontend Timeout and Terminal State Transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(accountsClient.fetchTradingAccountsClient).mockResolvedValue({
      items: mockAccounts,
      total: 1,
      page: 1,
      pageSize: 50,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. transitions cleanly to TIMEOUT state when server responds with 408 TIMEOUT without being overwritten by FAILED", async () => {
    // Mock fetch returning a 408 TIMEOUT error response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 408,
      json: async () => ({
        error: "TIMEOUT",
        message: "Screenshot processing exceeded budget",
      }),
    });

    const { container } = render(<SmartImportClientPage />);

    // Wait for accounts to load
    await waitFor(() => {
      expect(screen.getByText(/Live MT5 Account/i)).toBeTruthy();
    });

    // Provide a mock file
    const file = new File(["fake-image-bytes"], "screenshot.png", { type: "image/png" });
    const fileInput = container.querySelector('input[type="file"]')!;
    expect(fileInput).toBeTruthy();
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click Extract Trades
    const extractBtn = screen.getByRole("button", { name: /Extract Trades/i });
    fireEvent.click(extractBtn);

    // Verify it transitions to TIMEOUT and NOT FAILED
    await waitFor(() => {
      expect(screen.getByText("Extraction Timed Out")).toBeTruthy();
    });

    expect(screen.queryByText("Extraction Failed")).toBeNull();
    expect(screen.getByText("Screenshot processing exceeded budget")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Retry Extraction/i })).toBeTruthy();

    // Verify isLoading is false (Extract Trades button is no longer "Processing...")
    expect(screen.getByRole("button", { name: /Extract Trades/i })).toBeTruthy();
  });

  it("2. transitions to FAILED state on standard server error (500)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: "Internal server error occurred",
      }),
    });

    const { container } = render(<SmartImportClientPage />);

    await waitFor(() => {
      expect(screen.getByText(/Live MT5 Account/i)).toBeTruthy();
    });

    const file = new File(["fake-image-bytes"], "screenshot.png", { type: "image/png" });
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const extractBtn = screen.getByRole("button", { name: /Extract Trades/i });
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(screen.getByText("Extraction Failed")).toBeTruthy();
    });

    expect(screen.queryByText("Extraction Timed Out")).toBeNull();
    expect(screen.getByRole("button", { name: /Retry Extraction/i })).toBeTruthy();
  });

  it("3. transitions to TIMEOUT state when client fetch aborts due to client-side timeout", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    global.fetch = vi.fn().mockRejectedValue(abortError);

    const { container } = render(<SmartImportClientPage />);

    await waitFor(() => {
      expect(screen.getByText(/Live MT5 Account/i)).toBeTruthy();
    });

    const file = new File(["fake-image-bytes"], "screenshot.png", { type: "image/png" });
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const extractBtn = screen.getByRole("button", { name: /Extract Trades/i });
    fireEvent.click(extractBtn);

    await waitFor(() => {
      expect(screen.getByText("Extraction Timed Out")).toBeTruthy();
    });

    expect(screen.queryByText("Extraction Failed")).toBeNull();
    expect(screen.getByRole("button", { name: /Retry Extraction/i })).toBeTruthy();
  });

  it("4. does not enter TIMEOUT when processing completes successfully within deadline", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        status: "NEEDS_REVIEW",
        sourceDetection: {
          source: "MT5",
          confidence: 0.95,
          evidence: ["NAS100.X", "EURUSD.X"],
        },
        preview: {
          candidates: [
            {
              id: "cand-1",
              title: "NAS100.X",
              side: "LONG",
              quantity: "0.05",
              entryPrice: "29201.87",
              exitPrice: "29270.00",
              isValid: true,
              confidence: { level: "HIGH", score: 0.9, reasons: [] },
            },
          ],
          duplicateCount: 0,
          errorCount: 0,
          readyCount: 1,
          nonTradeCount: 0,
          excludedRows: [],
        },
      }),
    });

    const { container } = render(<SmartImportClientPage />);

    await waitFor(() => {
      expect(screen.getByText(/Live MT5 Account/i)).toBeTruthy();
    });

    const file = new File(["fake-image-bytes"], "screenshot.png", { type: "image/png" });
    const fileInput = container.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const extractBtn = screen.getByRole("button", { name: /Extract Trades/i });
    fireEvent.click(extractBtn);

    // Verify successful preview state
    await waitFor(() => {
      expect(screen.getByText(/Detected Source: MT5/i)).toBeTruthy();
    });

    expect(screen.queryByText("Extraction Timed Out")).toBeNull();
    expect(screen.queryByText("Extraction Failed")).toBeNull();
    expect(screen.getByText(/Ready to Import/i)).toBeTruthy();
  });
});
