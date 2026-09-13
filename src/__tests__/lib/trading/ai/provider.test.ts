/**
 * AI Domain — Provider Abstraction Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DeterministicProvider,
  DisabledProvider,
  GeminiProvider,
  OpenAiProvider,
  getAiProvider,
} from "@/lib/trading/ai/provider";
import type { AiAnalysisContext, ReviewAnalysisContext } from "@/lib/trading/ai/types";

describe("AI Providers", () => {
  const dummyContext: AiAnalysisContext = {
    dateRange: { from: "2026-01-01", to: "2026-01-31" },
    totalTrades: 15,
    closedTrades: 15,
    winRate: 60.0,
    profitFactor: "1.8",
    netPnl: "1500.00",
    averageWinner: "250.00",
    averageLoser: "150.00",
    averageTradePnl: "100.00",
    averageHoldingDurationSeconds: 3600,
    maxDrawdown: "400.00",
    longVsShort: {
      longCount: 10,
      shortCount: 5,
      longWinRate: 60.0,
      shortWinRate: 60.0,
      longNetPnl: "1000.00",
      shortNetPnl: "500.00",
    },
    topSymbols: [],
    topStrategies: [],
    topMistakes: [],
  };

  const dummyReviewContext: ReviewAnalysisContext = {
    reviewId: "rev-123",
    title: "Weekly Review",
    reviewDate: "2026-01-15",
    rating: 8,
    status: "COMPLETED",
    executionQuality: 9,
    ruleAdherence: 4,
    riskManagement: 9,
    thesis: "Tested breakout rules",
    whatWentWell: "Followed stop-loss rules diligently",
    whatWentWrong: "Entered early on 1 trade",
    emotionalObservation: "Felt calm and patient",
    lessonsLearned: "Wait for 5m candle close",
    improvementActions: "Set alert at key level",
    trades: [{ id: "t1", side: "LONG", netPnl: "200.00", entryPrice: "1.05", exitPrice: "1.07" }],
    mistakes: ["Early Entry"],
  };

  describe("DeterministicProvider", () => {
    const provider = new DeterministicProvider();

    it("reports isConfigured as true", () => {
      expect(provider.isConfigured()).toBe(true);
      expect(provider.name).toBe("Deterministic Engine");
    });

    it("generates structured factual insights without external calls", async () => {
      const res = await provider.generateInsights(dummyContext);
      expect(res.summary).toContain("Analyzed 15 closed trades");
      expect(res.insights.length).toBeGreaterThan(0);
    });

    it("analyzes trade reviews with strengths, weaknesses, and recommendations", async () => {
      const res = await provider.analyzeReview(dummyReviewContext);
      expect(res.summary).toContain("Weekly Review");
      expect(res.strengths.some((s) => s.includes("execution quality"))).toBe(true);
      expect(res.weaknesses.some((w) => w.includes("Rule adherence"))).toBe(true);
      expect(res.weaknesses.some((w) => w.includes("Early Entry"))).toBe(true);
      expect(res.processRecommendations.length).toBeGreaterThan(0);
      expect(res.riskObservations.length).toBeGreaterThan(0);
    });
  });

  describe("DisabledProvider", () => {
    const provider = new DisabledProvider();

    it("reports isConfigured as false", () => {
      expect(provider.isConfigured()).toBe(false);
      expect(provider.name).toBe("Disabled");
    });

    it("returns empty insights with a disabled explanation", async () => {
      const res = await provider.generateInsights();
      expect(res.insights).toEqual([]);
      expect(res.summary).toContain("disabled");
    });
  });

  describe("getAiProvider Factory", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.AI_PROVIDER;
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns DeterministicProvider by default when no keys configured", () => {
      const provider = getAiProvider();
      expect(provider.name).toBe("Deterministic Engine");
      expect(provider.isConfigured()).toBe(true);
    });

    it("returns DisabledProvider when AI_PROVIDER=disabled", () => {
      process.env.AI_PROVIDER = "disabled";
      const provider = getAiProvider();
      expect(provider.name).toBe("Disabled");
      expect(provider.isConfigured()).toBe(false);
    });

    it("returns GeminiProvider when GEMINI_API_KEY is configured", () => {
      process.env.GEMINI_API_KEY = "dummy-gemini-key-123";
      const provider = getAiProvider();
      expect(provider.name).toBe("Google Gemini");
      expect(provider.isConfigured()).toBe(true);
    });

    it("returns OpenAiProvider when OPENAI_API_KEY is configured", () => {
      process.env.OPENAI_API_KEY = "dummy-openai-key-123";
      const provider = getAiProvider();
      expect(provider.name).toBe("OpenAI");
      expect(provider.isConfigured()).toBe(true);
      const directProvider = new OpenAiProvider("dummy-key");
      expect(directProvider.isConfigured()).toBe(true);
    });
  });

  describe("External Provider Fallback & Sanitization", () => {
    it("falls back to deterministic results when fetch fails", async () => {
      const provider = new GeminiProvider("mock-key-12345");
      // Mock global fetch to fail
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error("Network connection failed"));

      try {
        const res = await provider.generateInsights(dummyContext);
        expect(res.insights.length).toBeGreaterThan(0);
        expect(res.summary).toContain("Analyzed 15 closed trades");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("sanitizes HTML tags from LLM response", async () => {
      const provider = new GeminiProvider("mock-key-12345");
      const mockLlmResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: "<b>Important:</b> <script>alert('xss')</script>Sample analyzed.",
                    insights: [
                      {
                        category: "PERFORMANCE",
                        title: "<h1>Malicious Header</h1>Safe Title",
                        summary: "<p>Risk is <i>well-managed</i>.</p>",
                        severity: "INFO",
                        confidence: "HIGH",
                        evidence: {
                          facts: ["<b>Fact 1</b>: 60% win rate"],
                          sampleSize: 15,
                        },
                        recommendations: ["<script>evil()</script>Maintain position size"],
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLlmResponse,
      } as unknown as Response);

      try {
        const res = await provider.generateInsights(dummyContext);
        expect(res.summary).not.toContain("<script>");
        expect(res.summary).not.toContain("<b>");
        expect(res.insights[0].title).not.toContain("<h1>");
        expect(res.insights[0].summary).not.toContain("<p>");
        expect(res.insights[0].evidence.facts[0]).not.toContain("<b>");
        expect(res.insights[0].recommendations[0]).not.toContain("<script>");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
