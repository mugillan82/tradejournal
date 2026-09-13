/**
 * AI Domain — Service Integration & Security Tests
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Mock database and analytics service
vi.mock("@/lib/db/client", () => ({
  prisma: {
    review: {
      findMany: vi.fn().mockResolvedValue([
        {
          executionQuality: 9,
          ruleAdherence: 8,
          whatWentWrong: "Exited too early",
          emotionalObservation: "Patient mindset",
        },
      ]),
    },
  },
}));

vi.mock("@/lib/trading/analytics/service", () => ({
  getAnalyticsOverview: vi.fn().mockResolvedValue({
    metrics: {
      totalTrades: 25,
      closedTrades: 25,
      winRate: 64.0,
      profitFactor: "2.10",
      netPnl: "3400.00",
      averageWinner: "300.00",
      averageLoser: "180.00",
      averageTradePnl: "136.00",
      averageHoldingDurationSeconds: 4500,
      maxDrawdown: "600.00",
      longTradeCount: 15,
      shortTradeCount: 10,
      longWinRate: 66.67,
      shortWinRate: 60.0,
      longNetPnl: "2200.00",
      shortNetPnl: "1200.00",
    },
    bySymbol: [
      { symbol: "AAPL", tradeCount: 12, winRate: 66.67, netPnl: "1800.00", profitFactor: "2.2" },
    ],
    byStrategy: [
      { strategyName: "Pullback", tradeCount: 15, winRate: 66.67, netPnl: "2400.00" },
    ],
    byMistake: [],
    bySetup: [],
    byTag: [],
    byAccount: [],
    byDate: [],
    equityCurve: [],
  }),
}));

vi.mock("@/lib/trading/journal/service", () => ({
  getReviewById: vi.fn().mockImplementation(async (reviewId: string) => {
    if (reviewId === "forbidden-review") {
      return {
        id: "forbidden-review",
        userId: "foreign-user-999",
        title: "Foreign Review",
        reviewDate: new Date("2026-02-01"),
        status: "COMPLETED",
        rating: 8,
        trades: [],
        tags: [],
        mistakes: [],
      };
    }
    return {
      id: reviewId,
      userId: "user-123",
      title: "My Disciplined Review",
      reviewDate: new Date("2026-02-01"),
      status: "COMPLETED",
      rating: 9,
      executionQuality: 9,
      ruleAdherence: 9,
      riskManagement: 9,
      whatWentWell: "Executed cleanly",
      whatWentWrong: null,
      trades: [],
      tags: [],
      mistakes: [],
    };
  }),
}));

import {
  generateTradeInsights,
  analyzeReview,
  getAiConfigurationStatus,
} from "@/lib/trading/ai/service";

describe("AI Service", () => {
  const userId = "user-123";

  it("returns configuration status", () => {
    const status = getAiConfigurationStatus();
    expect(status.provider).toBeDefined();
    expect(typeof status.configured).toBe("boolean");
    expect(["external-llm", "deterministic", "disabled"]).toContain(status.mode);
  });

  it("fails when userId is empty or missing", async () => {
    await expect(generateTradeInsights("")).rejects.toThrow("Authentication required");
    await expect(analyzeReview("", "rev-1")).rejects.toThrow("Authentication required");
  });

  it("generates grounded insights for user trading dataset", async () => {
    const res = await generateTradeInsights(userId, { symbol: "AAPL" });
    expect(res.sampleSize).toBe(25);
    expect(res.summary).toContain("25 closed trades");
    expect(res.insights.length).toBeGreaterThan(0);
    expect(res.providerConfigured).toBe(true);
    expect(res.generatedAt).toBeDefined();
  });

  it("analyzes user review successfully", async () => {
    const res = await analyzeReview(userId, "rev-valid-1");
    expect(res.reviewId).toBe("rev-valid-1");
    expect(res.executionQuality).toBe(9);
    expect(res.strengths.length).toBeGreaterThan(0);
    expect(res.processRecommendations.length).toBeGreaterThan(0);
  });

  it("enforces cross-user isolation and rejects foreign review IDOR", async () => {
    await expect(analyzeReview(userId, "forbidden-review")).rejects.toThrow(
      "Review not found or unauthorized",
    );
  });

  it("enforces rate limiting after rapid repeated calls", async () => {
    const rateLimitedUser = "user-spammer-999";

    // Exhaust 10 requests
    for (let i = 0; i < 10; i++) {
      await generateTradeInsights(rateLimitedUser);
    }

    // 11th request should trigger rate limit error
    await expect(generateTradeInsights(rateLimitedUser)).rejects.toThrow(/Rate limit exceeded/);
  });
});
