// @vitest-environment happy-dom
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TradeNotesSection } from "./trade-notes-section";
import * as clientTrades from "@/lib/client/trades";

vi.mock("@/lib/client/trades", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/trades")>(
    "@/lib/client/trades",
  );
  return {
    ...actual,
    fetchTradeNotes: vi.fn(),
    createTradeNoteClient: vi.fn(),
    updateTradeNoteClient: vi.fn(),
    deleteTradeNoteClient: vi.fn(),
  };
});

describe("TradeNotesSection Component", () => {
  const TRADE_ID = "trade_test_123";

  const mockNotes = [
    {
      id: "note_1",
      tradeId: TRADE_ID,
      content: "First observation: high volume at key resistance.",
      createdAt: new Date("2026-03-01T12:00:00Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientTrades.fetchTradeNotes).mockResolvedValue(mockNotes);
  });

  it("renders trade notes list successfully", async () => {
    render(<TradeNotesSection tradeId={TRADE_ID} />);

    expect(screen.getByText("Execution Notes & Observations")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("First observation: high volume at key resistance.")).toBeDefined();
    });
  });

  it("handles adding a new trade note", async () => {
    const user = userEvent.setup();
    const newNote = {
      id: "note_new",
      tradeId: TRADE_ID,
      content: "Scaled out 50% at 2R.",
      createdAt: new Date(),
    };
    vi.mocked(clientTrades.createTradeNoteClient).mockResolvedValue(newNote);

    render(<TradeNotesSection tradeId={TRADE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("First observation: high volume at key resistance.")).toBeDefined();
    });

    const textarea = screen.getByPlaceholderText(/Add an execution timestamp observation/i);
    await user.type(textarea, "Scaled out 50% at 2R.");

    const addBtn = screen.getByRole("button", { name: /Add Note/i });
    await user.click(addBtn);

    await waitFor(() => {
      expect(clientTrades.createTradeNoteClient).toHaveBeenCalledWith(TRADE_ID, "Scaled out 50% at 2R.");
      expect(screen.getByText("Scaled out 50% at 2R.")).toBeDefined();
    });
  });

  it("opens delete confirmation and deletes note", async () => {
    const user = userEvent.setup();
    vi.mocked(clientTrades.deleteTradeNoteClient).mockResolvedValue(undefined);

    render(<TradeNotesSection tradeId={TRADE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("First observation: high volume at key resistance.")).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText("Delete note");
    await user.click(deleteBtn);

    expect(screen.getByText("Delete Trade Note")).toBeDefined();

    const confirmBtn = screen.getByRole("button", { name: "Delete Note" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(clientTrades.deleteTradeNoteClient).toHaveBeenCalledWith(TRADE_ID, "note_1");
      expect(screen.queryByText("First observation: high volume at key resistance.")).toBeNull();
    });
  });
});
