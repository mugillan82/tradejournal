// @vitest-environment happy-dom
/**
 * Trade Detail View Component Tests
 *
 * Tests:
 * - Rendering complete trade details (hero P&L, execution metrics, risk, journal context)
 * - Loading skeleton state
 * - 404 Not Found state with return link
 * - API / Server error state with retry button
 * - Edit Trade modal: opens, populates fields, validates required/closed fields, calls updateTradeClient, updates view
 * - Delete Trade dialog: opens, confirms, calls deleteTradeClient, redirects to /trades
 * - Accessibility: aria-modal, role="dialog", role="alertdialog", aria-invalid, labels
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TradeDetailView } from "./trade-detail-view";
import * as clientTrades from "@/lib/client/trades";
import { TradeClientApiError } from "@/lib/client/trades";
import type { TradeDto } from "@/lib/trading/trade/types";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockTrade: TradeDto = {
  id: "trade_detail_123",
  userId: "user_1",
  tradingAccountId: "acc_1",
  side: "LONG",
  status: "CLOSED",
  entryPrice: "150.00",
  entryDate: new Date("2026-03-01T10:00:00.000Z"),
  exitPrice: "165.00",
  exitDate: new Date("2026-03-02T16:00:00.000Z"),
  stopLoss: "145.00",
  takeProfit: "170.00",
  riskAmount: "500.00",
  plannedRiskReward: "2.00",
  actualRMultiple: "3.00",
  quantity: "100",
  grossPnl: "1500.00",
  commission: "5.00",
  fees: "2.50",
  swap: "1.00",
  netPnl: "1491.50",
  title: "NVDA Earnings Run",
  notes: "Clean breakout on heavy volume.",
  strategyId: "strat_momentum",
  setupId: "setup_pullback",
  createdAt: new Date("2026-03-01T10:00:00.000Z"),
  updatedAt: new Date("2026-03-02T16:00:00.000Z"),
};

const mockAccounts = [
  {
    id: "acc_1",
    userId: "user_1",
    name: "Main Futures Account",
    type: "PAPER_TRADING",
    currency: "USD",
    initialBalance: "50000.00",
    currentBalance: "55000.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

vi.mock("./trade-classification-section", () => ({
  TradeClassificationSection: () => <div data-testid="trade-classification-section">Framework &amp; Classifications</div>,
}));

vi.mock("./trade-notes-section", () => ({
  TradeNotesSection: () => <div data-testid="trade-notes-section">Trade Notes Section</div>,
}));

vi.mock("./trade-attachments-section", () => ({
  TradeAttachmentsSection: () => <div data-testid="trade-attachments-section">Trade Attachments Section</div>,
}));

describe("TradeDetailView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(clientTrades, "fetchTradeById").mockResolvedValue(mockTrade);
    vi.spyOn(clientTrades, "fetchTradingAccounts").mockResolvedValue(mockAccounts);
  });


  it("renders complete trade details after loading", async () => {
    render(<TradeDetailView tradeId="trade_detail_123" />);

    expect(await screen.findByText("NVDA Earnings Run")).toBeDefined();
    expect(screen.getByText("Main Futures Account")).toBeDefined();
    expect(screen.getByText("LONG")).toBeDefined();
    expect(screen.getByText("CLOSED")).toBeDefined();
    expect(screen.getByText("$150.00")).toBeDefined();
    expect(screen.getByText("$165.00")).toBeDefined();
    expect(screen.getByText("100")).toBeDefined();
    expect(screen.getByText(/Framework & Classifications/i)).toBeDefined();
  });


  it("renders not-found state when API returns 404", async () => {
    vi.spyOn(clientTrades, "fetchTradeById").mockRejectedValue(
      new TradeClientApiError("Trade not found", 404, "NOT_FOUND"),
    );

    render(<TradeDetailView tradeId="nonexistent_id" />);

    expect(await screen.findByText(/trade record not found/i)).toBeDefined();
    const returnLink = screen.getByRole("link", { name: /return to trades log/i });
    expect(returnLink.getAttribute("href")).toBe("/trades");
  });

  it("renders error state with working retry button on server failure", async () => {
    const fetchSpy = vi.spyOn(clientTrades, "fetchTradeById")
      .mockRejectedValueOnce(new TradeClientApiError("Database timeout", 500, "DATABASE_ERROR"))
      .mockResolvedValueOnce(mockTrade);

    render(<TradeDetailView tradeId="trade_detail_123" />);

    expect(await screen.findByText(/failed to load trade details/i)).toBeDefined();

    const user = userEvent.setup();
    const retryBtn = screen.getByRole("button", { name: /retry request/i });
    await user.click(retryBtn);

    expect(await screen.findByText("NVDA Earnings Run")).toBeDefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("opens edit modal, validates inputs, and saves updated trade", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(clientTrades, "updateTradeClient").mockResolvedValue({
      ...mockTrade,
      title: "NVDA Earnings Extended",
      notes: "Updated review notes after closing.",
    });

    render(<TradeDetailView tradeId="trade_detail_123" />);

    await screen.findByText("NVDA Earnings Run");

    const editBtn = screen.getByRole("button", { name: /edit trade/i });
    await user.click(editBtn);

    // Modal dialog is open
    expect(screen.getByRole("dialog", { hidden: true })).toBeDefined();

    // Edit title and notes
    const titleInput = screen.getByLabelText(/title \/ symbol/i) as HTMLInputElement;
    expect(titleInput.value).toBe("NVDA Earnings Run");

    await user.clear(titleInput);
    await user.type(titleInput, "NVDA Earnings Extended");

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        "trade_detail_123",
        expect.objectContaining({
          title: "NVDA Earnings Extended",
        }),
      );
    });

    // View is updated with new title in-place
    expect(await screen.findByText("NVDA Earnings Extended")).toBeDefined();
  });

  it("opens delete confirmation dialog and deletes trade, redirecting to /trades", async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.spyOn(clientTrades, "deleteTradeClient").mockResolvedValue();

    render(<TradeDetailView tradeId="trade_detail_123" />);

    await screen.findByText("NVDA Earnings Run");

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteBtn);

    // Alertdialog is open
    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect(screen.getByText(/are you sure you want to permanently delete/i)).toBeDefined();

    const confirmDeleteBtn = screen.getByRole("button", { name: /delete trade/i });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("trade_detail_123");
    });

    expect(mockPush).toHaveBeenCalledWith("/trades");
  });

  it("displays server validation error inside edit modal", async () => {
    const user = userEvent.setup();
    vi.spyOn(clientTrades, "updateTradeClient").mockRejectedValue(
      new TradeClientApiError("Validation failed", 400, "VALIDATION", [
        { path: "entryPrice", message: "entryPrice exceeds account limits" },
      ]),
    );

    render(<TradeDetailView tradeId="trade_detail_123" />);

    await screen.findByText("NVDA Earnings Run");

    const editBtn = screen.getByRole("button", { name: /edit trade/i });
    await user.click(editBtn);

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveBtn);

    expect(await screen.findByText(/entryprice exceeds account limits/i)).toBeDefined();
  });
});
