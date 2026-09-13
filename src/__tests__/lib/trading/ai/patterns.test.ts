/**
 * AI Domain — Deterministic Pattern Engine Tests
 *
 * Tests:
 * - Directional divergence (Long vs Short)
 * - Risk & loss asymmetry
 * - Negative expectancy symbol drag
 * - Strategy performance disparity
 * - Mistake financial leakage
 * - Review rule adherence friction
 * - Sample size thresholds and confidence scaling
 * - Empty dataset robustness
 */

import { describe, it, expect } from "vitest";
import { detectDeterministicPatterns } from "@/lib/trading/ai/patterns";
import type { AiAnalysisContext } from "@/lib/trading/ai/types";

describe("detectDeterministicPatterns", () => {
  const baseContext: AiAnalysisContext = {
    dateRange: { from: "2026-01-01", to: "2026-03-31" },
    totalTrades: 35,
    closedTrades: 35,
    winRate: 54.29,
    profitFactor: "1.45",
    netPnl: "4250.00",
    averageWinner: "350.00",
    averageLoser: "280.00",
    averageTradePnl: "121.43",
    averageHoldingDurationSeconds: 7200,
    maxDrawdown: "1200.00",
    longVsShort: {
      longCount: 20,
      shortCount: 15,
      longWinRate: 55.0,
      shortWinRate: 53.33,
      longNetPnl: "2500.00",
      shortNetPnl: "1750.00",
    },
    topSymbols: [
      {
        symbol: "EURUSD",
        count: 15,
        winRate: 60.0,
        netPnl: "2100.00",
        profitFactor: "1.80",
      },
    ],
    topStrategies: [
      {
        name: "Breakout",
        count: 20,
        winRate: 60.0,
        netPnl: "3000.00",
      },
    ],
    topMistakes: [],
    reviewThemes: {
      totalReviews: 5,
      averageExecutionQuality: 8.5,
      averageRuleAdherence: 8.2,
      commonWhatWentWrong: [],
      commonEmotionalObservations: [],
    },
  };

  it("returns insufficient data insight when closedTrades is 0", () => {
    const emptyContext: AiAnalysisContext = {
      ...baseContext,
      totalTrades: 0,
      closedTrades: 0,
      netPnl: "0.00",
    };

    const { insights } = detectDeterministicPatterns(emptyContext);
    expect(insights.length).toBe(1);
    expect(insights[0].id).toBe("no-data");
  });

  it("detects directional divergence when Long vs Short win rates differ by >= 20%", () => {
    const ctx: AiAnalysisContext = {
      ...baseContext,
      longVsShort: {
        longCount: 18,
        shortCount: 17,
        longWinRate: 72.22,
        shortWinRate: 35.29,
        longNetPnl: "3800.00",
        shortNetPnl: "-800.00",
      },
    };

    const { insights } = detectDeterministicPatterns(ctx);
    const directional = insights.find((p) => p.category === "PERFORMANCE" && p.title.includes("Directional"));

    expect(directional).toBeDefined();
    expect(directional?.severity).toBe("HIGH"); // >= 30% diff is HIGH
    expect(directional?.evidence.sampleSize).toBe(35);
    expect(directional?.evidence.facts.some((f) => f.includes("LONG positions won 72.22%"))).toBe(true);
    expect(directional?.evidence.facts.some((f) => f.includes("SHORT positions won 35.29%"))).toBe(true);
    expect(directional?.recommendations.length).toBeGreaterThan(0);
  });

  it("detects risk and loss asymmetry when average loser is >= 1.5x average winner", () => {
    const ctx: AiAnalysisContext = {
      ...baseContext,
      averageWinner: "200.00",
      averageLoser: "-450.00", // 2.25x larger
    };

    const { insights } = detectDeterministicPatterns(ctx);
    const risk = insights.find((p) => p.category === "RISK" && p.title.includes("Risk Asymmetry"));

    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("HIGH");
    expect(risk?.evidence.facts.some((f) => f.includes("Average losing trade net loss is -$450.00"))).toBe(true);
    expect(risk?.evidence.facts.some((f) => f.includes("Average winning trade net return is $200.00"))).toBe(true);
    expect(risk?.recommendations.some((r) => r.toLowerCase().includes("stop-loss"))).toBe(true);
  });

  it("detects persistent drag on symbols with negative net P&L and >= 3 trades", () => {
    const ctx: AiAnalysisContext = {
      ...baseContext,
      topSymbols: [
        {
          symbol: "NQ",
          count: 8,
          winRate: 25.0,
          netPnl: "-1850.00",
          profitFactor: "0.42",
        },
      ],
    };

    const { insights } = detectDeterministicPatterns(ctx);
    const symbolDrag = insights.find((p) => p.title.includes("NQ"));

    expect(symbolDrag).toBeDefined();
    expect(symbolDrag?.severity).toBe("HIGH");
    expect(symbolDrag?.evidence.facts.some((f) => f.includes("net P&L of $-1850.00"))).toBe(true);
    expect(symbolDrag?.recommendations.some((r) => r.includes("NQ"))).toBe(true);
  });

  it("detects strategy disparity between strong and negative strategies", () => {
    const ctx: AiAnalysisContext = {
      ...baseContext,
      topStrategies: [
        {
          name: "Trend Continuation",
          count: 15,
          winRate: 66.67,
          netPnl: "4500.00",
        },
        {
          name: "Mean Reversion",
          count: 10,
          winRate: 30.0,
          netPnl: "-1200.00",
        },
      ],
    };

    const { insights } = detectDeterministicPatterns(ctx);
    const stratDisparity = insights.find((p) => p.category === "STRATEGY" && p.title.includes("Disparity"));

    expect(stratDisparity).toBeDefined();
    expect(stratDisparity?.evidence.facts.some((f) => f.includes("Mean Reversion"))).toBe(true);
    expect(stratDisparity?.evidence.facts.some((f) => f.includes("Trend Continuation"))).toBe(true);
  });

  it("detects financial leakage from tagged trading mistakes", () => {
    const ctx: AiAnalysisContext = {
      ...baseContext,
      topMistakes: [
        {
          name: "Chasing Momentum",
          count: 6,
          totalLoss: "1450.00",
        },
      ],
    };

    const { insights } = detectDeterministicPatterns(ctx);
    const mistakePattern = insights.find((p) => p.category === "BEHAVIOR" && p.title.includes("Chasing Momentum"));

    expect(mistakePattern).toBeDefined();
    expect(mistakePattern?.evidence.facts.some((f) => f.includes("-$1450.00"))).toBe(true);
    expect(mistakePattern?.recommendations.length).toBeGreaterThan(0);
  });

  it("detects rule adherence friction when review themes show average rule score < 3.5 / 5", () => {
    const ctx: AiAnalysisContext = {
      ...baseContext,
      reviewThemes: {
        totalReviews: 6,
        averageExecutionQuality: 3.8,
        averageRuleAdherence: 2.8,
        commonWhatWentWrong: ["Entered prematurely before bar close"],
        commonEmotionalObservations: ["FOMO on sudden spikes"],
      },
    };

    const { insights } = detectDeterministicPatterns(ctx);
    const friction = insights.find((p) => p.category === "EXECUTION");

    expect(friction).toBeDefined();
    expect(friction?.evidence.facts.some((f) => f.includes("2.8/5"))).toBe(true);
    expect(friction?.recommendations.some((r) => r.includes("cooling-off rule"))).toBe(true);
  });

  it("scales confidence correctly based on statistical sample size", () => {
    // 1. Low confidence (< 10 trades)
    const smallCtx: AiAnalysisContext = {
      ...baseContext,
      closedTrades: 6,
      averageWinner: "100.00",
      averageLoser: "300.00",
    };
    const { insights: smallPatterns } = detectDeterministicPatterns(smallCtx);
    const riskSmall = smallPatterns.find((p) => p.category === "RISK");
    expect(riskSmall?.confidence).toBe("LOW");

    // 2. Moderate confidence (10-29 trades)
    const midCtx: AiAnalysisContext = {
      ...baseContext,
      closedTrades: 18,
      averageWinner: "100.00",
      averageLoser: "300.00",
    };
    const { insights: midPatterns } = detectDeterministicPatterns(midCtx);
    const riskMid = midPatterns.find((p) => p.category === "RISK");
    expect(riskMid?.confidence).toBe("MODERATE");

    // 3. High confidence (>= 30 trades)
    const largeCtx: AiAnalysisContext = {
      ...baseContext,
      closedTrades: 42,
      averageWinner: "100.00",
      averageLoser: "300.00",
    };
    const { insights: largePatterns } = detectDeterministicPatterns(largeCtx);
    const riskLarge = largePatterns.find((p) => p.category === "RISK");
    expect(riskLarge?.confidence).toBe("HIGH");
  });
});
