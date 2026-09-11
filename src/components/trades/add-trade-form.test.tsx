// @vitest-environment happy-dom
/**
 * Add Trade Form Component Tests
 *
 * Tests the React form behavior:
 * - Renders successfully with trading accounts
 * - Account loading & default active account selection
 * - Empty account state handling
 * - LONG / SHORT side toggle and ARIA semantics
 * - OPEN / CLOSED status behavior (exit fields required on CLOSED)
 * - Required field validation and precision rules
 * - Submit loading state and duplicate submission prevention
 * - Successful POST /api/trades submission and redirect to /trades/[id]
 * - Server 400 field-error mapping to form inputs
 * - Network / API error handling with error alert
 * - Value preservation after submission failure
 * - Accessible labels, aria-invalid, and error descriptions
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddTradeForm } from "./add-trade-form";
import * as clientTrades from "@/lib/client/trades";
import { TradeClientApiError } from "@/lib/client/trades";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockAccounts = [
  {
    id: "acc_inactive",
    userId: "user_1",
    name: "Old Account",
    type: "PAPER_TRADING",
    currency: "USD",
    initialBalance: "10000.00",
    currentBalance: "10000.00",
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "acc_active_1",
    userId: "user_1",
    name: "Main Futures",
    type: "PAPER_TRADING",
    currency: "USD",
    initialBalance: "50000.00",
    currentBalance: "52400.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "acc_active_2",
    userId: "user_1",
    name: "Live Equities",
    type: "LIVE",
    currency: "USD",
    initialBalance: "10000.00",
    currentBalance: "11500.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("AddTradeForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(clientTrades, "fetchTradingAccounts").mockResolvedValue(mockAccounts);
  });

  it("renders successfully with accounts loaded and defaults to first active account", async () => {
    render(<AddTradeForm />);

    expect(await screen.findByLabelText(/trading account/i)).toBeDefined();
    expect(screen.getByRole("heading", { name: /add new trade/i })).toBeDefined();

    // Accounts populated and active account defaulted
    const select = screen.getByLabelText(/trading account/i) as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(select.value).toBe("acc_active_1");
  });

  it("renders empty account state guiding to /accounts if user has no trading accounts", async () => {
    vi.spyOn(clientTrades, "fetchTradingAccounts").mockResolvedValue([]);

    render(<AddTradeForm />);

    expect(await screen.findByText(/no trading account found/i)).toBeDefined();
    const link = screen.getByRole("link", { name: /go to accounts/i });
    expect(link.getAttribute("href")).toBe("/accounts");
  });

  it("toggles side between LONG and SHORT with proper radio aria-checked", async () => {
    const user = userEvent.setup();
    render(<AddTradeForm />);

    await screen.findByLabelText(/trading account/i);

    const longBtn = screen.getByRole("radio", { name: /long/i });
    const shortBtn = screen.getByRole("radio", { name: /short/i });

    expect(longBtn.getAttribute("aria-checked")).toBe("true");
    expect(shortBtn.getAttribute("aria-checked")).toBe("false");

    await user.click(shortBtn);
    expect(longBtn.getAttribute("aria-checked")).toBe("false");
    expect(shortBtn.getAttribute("aria-checked")).toBe("true");
  });

  it("validates required fields on empty submit and sets aria-invalid", async () => {
    const user = userEvent.setup();
    render(<AddTradeForm />);

    await screen.findByLabelText(/trading account/i);

    const submitBtn = screen.getByRole("button", { name: /save trade/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/entry price is required/i)).toBeDefined();
    expect(screen.getByText(/quantity is required/i)).toBeDefined();

    const entryPriceInput = screen.getByLabelText(/entry price/i);
    expect(entryPriceInput.getAttribute("aria-invalid")).toBe("true");
    expect(entryPriceInput.getAttribute("aria-describedby")).toBe("entry-price-err");
  });

  it("requires exit price and exit date when status is changed to CLOSED", async () => {
    const user = userEvent.setup();
    render(<AddTradeForm />);

    await screen.findByLabelText(/trading account/i);

    // Provide valid entry fields
    await user.type(screen.getByLabelText(/entry price/i), "150.00");
    await user.type(screen.getByLabelText(/quantity/i), "10");

    // Change status to CLOSED
    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, "CLOSED");

    // Submit
    const submitBtn = screen.getByRole("button", { name: /save trade/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/exit price is required when status is closed/i)).toBeDefined();
    expect(screen.getByText(/exit date is required when status is closed/i)).toBeDefined();
  });

  it("submits valid form data, prevents duplicate clicks, and redirects to /trades/[id]", async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(clientTrades, "createTradeClient").mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                id: "trade_created_abc",
                userId: "user_1",
                tradingAccountId: "acc_active_1",
                side: "LONG",
                status: "OPEN",
                entryPrice: "100.50",
                entryDate: new Date("2026-03-01T10:00:00Z"),
                exitPrice: null,
                exitDate: null,
                stopLoss: "95.00",
                takeProfit: "110.00",
                riskAmount: "55.00",
                plannedRiskReward: "2.00",
                actualRMultiple: null,
                quantity: "10",
                grossPnl: null,
                commission: "1.00",
                fees: null,
                swap: null,
                netPnl: null,
                title: "TSLA Breakout",
                notes: "Clean support bounce",
                strategyId: "strat_momentum",
                setupId: "setup_pullback",
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            50,
          ),
        ),
    );

    render(<AddTradeForm />);

    await screen.findByLabelText(/trading account/i);

    await user.type(screen.getByLabelText(/trade title/i), "TSLA Breakout");
    await user.type(screen.getByLabelText(/entry price/i), "100.50");
    await user.type(screen.getByLabelText(/quantity/i), "10");
    await user.type(screen.getByLabelText(/stop loss/i), "95.00");
    await user.type(screen.getByLabelText(/take profit/i), "110.00");
    await user.type(screen.getByLabelText(/strategy id/i), "strat_momentum");
    await user.type(screen.getByLabelText(/setup id/i), "setup_pullback");
    await user.type(screen.getByLabelText(/trade notes/i), "Clean support bounce");

    const submitBtn = screen.getByRole("button", { name: /save trade/i });
    await user.click(submitBtn);

    // Verify loading and button disabled while submitting
    expect(submitBtn.getAttribute("disabled")).not.toBeNull();

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    const callArg = createSpy.mock.calls[0][0];
    expect(callArg.tradingAccountId).toBe("acc_active_1");
    expect(callArg.side).toBe("LONG");
    expect(callArg.entryPrice).toBe("100.50");
    expect(callArg.quantity).toBe("10");
    expect(callArg.stopLoss).toBe("95.00");
    expect(callArg.takeProfit).toBe("110.00");
    expect(callArg.strategyId).toBe("strat_momentum");
    expect(callArg.setupId).toBe("setup_pullback");
    expect(callArg.notes).toBe("Clean support bounce");

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/trades/trade_created_abc");
    });
  });

  it("maps server 400 field-errors to input elements and preserves entered values", async () => {
    const user = userEvent.setup();
    vi.spyOn(clientTrades, "createTradeClient").mockRejectedValue(
      new TradeClientApiError("Validation failed", 400, "VALIDATION", [
        { path: "entryPrice", message: "entryPrice exceeds account limits" },
      ]),
    );

    render(<AddTradeForm />);

    await screen.findByLabelText(/trading account/i);

    const priceInput = screen.getByLabelText(/entry price/i) as HTMLInputElement;
    const qtyInput = screen.getByLabelText(/quantity/i) as HTMLInputElement;

    await user.type(priceInput, "999999.00");
    await user.type(qtyInput, "100");

    const submitBtn = screen.getByRole("button", { name: /save trade/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/entryprice exceeds account limits/i)).toBeDefined();
    expect(screen.getByText(/unable to save trade/i)).toBeDefined();

    // Values preserved
    expect(priceInput.value).toBe("999999.00");
    expect(qtyInput.value).toBe("100");
  });

  it("handles general network errors gracefully with an alert banner", async () => {
    const user = userEvent.setup();
    vi.spyOn(clientTrades, "createTradeClient").mockRejectedValue(
      new TradeClientApiError("Service unavailable", 500, "NETWORK_ERROR"),
    );

    render(<AddTradeForm />);

    await screen.findByLabelText(/trading account/i);

    await user.type(screen.getByLabelText(/entry price/i), "100.00");
    await user.type(screen.getByLabelText(/quantity/i), "5");

    const submitBtn = screen.getByRole("button", { name: /save trade/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/service unavailable/i)).toBeDefined();
    expect(screen.getByRole("alert")).toBeDefined();
  });
});
