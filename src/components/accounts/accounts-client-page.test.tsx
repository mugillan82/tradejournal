// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountsClientPage } from "./accounts-client-page";
import * as accountsClient from "@/lib/client/accounts";
import type { TradingAccountDto } from "@/lib/client/accounts";

vi.mock("@/lib/client/accounts", async () => {
  const actual = await vi.importActual<typeof accountsClient>("@/lib/client/accounts");
  return {
    ...actual,
    fetchTradingAccountsClient: vi.fn(),
    createTradingAccountClient: vi.fn(),
    updateTradingAccountClient: vi.fn(),
    deleteTradingAccountClient: vi.fn(),
  };
});

const mockAccounts: TradingAccountDto[] = [
  {
    id: "acc-1",
    userId: "user-1",
    name: "Main Prop 50k",
    type: "SIMULATION",
    currency: "USD",
    initialBalance: "50000.00",
    currentBalance: "53250.00",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  },
  {
    id: "acc-2",
    userId: "user-1",
    name: "Crypto Live",
    type: "LIVE",
    currency: "USD",
    initialBalance: "10000.00",
    currentBalance: "9500.00",
    isActive: false,
    createdAt: new Date("2026-01-05T00:00:00Z"),
    updatedAt: new Date("2026-01-06T00:00:00Z"),
  },
];

describe("AccountsClientPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton initially and displays accounts table after fetch", async () => {
    vi.mocked(accountsClient.fetchTradingAccountsClient).mockResolvedValue({
      items: mockAccounts,
      total: 2,
      page: 1,
      pageSize: 100,
    });

    render(<AccountsClientPage />);

    expect(screen.getByLabelText("Loading accounts...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText("Main Prop 50k").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Crypto Live").length).toBeGreaterThan(0);
    });

    // Check KPI summary counts
    expect(screen.getByText("Total Accounts")).toBeDefined();
    expect(screen.getByText("Active Accounts")).toBeDefined();
    expect(screen.getByText("Inactive Accounts")).toBeDefined();
  });

  it("renders empty state when 0 accounts exist", async () => {
    vi.mocked(accountsClient.fetchTradingAccountsClient).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    });

    render(<AccountsClientPage />);

    await waitFor(() => {
      expect(screen.getByText("No Trading Accounts Configured")).toBeDefined();
    });
  });

  it("filters accounts by search query", async () => {
    vi.mocked(accountsClient.fetchTradingAccountsClient).mockResolvedValue({
      items: mockAccounts,
      total: 2,
      page: 1,
      pageSize: 100,
    });

    render(<AccountsClientPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Main Prop 50k").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText("Search accounts by name or currency...");
    fireEvent.change(searchInput, { target: { value: "Crypto" } });

    expect(screen.queryByText("Main Prop 50k")).toBeNull();
    expect(screen.getAllByText("Crypto Live").length).toBeGreaterThan(0);
  });

  it("opens create modal and adds new account", async () => {
    vi.mocked(accountsClient.fetchTradingAccountsClient).mockResolvedValue({
      items: mockAccounts,
      total: 2,
      page: 1,
      pageSize: 100,
    });

    const newAcc: TradingAccountDto = {
      id: "acc-3",
      userId: "user-1",
      name: "New Apex Account",
      type: "SIMULATION",
      currency: "USD",
      initialBalance: "25000.00",
      currentBalance: "25000.00",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(accountsClient.createTradingAccountClient).mockResolvedValue(newAcc);

    render(<AccountsClientPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Main Prop 50k").length).toBeGreaterThan(0);
    });

    const addBtn = screen.getByText("Add Account");
    fireEvent.click(addBtn);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Add Trading Account")).toBeDefined();

    const nameInput = screen.getByPlaceholderText("e.g. Apex 50k Prop, Interactive Brokers Live");
    fireEvent.change(nameInput, { target: { value: "New Apex Account" } });

    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(accountsClient.createTradingAccountClient).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Apex Account",
        }),
      );
      expect(screen.getAllByText("New Apex Account").length).toBeGreaterThan(0);
    });
  });

  it("handles error state and retries on button click", async () => {
    vi.mocked(accountsClient.fetchTradingAccountsClient)
      .mockRejectedValueOnce(new Error("Server offline"))
      .mockResolvedValueOnce({
        items: mockAccounts,
        total: 2,
        page: 1,
        pageSize: 100,
      });

    render(<AccountsClientPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Accounts")).toBeDefined();
    });

    const retryBtn = screen.getByRole("button", { name: /Try Again/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText("Main Prop 50k").length).toBeGreaterThan(0);
    });
  });
});
