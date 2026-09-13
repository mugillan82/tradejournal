/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST, GET, PUT, DELETE } from "@/app/api/imports/confirm/route";
import { NextRequest } from "next/server";
import * as authSession from "@/lib/auth/session";
import * as importService from "@/lib/trading/import/service";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/import/service", () => ({
  confirmImport: vi.fn(),
}));

describe("Confirm Import API Route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authSession.requireServerUserId).mockResolvedValue("user-1");
  });

  function createJsonRequest(body: unknown) {
    return new NextRequest("http://localhost/api/imports/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("requires authentication and returns 401 when unauthorized", async () => {
    vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("AUTH_REQUIRED"));

    const req = createJsonRequest({ candidates: [] });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when candidates array is missing or malformed", async () => {
    const res1 = await POST(createJsonRequest({}));
    expect(res1.status).toBe(400);

    const res2 = await POST(createJsonRequest({ candidates: "not an array" }));
    expect(res2.status).toBe(400);
  });

  it("confirms import and returns 200 with no-store cache header", async () => {
    vi.mocked(importService.confirmImport).mockResolvedValue({
      successful: 2,
      failed: 0,
      errors: [],
      trades: [
        { candidateId: "cand-1", tradeId: "trade-1" },
        { candidateId: "cand-2", tradeId: "trade-2" },
      ],
    });

    const candidates = [
      {
        candidateId: "cand-1",
        tradingAccountId: "acc-1",
        title: "EURUSD",
        side: "LONG",
        quantity: "1.0",
        entryPrice: "1.0850",
        entryDate: new Date(),
        validationIssues: [],
        confidence: { score: 1, level: "HIGH", reasons: [] },
        duplicateMatch: { classification: "NONE", reasons: [] },
        isValid: true,
      },
    ];

    const req = createJsonRequest({ candidates });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = await res.json();
    expect(body.successful).toBe(2);
  });

  it("returns 405 with Allow header for unsupported methods", async () => {
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
