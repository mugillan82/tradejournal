// @vitest-environment happy-dom
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TradeAttachmentsSection } from "./trade-attachments-section";
import * as clientTrades from "@/lib/client/trades";

vi.mock("@/lib/client/trades", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/trades")>(
    "@/lib/client/trades",
  );
  return {
    ...actual,
    fetchTradeAttachments: vi.fn(),
    uploadTradeAttachment: vi.fn(),
    deleteTradeAttachment: vi.fn(),
  };
});

describe("TradeAttachmentsSection Component", () => {
  const TRADE_ID = "trade_test_123";

  const mockAttachments = [
    {
      id: "att_1",
      tradeId: TRADE_ID,
      journalEntryId: null,
      fileName: "btc_breakout.png",
      fileUrl: "/uploads/btc.png",
      fileSize: 204800, // 200 KB
      mimeType: "image/png",
      uploadedAt: new Date("2026-03-01T12:00:00Z"),
    },
    {
      id: "att_2",
      tradeId: TRADE_ID,
      journalEntryId: null,
      fileName: "broker_statement.pdf",
      fileUrl: "/uploads/statement.pdf",
      fileSize: 1048576, // 1 MB
      mimeType: "application/pdf",
      uploadedAt: new Date("2026-03-02T12:00:00Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientTrades.fetchTradeAttachments).mockResolvedValue(mockAttachments);
  });

  it("renders attachments list and displays item count", async () => {
    render(<TradeAttachmentsSection tradeId={TRADE_ID} />);

    expect(screen.getByText("Trade Attachments & Evidence")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("btc_breakout.png")).toBeDefined();
      expect(screen.getByText("broker_statement.pdf")).toBeDefined();
      expect(screen.getByText("PDF Document")).toBeDefined();
    });
  });

  it("renders empty state when there are no attachments", async () => {
    vi.mocked(clientTrades.fetchTradeAttachments).mockResolvedValue([]);
    render(<TradeAttachmentsSection tradeId={TRADE_ID} />);

    await waitFor(() => {
      expect(
        screen.getByText("No chart screenshots or trade evidence attached yet."),
      ).toBeDefined();
    });
  });

  it("handles successful file upload via file input", async () => {
    const user = userEvent.setup();
    const newAttachment = {
      id: "att_new",
      tradeId: TRADE_ID,
      journalEntryId: null,
      fileName: "new_chart.webp",
      fileUrl: "/uploads/new_chart.webp",
      fileSize: 1024,
      mimeType: "image/webp",
      uploadedAt: new Date(),
    };
    vi.mocked(clientTrades.uploadTradeAttachment).mockResolvedValue(newAttachment);

    render(<TradeAttachmentsSection tradeId={TRADE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("btc_breakout.png")).toBeDefined();
    });

    const fileInput = screen.getByLabelText("Upload trade evidence attachment");
    const file = new File(["chart"], "new_chart.webp", { type: "image/webp" });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(clientTrades.uploadTradeAttachment).toHaveBeenCalledWith(TRADE_ID, file);
      expect(screen.getByText("new_chart.webp")).toBeDefined();
      expect(screen.getByText('Successfully uploaded "new_chart.webp"')).toBeDefined();
    });
  });

  it("shows client-side validation error for oversized file", async () => {
    const user = userEvent.setup();
    render(<TradeAttachmentsSection tradeId={TRADE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("btc_breakout.png")).toBeDefined();
    });

    const fileInput = screen.getByLabelText("Upload trade evidence attachment");
    const hugeBuffer = new ArrayBuffer(11 * 1024 * 1024); // 11 MB
    const hugeFile = new File([hugeBuffer], "huge.png", { type: "image/png" });

    await user.upload(fileInput, hugeFile);

    await waitFor(() => {
      expect(clientTrades.uploadTradeAttachment).not.toHaveBeenCalled();
      expect(screen.getByText(/File size exceeds limit/i)).toBeDefined();
    });
  });

  it("opens delete confirmation modal and removes attachment upon confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(clientTrades.deleteTradeAttachment).mockResolvedValue(undefined);

    render(<TradeAttachmentsSection tradeId={TRADE_ID} />);

    await waitFor(() => {
      expect(screen.getByText("btc_breakout.png")).toBeDefined();
    });

    const deleteBtn = screen.getByLabelText("Delete btc_breakout.png");
    await user.click(deleteBtn);

    // Modal is opened
    expect(screen.getByText("Delete Attachment")).toBeDefined();
    expect(
      screen.getByText(/Are you sure you want to permanently delete/i),
    ).toBeDefined();

    // Confirm deletion
    const confirmBtn = screen.getByText("Confirm Delete");
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(clientTrades.deleteTradeAttachment).toHaveBeenCalledWith(TRADE_ID, "att_1");
      expect(screen.queryByText("btc_breakout.png")).toBeNull();
    });
  });
});
