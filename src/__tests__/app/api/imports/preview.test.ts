/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST, GET, PUT, DELETE } from "@/app/api/imports/preview/route";
import { NextRequest } from "next/server";
import * as authSession from "@/lib/auth/session";
import * as accountService from "@/lib/trading/account/service";
import * as importService from "@/lib/trading/import/service";
import type { TradingAccountDto } from "@/lib/trading/account/types";

import readXlsxFile from "read-excel-file/node";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/account/service", () => ({
  getTradingAccountById: vi.fn(),
}));

vi.mock("@/lib/trading/import/service", () => ({
  buildImportPreview: vi.fn(),
}));

vi.mock("read-excel-file/node", () => ({
  default: vi.fn(),
}));

describe("Structured Import Preview API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readXlsxFile).mockResolvedValue([
      {
        sheet: "Sheet1",
        data: [
          ["Symbol", "Side", "Quantity", "Entry Price", "Entry Date"],
          ["EURUSD", "BUY", 1.0, 1.0850, "2024-01-15T10:00:00Z"],
        ],
      },
    ]);
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
    vi.mocked(accountService.getTradingAccountById).mockResolvedValue({
      id: "acc-1",
      userId: "user-1",
      name: "Main",
    } as unknown as TradingAccountDto);
    vi.mocked(importService.buildImportPreview).mockResolvedValue({
      totalRecords: 1,
      validRecords: 1,
      invalidRecords: 0,
      duplicateRecords: 0,
      possibleDuplicates: 0,
      candidates: [],
    });
  });

  function createMockRequest(formData: FormData) {
    return new NextRequest("http://localhost/api/imports/preview", {
      method: "POST",
      body: formData,
    });
  }

  it("requires authentication and returns 401 when unauthorized", async () => {
    vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("AUTH_REQUIRED"));

    const formData = new FormData();
    formData.append("file", new File(["Symbol,Side\nEURUSD,BUY"], "trades.csv", { type: "text/csv" }));
    formData.append("tradingAccountId", "acc-1");

    const res = await POST(createMockRequest(formData));
    expect(res.status).toBe(401);
  });

  it("returns 400 when file is missing", async () => {
    const formData = new FormData();
    formData.append("tradingAccountId", "acc-1");

    const res = await POST(createMockRequest(formData));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toContain("File is required");
  });

  it("returns 400 when tradingAccountId is missing", async () => {
    const formData = new FormData();
    formData.append("file", new File(["Symbol,Side\nEURUSD,BUY"], "trades.csv", { type: "text/csv" }));

    const res = await POST(createMockRequest(formData));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toContain("Trading account ID is required");
  });

  it("returns 400 when file exceeds 10MB limit", async () => {
    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], "trades.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", largeFile);
    formData.append("tradingAccountId", "acc-1");

    const res = await POST(createMockRequest(formData));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toContain("exceeds the limit");
  });

  it("returns 400 when file type is unsupported", async () => {
    const pdfFile = new File(["fake pdf content"], "trades.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", pdfFile);
    formData.append("tradingAccountId", "acc-1");

    const res = await POST(createMockRequest(formData));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error?.message).toContain("Invalid file type");
  });

  it("processes valid CSV file and returns preview with Cache-Control no-store", async () => {
    const csvContent = "Symbol,Side,Quantity,Entry Price,Entry Date\nEURUSD,BUY,1.0,1.0850,2024-01-15";
    const file = new File([csvContent], "trades.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tradingAccountId", "acc-1");

    const res = await POST(createMockRequest(formData));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(importService.buildImportPreview).toHaveBeenCalledTimes(1);
  });

  it("processes valid XLSX file with sheet selection and returns preview", async () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const file = new File([zipBytes], "trades.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tradingAccountId", "acc-1");
    formData.append("sheetName", "Sheet1");

    const res = await POST(createMockRequest(formData));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(importService.buildImportPreview).toHaveBeenCalledTimes(1);
  });

  it("returns 405 with Allow header for unsupported HTTP methods", async () => {
    const getRes = await GET();
    expect(getRes.status).toBe(405);
    expect(getRes.headers.get("Allow")).toBe("POST");

    const putRes = await PUT();
    expect(putRes.status).toBe(405);
    expect(putRes.headers.get("Allow")).toBe("POST");

    const delRes = await DELETE();
    expect(delRes.status).toBe(405);
    expect(delRes.headers.get("Allow")).toBe("POST");
  });
});
