import { describe, it, expect } from "vitest";
import { detectDuplicate } from "@/lib/trading/import/duplicate";
import { NormalizedTradeCandidate } from "@/lib/trading/import/types";
import { TradeDto, TradeSideValue, TradeStatusValue } from "@/lib/trading/trade/types";
import { TradeSide, TradeStatus } from "@prisma/client";

const baseExistingTrade: TradeDto = {
  id: "trade-1",
  userId: "user-1",
  tradingAccountId: "acc-1",
  side: TradeSide.LONG as TradeSideValue,
  status: TradeStatus.CLOSED as TradeStatusValue,
  entryPrice: "100.50",
  entryDate: new Date("2023-01-01T10:00:00Z"),
  exitPrice: "110.00",
  exitDate: new Date("2023-01-01T14:00:00Z"),
  quantity: "10",
  title: "AAPL",
  createdAt: new Date(),
  updatedAt: new Date(),
  stopLoss: null,
  takeProfit: null,
  riskAmount: null,
  plannedRiskReward: null,
  actualRMultiple: null,
  grossPnl: "95",
  commission: "5",
  fees: null,
  swap: null,
  netPnl: "90",
  notes: null,
  strategyId: null,
  setupId: null,
};

describe("Import Duplicate Detection", () => {
  it("detects exact duplicate on date, symbol, side, price", () => {
    const candidate: NormalizedTradeCandidate = {
      candidateId: "cand-1",
      tradingAccountId: "acc-1",
      title: "AAPL",
      side: TradeSide.LONG as TradeSideValue,
      entryDate: new Date("2023-01-01T10:00:30Z"), // within 1 min
      entryPrice: "100.50",
      quantity: "10",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    };

    const match = detectDuplicate(candidate, [baseExistingTrade]);
    expect(match.classification).toBe("EXACT");
    expect(match.existingTradeId).toBe("trade-1");
  });

  it("detects possible duplicate on same day, symbol, side but different price", () => {
    const candidate: NormalizedTradeCandidate = {
      candidateId: "cand-2",
      tradingAccountId: "acc-1",
      title: "AAPL",
      side: TradeSide.LONG as TradeSideValue,
      entryDate: new Date("2023-01-01T16:00:00Z"), // same day
      entryPrice: "101.00", // different price
      quantity: "10",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    };

    const match = detectDuplicate(candidate, [baseExistingTrade]);
    expect(match.classification).toBe("POSSIBLE");
    expect(match.existingTradeId).toBe("trade-1");
  });

  it("returns NONE for different account", () => {
    const candidate: NormalizedTradeCandidate = {
      candidateId: "cand-3",
      tradingAccountId: "acc-2", // different account
      title: "AAPL",
      side: TradeSide.LONG as TradeSideValue,
      entryDate: new Date("2023-01-01T10:00:00Z"),
      entryPrice: "100.50",
      quantity: "10",
      validationIssues: [],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: true,
    };

    const match = detectDuplicate(candidate, [baseExistingTrade]);
    expect(match.classification).toBe("NONE");
  });

  it("returns NONE for invalid candidate", () => {
    const candidate: NormalizedTradeCandidate = {
      candidateId: "cand-4",
      tradingAccountId: "acc-1",
      title: "AAPL",
      side: TradeSide.LONG as TradeSideValue,
      entryDate: new Date("2023-01-01T10:00:00Z"),
      entryPrice: "100.50",
      quantity: "10",
      validationIssues: [{ level: "ERROR", message: "Bad" }],
      confidence: { score: 1, level: "HIGH", reasons: [] },
      duplicateMatch: { classification: "NONE", reasons: [] },
      isValid: false,
    };

    const match = detectDuplicate(candidate, [baseExistingTrade]);
    expect(match.classification).toBe("NONE");
  });
});
