/**
 * AI Review Analysis API Route Tests
 *
 * Tests for POST /api/ai/analyze-review:
 * - 401 Unauthenticated
 * - 400 Missing / invalid reviewId
 * - 200 Successful review debrief
 * - 404 Review not found or unauthorized
 * - 405 Method Not Allowed
 * - Cache-Control: no-store, private
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

let mockUserId: string | null = "user-test-ai-2";

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn().mockImplementation(async () => {
    if (!mockUserId) {
      throw new Error("Unauthenticated");
    }
    return mockUserId;
  }),
}));

let shouldThrowNotFound = false;

vi.mock("@/lib/trading/ai/service", () => ({
  analyzeReview: vi.fn().mockImplementation(async (userId, reviewId) => {
    if (shouldThrowNotFound) {
      throw new Error("Review not found or unauthorized");
    }
    return {
      reviewId,
      summary: "Debrief of review.",
      rating: 8,
      executionQuality: 9,
      ruleAdherence: 8,
      strengths: ["Disciplined stop-loss"],
      weaknesses: ["Late exit"],
      processRecommendations: ["Use trailing stop"],
      riskObservations: ["Risk capped at 1%"],
      provider: "Deterministic Engine",
      providerConfigured: true,
      generatedAt: new Date().toISOString(),
    };
  }),
}));

import { NextRequest } from "next/server";
import { POST, GET, PUT, DELETE, PATCH } from "@/app/api/ai/analyze-review/route";

describe("POST /api/ai/analyze-review", () => {
  beforeEach(() => {
    mockUserId = "user-test-ai-2";
    shouldThrowNotFound = false;
  });

  it("returns 401 when unauthenticated", async () => {
    mockUserId = null;
    const req = new NextRequest("http://localhost:3000/api/ai/analyze-review", {
      method: "POST",
      body: JSON.stringify({ reviewId: "rev-1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("AUTH_REQUIRED");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("returns 400 when reviewId is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/analyze-review", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 200 with structured debrief on valid request", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/analyze-review", {
      method: "POST",
      body: JSON.stringify({ reviewId: "rev-abc" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");

    const json = await res.json();
    expect(json.reviewId).toBe("rev-abc");
    expect(json.executionQuality).toBe(9);
    expect(json.strengths.length).toBe(1);
    expect(json.weaknesses.length).toBe(1);
  });

  it("returns 404 when review is not found or unauthorized", async () => {
    shouldThrowNotFound = true;

    const req = new NextRequest("http://localhost:3000/api/ai/analyze-review", {
      method: "POST",
      body: JSON.stringify({ reviewId: "forbidden-rev" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
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
