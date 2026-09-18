// @vitest-environment happy-dom
/**
 * Account Delete Modal Unit Tests
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountDeleteModal } from "./account-delete-modal";
import * as clientAccounts from "@/lib/client/accounts";
import { TradingAccountClientApiError } from "@/lib/client/accounts";

describe("AccountDeleteModal Component", () => {
  const mockAccount: clientAccounts.TradingAccountDto = {
    id: "acc-test-123",
    userId: "user-1",
    name: "MT5 30-Trade Audit Account",
    type: "PAPER_TRADING",
    currency: "USD",
    initialBalance: "50000.00",
    currentBalance: "50000.00",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultProps = {
    account: mockAccount,
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<AccountDeleteModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not render when account is null", () => {
    render(<AccountDeleteModal {...defaultProps} account={null} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders modal with account name and action buttons", () => {
    render(<AccountDeleteModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("MT5 30-Trade Audit Account")).toBeDefined();
    expect(screen.getByRole("button", { name: /delete account/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
  });

  it("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<AccountDeleteModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("deletes account successfully when it has no trades", async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.spyOn(clientAccounts, "deleteTradingAccountClient").mockResolvedValue();

    render(<AccountDeleteModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /delete account/i }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("acc-test-123", { cascade: false });
      expect(defaultProps.onSuccess).toHaveBeenCalledWith("acc-test-123");
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it("displays trade warning and resolution options when deletion is blocked by trades", async () => {
    const user = userEvent.setup();
    vi.spyOn(clientAccounts, "deleteTradingAccountClient").mockRejectedValue(
      new TradingAccountClientApiError(
        "Cannot delete account with associated trades. Deactivate it instead, or delete with all associated trades.",
        400,
        "VALIDATION",
      ),
    );

    render(<AccountDeleteModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /delete account/i }));

    await waitFor(() => {
      expect(screen.getByText("Account Has Recorded Trades")).toBeDefined();
      expect(screen.getByRole("button", { name: /deactivate account/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /delete all trades/i })).toBeDefined();
    });
  });

  it("deactivates account successfully when Deactivate Account is clicked", async () => {
    const user = userEvent.setup();
    vi.spyOn(clientAccounts, "deleteTradingAccountClient").mockRejectedValue(
      new TradingAccountClientApiError(
        "Cannot delete account with associated trades.",
        400,
        "VALIDATION",
      ),
    );
    const deactivateSpy = vi.spyOn(clientAccounts, "deactivateTradingAccountClient").mockResolvedValue({
      ...mockAccount,
      isActive: false,
    });

    render(<AccountDeleteModal {...defaultProps} />);

    // Trigger trade block
    await user.click(screen.getByRole("button", { name: /delete account/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /deactivate account/i })).toBeDefined();
    });

    await user.click(screen.getByRole("button", { name: /deactivate account/i }));

    await waitFor(() => {
      expect(deactivateSpy).toHaveBeenCalledWith("acc-test-123");
      expect(defaultProps.onSuccess).toHaveBeenCalledWith("acc-test-123");
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it("performs cascade deletion when confirmed", async () => {
    const user = userEvent.setup();
    const deleteSpy = vi
      .spyOn(clientAccounts, "deleteTradingAccountClient")
      .mockRejectedValueOnce(
        new TradingAccountClientApiError(
          "Cannot delete account with associated trades.",
          400,
          "VALIDATION",
        ),
      )
      .mockResolvedValueOnce();

    render(<AccountDeleteModal {...defaultProps} />);

    // Initial delete attempt
    await user.click(screen.getByRole("button", { name: /delete account/i }));

    await waitFor(() => {
      expect(screen.getByText("Account Has Recorded Trades")).toBeDefined();
    });

    const cascadeButton = screen.getByRole("button", { name: /delete all trades/i }) as HTMLButtonElement;
    expect(cascadeButton.disabled).toBe(true);

    // Check confirmation checkbox
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(cascadeButton.disabled).toBe(false);

    // Click Delete All Trades
    await user.click(cascadeButton);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenLastCalledWith("acc-test-123", { cascade: true });
      expect(defaultProps.onSuccess).toHaveBeenCalledWith("acc-test-123");
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it("allows dismissing error message", async () => {
    const user = userEvent.setup();
    vi.spyOn(clientAccounts, "deleteTradingAccountClient").mockRejectedValue(
      new TradingAccountClientApiError("General failure message", 500, "SERVER_ERROR"),
    );

    render(<AccountDeleteModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /delete account/i }));

    await waitFor(() => {
      expect(screen.getByText("General failure message")).toBeDefined();
    });

    const dismissButton = screen.getByRole("button", { name: /dismiss error/i });
    await user.click(dismissButton);

    expect(screen.queryByText("General failure message")).toBeNull();
  });
});
