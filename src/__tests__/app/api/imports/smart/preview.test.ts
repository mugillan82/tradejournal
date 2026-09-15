/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/imports/smart/preview/route";
import { NextRequest } from "next/server";
import * as authSession from "@/lib/auth/session";
import * as accountService from "@/lib/trading/account/service";
import type { TradingAccountDto } from "@/lib/trading/account/types";

import path from "path";
import fs from "fs/promises";

import * as tradeService from "@/lib/trading/trade/service";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/account/service", () => ({
  getTradingAccountById: vi.fn(),
}));

vi.mock("@/lib/trading/trade/service", () => ({
  listTrades: vi.fn(),
}));

// Helper to create minimal PNG buffer with custom width and height
function createPngBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  // PNG Magic bytes
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4E;
  buf[3] = 0x47;
  buf[4] = 0x0D;
  buf[5] = 0x0A;
  buf[6] = 0x1A;
  buf[7] = 0x0A;
  // IHDR length 13
  buf.writeUInt32BE(13, 8);
  // 'IHDR'
  buf.write("IHDR", 12, "ascii");
  // width and height
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

describe("Smart Import Preview API Security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(tradeService.listTrades).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });
  });

  function createMockRequest(accountId: string | null, file: File | null) {
    const formData = new FormData();
    if (accountId) formData.append("tradingAccountId", accountId);
    if (file) formData.append("screenshot", file);

    return new NextRequest("http://localhost/api/imports/smart/preview", {
      method: "POST",
      body: formData,
    });
  }

  it("requires authentication", async () => {
    vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("AUTH_REQUIRED"));

    const req = createMockRequest("acc-1", new File([""], "test.png", { type: "image/png" }));
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("rejects request missing tradingAccountId", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");

    const req = createMockRequest(null, new File([""], "test.png", { type: "image/png" }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Missing");
  });

  it("rejects request missing file", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");

    const req = createMockRequest("acc-1", null);
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("rejects unsupported MIME types", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");

    const req = createMockRequest(
      "acc-1",
      new File(["exe payload"], "malicious.exe", { type: "application/x-msdownload" })
    );
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Unsupported image format");
  });

  it("rejects access to foreign account", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");

    // Account belongs to user-2
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-2",
    } as unknown as TradingAccountDto);

    const req = createMockRequest("acc-1", new File(["img"], "test.png", { type: "image/png" }));
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("rejects invalid magic bytes even if MIME type is correct", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-1",
    } as unknown as TradingAccountDto);

    const fakeImageBuffer = new Uint8Array([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
    ]);
    const req = createMockRequest("acc-1", new File([fakeImageBuffer], "test.png", { type: "image/png" }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Invalid image signature");
  });

  it("rejects image exceeding maximum width (4096px)", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-1",
    } as unknown as TradingAccountDto);

    const widePng = createPngBuffer(5000, 1000);
    const req = createMockRequest("acc-1", new File([new Uint8Array(widePng)], "wide.png", { type: "image/png" }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("width (5000px) exceeds maximum allowed limit");
  });

  it("rejects image exceeding maximum height (4096px)", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-1",
    } as unknown as TradingAccountDto);

    const tallPng = createPngBuffer(1000, 6000);
    const req = createMockRequest("acc-1", new File([new Uint8Array(tallPng)], "tall.png", { type: "image/png" }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("height (6000px) exceeds maximum allowed limit");
  });

  it("rejects image exceeding total pixel limit (16MP)", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-1",
    } as unknown as TradingAccountDto);

    const hugePng = createPngBuffer(4096, 4096); // 16,777,216 > 16,000,000
    const req = createMockRequest("acc-1", new File([new Uint8Array(hugePng)], "huge.png", { type: "image/png" }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("pixel count");
  });

  it("rejects oversized file payload (> 5MB)", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-1",
    } as unknown as TradingAccountDto);

    // Create 5.5 MB payload
    const bigBuf = Buffer.alloc(5.5 * 1024 * 1024);
    bigBuf[0] = 0x89;
    bigBuf[1] = 0x50;
    bigBuf[2] = 0x4E;
    bigBuf[3] = 0x47;
    bigBuf[4] = 0x0D;
    bigBuf[5] = 0x0A;
    bigBuf[6] = 0x1A;
    bigBuf[7] = 0x0A;

    const req = createMockRequest("acc-1", new File([new Uint8Array(bigBuf)], "big.png", { type: "image/png" }));
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("5 MB");
  });

  it("returns terminal 408 TIMEOUT when processing operation exceeds bounded timeout", async () => {
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-1",
    } as unknown as TradingAccountDto);

    const smartService = await import("@/lib/trading/smart-import/service");
    vi.spyOn(smartService, "processScreenshot").mockRejectedValueOnce(
      new Error("TIMEOUT: Smart Import processing exceeded 10000ms budget")
    );

    const validPng = createPngBuffer(100, 100);
    const req = createMockRequest("acc-1", new File([new Uint8Array(validPng)], "test.png", { type: "image/png" }));
    const res = await POST(req);

    expect(res.status).toBe(408);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("TIMEOUT");
    expect(body.message).toContain("timed out");
  });

  it(
    "processes real 30-trade MT5 screenshot end-to-end and returns all 30 candidates without truncation",
    { timeout: 35000 },
    async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
        id: "acc-1",
        userId: "user-1",
      } as unknown as TradingAccountDto);

      const fixturePath = path.resolve("src/__tests__/fixtures/real_mt5_history_screenshot.jpg");
      const fileBuf = await fs.readFile(fixturePath);
      const file = new File([new Uint8Array(fileBuf)], "real_mt5.jpg", { type: "image/jpeg" });
      const req = createMockRequest("acc-1", file);

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.sourceDetection.source).toBe("MT5");
      expect(body.preview.candidates).toHaveLength(30);
      expect(body.preview.nonTradeCount).toBeGreaterThanOrEqual(5);

      // Verify no non-trade rows leaked into candidates
      for (const c of body.preview.candidates) {
        expect(/balance|deposit|withdrawal|swap|commission/i.test(c.title || "")).toBe(false);
      }
    }
  );

  it(
    "processes single-trade MT5 screenshot end-to-end and returns exact 1 candidate with 5 excluded non-trades",
    { timeout: 35000 },
    async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
      vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
        id: "acc-1",
        userId: "user-1",
      } as unknown as TradingAccountDto);

      const fixturePath = path.resolve("src/__tests__/fixtures/single_trade_mt5_screenshot.jpg");
      const fileBuf = await fs.readFile(fixturePath);
      const file = new File([new Uint8Array(fileBuf)], "single_trade.jpg", { type: "image/jpeg" });
      const req = createMockRequest("acc-1", file);

      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.sourceDetection.source).toBe("MT5");
      expect(body.preview.candidates).toHaveLength(1);
      expect(body.preview.readyCount).toBe(1);
      expect(body.preview.duplicateCount).toBe(0);
      expect(body.preview.errorCount).toBe(0);
      expect(body.preview.nonTradeCount).toBe(5);

      const trade = body.preview.candidates[0];
      expect(trade.title).toBe("NAS100");
      expect(trade.side).toBe("SHORT");
      expect(trade.quantity).toBe("0.41");
      expect(trade.entryPrice).toBe("29029.97");
      expect(trade.exitPrice).toBe("29095.47");
      expect(trade.grossPnl).toBe("-268.55");
    }
  );
});
