/**
 * AI Insights API Route Tests
 *
 * Tests for POST /api/ai/insights:
 * - 401 Unauthenticated
 * - 400 Invalid JSON
 * - 200 Valid insight generation
 * - 405 Method Not Allowed (GET, PUT, DELETE, PATCH)
 * - Cache-Control: no-store, private
 * - 429 Rate Limiting
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

let mockUserId: string | null = "user-test-ai-1";

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn().mockImplementation(async () => {
    if (!mockUserId) {
      throw new Error("Unauthenticated");
    }
    return mockUserId;
  }),
}));

let shouldThrowRateLimit = false;

vi.mock("@/lib/trading/ai/service", () => ({
  generateTradeInsights: vi.fn().mockImplementation(async () => {
    if (shouldThrowRateLimit) {
      throw new Error("Rate limit exceeded for AI analysis. Please wait 45 second(s) before trying again.");
    }
    return {
      insights: [
        {
          id: "test-insight-1",
          category: "PERFORMANCE",
          title: "Directional Asymmetry",
          summary: "Longs outperform shorts.",
          evidence: { facts: ["Long: 70% win rate"], sampleSize: 20, metrics: {} },
          severity: "MEDIUM",
          confidence: "HIGH",
          recommendations: ["Require stricter confirmation for short positions"],
        },
      ],
      summary: "Analyzed 20 closed trades.",
      sampleSize: 20,
      period: { from: "2026-01-01", to: "2026-03-01" },
      provider: "Deterministic Engine",
      providerConfigured: true,
      generatedAt: new Date().toISOString(),
    };
  }),
}));

import { NextRequest } from "next/server";
import { POST, GET, PUT, DELETE, PATCH } from "@/app/api/ai/insights/route";

describe("POST /api/ai/insights", () => {
  beforeEach(() => {
    mockUserId = "user-test-ai-1";
    shouldThrowRateLimit = false;
  });

  it("returns 401 when unauthenticated", async () => {
    mockUserId = null;
    const req = new NextRequest("http://localhost:3000/api/ai/insights", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("AUTH_REQUIRED");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/insights", {
      method: "POST",
      body: "not-json-content",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_JSON");
  });

  it("returns 200 with insights and no-store headers on valid request", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/insights", {
      method: "POST",
      body: JSON.stringify({
        fromDate: "2026-01-01",
        toDate: "2026-03-01",
        symbol: "AAPL",
        side: "LONG",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");

    const json = await res.json();
    expect(json.sampleSize).toBe(20);
    expect(json.insights.length).toBe(1);
    expect(json.insights[0].title).toBe("Directional Asymmetry");
  });

  it("returns 429 when rate limited", async () => {
    shouldThrowRateLimit = true;

    const req = new NextRequest("http://localhost:3000/api/ai/insights", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(json.error.message).toContain("Rate limit exceeded");
  });

  it("returns 405 Method Not Allowed for GET, PUT, DELETE, PATCH", async () => {
    const getRes = await GET();
    expect(getRes.status).toBe(405);
    expect(getRes.headers.get("allow")).toBe("POST");

    const putRes = await PUT();
    expect(putRes.status).toBe(405);

    const delRes = await DELETE();
    expect(delRes.status).toBe(405);

    const patchRes = await PATCH();
    expect(patchRes.status).toBe(405);
  });
});
