// @vitest-environment happy-dom
/**
 * Batch Delete Trades Dialog Tests
 */

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BatchDeleteTradesDialog } from "./batch-delete-trades-dialog";
import * as clientTrades from "@/lib/client/trades";

describe("BatchDeleteTradesDialog Component", () => {
  const defaultProps = {
    selectedIds: ["trade_1", "trade_2", "trade_3"],
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<BatchDeleteTradesDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("does not render when selectedIds is empty", () => {
    render(<BatchDeleteTradesDialog {...defaultProps} selectedIds={[]} />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("renders with correct count and confirmation button", () => {
    render(<BatchDeleteTradesDialog {...defaultProps} />);
    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect(screen.getByText(/delete 3 trades/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /delete 3 trades/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<BatchDeleteTradesDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls deleteTradeClient for all selected trades and triggers onSuccess", async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.spyOn(clientTrades, "deleteTradeClient").mockResolvedValue();

    render(<BatchDeleteTradesDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /delete 3 trades/i }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledTimes(3);
      expect(deleteSpy).toHaveBeenCalledWith("trade_1");
      expect(deleteSpy).toHaveBeenCalledWith("trade_2");
      expect(deleteSpy).toHaveBeenCalledWith("trade_3");
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(["trade_1", "trade_2", "trade_3"]);
    });
  });

  it("handles partial failure and reports successfully deleted IDs", async () => {
    const user = userEvent.setup();
    vi.spyOn(clientTrades, "deleteTradeClient").mockImplementation(async (id) => {
      if (id === "trade_2") {
        throw new Error("Failed to delete trade_2");
      }
    });

    render(<BatchDeleteTradesDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /delete 3 trades/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to delete 1 trade\(s\)/i)).toBeDefined();
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(["trade_1", "trade_3"]);
    });
  });
});
