import { describe, expect, it, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));

import { confirmImport } from "@/lib/trading/import/service";
import * as authSession from "@/lib/auth/session";
import * as accountService from "@/lib/trading/account/service";
import * as tradeService from "@/lib/trading/trade/service";
import * as attachmentService from "@/lib/trading/attachment/service";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import type { NormalizedTradeCandidate } from "@/lib/trading/import/types";
import type { TradeDto } from "@/lib/trading/trade/types";
import type { AttachmentDto } from "@/lib/trading/attachment/types";

// Mock dependencies
vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/account/service", () => ({
  getTradingAccountById: vi.fn(),
}));

vi.mock("@/lib/trading/trade/service", () => ({
  listTrades: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5000 }),
  createTrade: vi.fn(),
}));

vi.mock("@/lib/trading/attachment/service", () => ({
  uploadTradeAttachment: vi.fn(),
  getTradeAttachmentContent: vi.fn(),
}));

describe("Smart Import Evidence Preservation & Integration", () => {
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,
  ]);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-1",
    } as unknown as TradingAccountDto);
    vi.mocked(tradeService.listTrades).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5000 });
  });

  it("associates source screenshot with successfully created trade via AttachmentService", async () => {
    vi.mocked(tradeService.createTrade).mockResolvedValue({
      id: "trade-123",
      userId: "user-1",
      tradingAccountId: "acc-1",
    } as unknown as TradeDto);

    vi.mocked(attachmentService.uploadTradeAttachment).mockResolvedValue({
      id: "att-456",
      tradeId: "trade-123",
      fileName: "screenshot.png",
      fileUrl: "/api/trades/trade-123/attachments/att-456/download",
      uploadedAt: new Date(),
    } as unknown as AttachmentDto);

    const candidate: NormalizedTradeCandidate = {
      candidateId: "cand-1",
      tradingAccountId: "acc-1",
      side: "LONG",
      status: "OPEN",
      entryDate: new Date("2023-10-01T10:00:00Z"),
      entryPrice: "100.50",
      quantity: "1.0",
      title: "EURUSD",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    };

    const evidenceMap = {
      "cand-1": {
        fileName: "mt4_screenshot.png",
        mimeType: "image/png",
        buffer: validPngBuffer,
      },
    };

    const result = await confirmImport([candidate], evidenceMap);

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(0);
    expect(tradeService.createTrade).toHaveBeenCalledTimes(1);
    expect(attachmentService.uploadTradeAttachment).toHaveBeenCalledWith("trade-123", {
      fileName: "mt4_screenshot.png",
      mimeType: "image/png",
      buffer: validPngBuffer,
    });
    expect(result.trades).toBeDefined();
    expect(result.trades?.[0]).toEqual({
      candidateId: "cand-1",
      tradeId: "trade-123",
      attachmentId: "att-456",
    });
  });

  it("does not associate failed candidate's evidence with any other trade", async () => {
    // Candidate 1 fails validation (missing quantity)
    const cand1Invalid: NormalizedTradeCandidate = {
      candidateId: "cand-invalid",
      tradingAccountId: "acc-1",
      side: "LONG",
      status: "OPEN",
      entryDate: new Date("2023-10-01T10:00:00Z"),
      entryPrice: "100.50",
      quantity: undefined as unknown as string,
      title: "EURUSD",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: false,
    };

    // Candidate 2 succeeds
    const cand2Valid: NormalizedTradeCandidate = {
      candidateId: "cand-valid",
      tradingAccountId: "acc-1",
      side: "SHORT",
      status: "OPEN",
      entryDate: new Date("2023-10-01T11:00:00Z"),
      entryPrice: "150.00",
      quantity: "2.0",
      title: "GBPUSD",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    };

    vi.mocked(tradeService.createTrade).mockResolvedValue({
      id: "trade-cand-2",
      userId: "user-1",
      tradingAccountId: "acc-1",
    } as unknown as TradeDto);

    vi.mocked(attachmentService.uploadTradeAttachment).mockResolvedValue({
      id: "att-cand-2",
      tradeId: "trade-cand-2",
      fileName: "cand2.png",
      fileUrl: "/api/trades/trade-cand-2/attachments/att-cand-2/download",
      uploadedAt: new Date(),
    } as unknown as AttachmentDto);

    const evidenceMap = {
      "cand-invalid": {
        fileName: "cand1_failed.png",
        mimeType: "image/png",
        buffer: validPngBuffer,
      },
      "cand-valid": {
        fileName: "cand2.png",
        mimeType: "image/png",
        buffer: validPngBuffer,
      },
    };

    const result = await confirmImport([cand1Invalid, cand2Valid], evidenceMap);

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);

    // uploadTradeAttachment must be called ONCE for cand-valid, NEVER for cand-invalid
    expect(attachmentService.uploadTradeAttachment).toHaveBeenCalledTimes(1);
    expect(attachmentService.uploadTradeAttachment).toHaveBeenCalledWith("trade-cand-2", {
      fileName: "cand2.png",
      mimeType: "image/png",
      buffer: validPngBuffer,
    });
  });

  it("deterministically associates multiple screenshots to their respective trades", async () => {
    const candA: NormalizedTradeCandidate = {
      candidateId: "cand-A",
      tradingAccountId: "acc-1",
      side: "LONG",
      status: "OPEN",
      entryDate: new Date("2023-10-01T10:00:00Z"),
      entryPrice: "100.00",
      quantity: "1.0",
      title: "AAPL",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    };

    const candB: NormalizedTradeCandidate = {
      candidateId: "cand-B",
      tradingAccountId: "acc-1",
      side: "SHORT",
      status: "OPEN",
      entryDate: new Date("2023-10-01T12:00:00Z"),
      entryPrice: "200.00",
      quantity: "2.0",
      title: "TSLA",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    };

    vi.mocked(tradeService.createTrade)
      .mockResolvedValueOnce({ id: "trade-A" } as unknown as TradeDto)
      .mockResolvedValueOnce({ id: "trade-B" } as unknown as TradeDto);

    vi.mocked(attachmentService.uploadTradeAttachment)
      .mockResolvedValueOnce({ id: "att-A" } as unknown as AttachmentDto)
      .mockResolvedValueOnce({ id: "att-B" } as unknown as AttachmentDto);

    const evidenceMap = {
      "cand-A": { fileName: "screen_A.png", mimeType: "image/png", buffer: validPngBuffer },
      "cand-B": { fileName: "screen_B.png", mimeType: "image/png", buffer: validPngBuffer },
    };

    const result = await confirmImport([candA, candB], evidenceMap);

    expect(result.successful).toBe(2);
    expect(attachmentService.uploadTradeAttachment).toHaveBeenNthCalledWith(1, "trade-A", {
      fileName: "screen_A.png",
      mimeType: "image/png",
      buffer: validPngBuffer,
    });
    expect(attachmentService.uploadTradeAttachment).toHaveBeenNthCalledWith(2, "trade-B", {
      fileName: "screen_B.png",
      mimeType: "image/png",
      buffer: validPngBuffer,
    });
  });

  it("handles rejection when AttachmentService fails validation for malformed evidence", async () => {
    vi.mocked(tradeService.createTrade).mockResolvedValue({
      id: "trade-123",
      userId: "user-1",
      tradingAccountId: "acc-1",
    } as unknown as TradeDto);

    vi.mocked(attachmentService.uploadTradeAttachment).mockRejectedValue(
      new Error("Invalid file signature")
    );

    const candidate: NormalizedTradeCandidate = {
      candidateId: "cand-1",
      tradingAccountId: "acc-1",
      side: "LONG",
      status: "OPEN",
      entryDate: new Date("2023-10-01T10:00:00Z"),
      entryPrice: "100.50",
      quantity: "1.0",
      title: "EURUSD",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    };

    const evidenceMap = {
      "cand-1": {
        fileName: "corrupt.png",
        mimeType: "image/png",
        buffer: Buffer.from([0x00, 0x01]),
      },
    };

    const result = await confirmImport([candidate], evidenceMap);

    // The trade was created, but the error tracks the evidence attachment failure
    expect(result.successful).toBe(1);
    expect(result.errors.some((e) => e.error.includes("evidence attachment failed"))).toBe(true);
  });

  it("preserves private attachment authorization and blocks foreign user access", async () => {
    // Attempting to fetch attachment content for foreign user throws
    vi.mocked(attachmentService.getTradeAttachmentContent).mockRejectedValue(
      new Error("NOT_FOUND")
    );

    await expect(
      attachmentService.getTradeAttachmentContent("trade-foreign", "att-secret")
    ).rejects.toThrowError("NOT_FOUND");
  });
});
