// @vitest-environment happy-dom
/**
 * Dashboard Header Component Tests
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import type { TradingAccountDto } from "@/lib/client/dashboard";

describe("DashboardHeader Component", () => {
  const mockAccounts: TradingAccountDto[] = [
    {
      id: "acc_1",
      userId: "user_1",
      name: "Primary Fund",
      type: "PROP_FIRM",
      currency: "USD",
      initialBalance: "100000.00",
      currentBalance: "104500.00",
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "acc_2",
      userId: "user_1",
      name: "Crypto Prop",
      type: "CRYPTO",
      currency: "USD",
      initialBalance: "25000.00",
      currentBalance: "26100.00",
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    accounts: mockAccounts,
    selectedAccountId: undefined,
    onAccountChange: vi.fn(),
    onRefresh: vi.fn(),
    isRefreshing: false,
    onCustomize: vi.fn(),
    onAddAccount: vi.fn(),
    onDeleteAccount: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dashboard header with accounts and plus button", () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(screen.getByRole("heading", { name: /trading command center/i })).toBeDefined();
    expect(screen.getByRole("combobox", { name: /filter by trading account/i })).toBeDefined();
    expect(screen.getByTestId("dashboard-add-account-btn")).toBeDefined();
  });

  it("triggers onAddAccount when clicking plus button", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} />);

    await user.click(screen.getByTestId("dashboard-add-account-btn"));
    expect(defaultProps.onAddAccount).toHaveBeenCalledTimes(1);
  });

  it("renders minus button when an account is selected and triggers onDeleteAccount", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader {...defaultProps} selectedAccountId="acc_1" />);

    const deleteBtn = screen.getByTestId("dashboard-delete-account-btn");
    expect(deleteBtn).toBeDefined();

    await user.click(deleteBtn);
    expect(defaultProps.onDeleteAccount).toHaveBeenCalledWith("acc_1");
  });

  it("does not render minus button when no account is selected", () => {
    render(<DashboardHeader {...defaultProps} selectedAccountId={undefined} />);
    expect(screen.queryByTestId("dashboard-delete-account-btn")).toBeNull();
  });
});
