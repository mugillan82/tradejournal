import { describe, expect, it } from "vitest";
import { detectSource } from "@/lib/trading/smart-import/source-detection";
import {
  Mt4Profile,
  Mt5Profile,
  TradingViewProfile,
  GenericProfile,
  parseOcrText,
} from "@/lib/trading/smart-import/parsing";

describe("Smart Import Profiles & Source Detection", () => {
  describe("Source Detection", () => {
    it("detects MT4 from MT4 branding and ticket markers", () => {
      const res = detectSource("MetaTrader 4 Terminal Account History Ticket 54321");
      expect(res.source).toBe("MT4");
      expect(res.confidence).toBeGreaterThanOrEqual(0.7);
      expect(res.evidence.length).toBeGreaterThan(0);
    });

    it("detects MT5 distinctly from MT5 branding, deals, and direction markers", () => {
      const res = detectSource("MetaTrader 5 Deals History Ticket 998877 in deal volume 1.00");
      expect(res.source).toBe("MT5");
      expect(res.confidence).toBeGreaterThanOrEqual(0.7);
      expect(res.evidence.some((e) => e.includes("MT5") || e.includes("deal"))).toBe(true);
    });

    it("detects TradingView from branding and column vocabulary", () => {
      const res = detectSource("TradingView Paper Trading Orders Symbol Qty Avg Fill P&L");
      expect(res.source).toBe("TradingView");
      expect(res.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("detects Generic Broker when statement terms exist without platform branding", () => {
      const res = detectSource("Broker Statement Trade Confirmation Order Report");
      expect(res.source).toBe("Generic Broker");
    });

    it("handles ambiguous source gracefully by falling back to Generic Broker with low confidence", () => {
      const res = detectSource("Some vague numbers 123 456 789");
      expect(res.source).toBe("Generic Broker");
      expect(res.confidence).toBeLessThan(0.5);
      expect(res.evidence[0]).toContain("conservative fallback");
    });

    it("handles empty or unknown source safely", () => {
      const res = detectSource("");
      expect(res.source).toBe("Generic Broker");
      expect(res.confidence).toBeLessThan(0.5);
    });
  });

  describe("MT4 Profile Parsing", () => {
    const profile = new Mt4Profile();

    it("parses MT4 BUY position with all columns", () => {
      const line =
        "12345678 2023.10.01 10:00:00 buy 0.50 EURUSD 1.05000 1.04500 1.06000 2023.10.01 12:00:00 1.05500 -2.50 0.00 250.00";
      const result = profile.parse(line);
      expect(result).toHaveLength(1);
      const cand = result[0];
      expect(cand.externalReference).toBe("12345678");
      expect(cand.entryDate).toBe("2023.10.01 10:00:00");
      expect(cand.side).toBe("LONG");
      expect(cand.quantity).toBe("0.50");
      expect(cand.title).toBe("EURUSD");
      expect(cand.entryPrice).toBe("1.05000");
      expect(cand.stopLoss).toBe("1.04500");
      expect(cand.takeProfit).toBe("1.06000");
      expect(cand.exitPrice).toBe("1.05500");
      expect(cand.status).toBe("CLOSED");
      expect(cand.commission).toBe("-2.50");
      expect(cand.swap).toBe("0.00");
      expect(cand.grossPnl).toBe("250.00");
    });

    it("parses MT4 SELL position", () => {
      const line = "87654321 2023.10.02 09:30:00 sell 1.00 GBPUSD 1.25000 1.25500 1.24000 -4.00 -1.20 -150.00";
      const result = profile.parse(line);
      expect(result).toHaveLength(1);
      const cand = result[0];
      expect(cand.side).toBe("SHORT");
      expect(cand.title).toBe("GBPUSD");
      expect(cand.quantity).toBe("1.00");
      expect(cand.grossPnl).toBe("-150.00");
      expect(cand.commission).toBe("-4.00");
      expect(cand.swap).toBe("-1.20");
    });
  });

  describe("MT5 Profile Parsing (Dedicated Implementation)", () => {
    const profile = new Mt5Profile();

    it("parses MT5 deals line with deal ticket, direction in, and explicit metrics", () => {
      const line =
        "#99887766 2023.11.05 14:15:30 buy in 2.50 USDJPY 149.500 Commission: -5.00 Swap: -2.10 Profit: 340.00";
      const result = profile.parse(line);
      expect(result).toHaveLength(1);
      const cand = result[0];
      expect(cand.externalReference).toBe("99887766");
      expect(cand.side).toBe("LONG");
      expect(cand.quantity).toBe("2.50");
      expect(cand.title).toBe("USDJPY");
      expect(cand.entryPrice).toBe("149.500");
      expect(cand.commission).toBe("-5.00");
      expect(cand.swap).toBe("-2.10");
      expect(cand.grossPnl).toBe("340.00");
    });

    it("parses MT5 SELL deal", () => {
      const line = "55443322 2023.11.06 08:00:00 sell out 0.75 AUDUSD 0.65500 Commission: -1.50 Profit: -75.00";
      const result = profile.parse(line);
      expect(result).toHaveLength(1);
      const cand = result[0];
      expect(cand.side).toBe("SHORT");
      expect(cand.quantity).toBe("0.75");
      expect(cand.title).toBe("AUDUSD");
      expect(cand.entryPrice).toBe("0.65500");
      expect(cand.commission).toBe("-1.50");
      expect(cand.grossPnl).toBe("-75.00");
    });
  });

  describe("TradingView Profile Parsing", () => {
    const profile = new TradingViewProfile();

    it("parses multi-line TradingView position block", () => {
      const text = `
        AAPL
        Long
        Qty 50
        Avg Fill 180.25
        Stop Loss 175.00
        Take Profit 190.00
        P&L +350.00
      `;
      const result = profile.parse(text);
      expect(result).toHaveLength(1);
      const cand = result[0];
      expect(cand.title).toBe("AAPL");
      expect(cand.side).toBe("LONG");
      expect(cand.quantity).toBe("50");
      expect(cand.entryPrice).toBe("180.25");
      expect(cand.stopLoss).toBe("175.00");
      expect(cand.takeProfit).toBe("190.00");
      expect(cand.grossPnl).toBe("+350.00");
    });

    it("parses inline TradingView order format", () => {
      const text = "EURUSD Buy 100000 @ 1.0850 P&L 125.00";
      const result = profile.parse(text);
      expect(result).toHaveLength(1);
      const cand = result[0];
      expect(cand.title).toBe("EURUSD");
      expect(cand.side).toBe("LONG");
      expect(cand.quantity).toBe("100000");
    });
  });

  describe("Generic Broker Profile Parsing", () => {
    const profile = new GenericProfile();

    it("conservatively extracts trade data and adds verification notes", () => {
      const line = "2023-12-01 10:00:00 BUY MSFT 20 380.50 420.00";
      const result = profile.parse(line);
      expect(result).toHaveLength(1);
      const cand = result[0];
      expect(cand.side).toBe("LONG");
      expect(cand.title).toBe("MSFT");
      expect(cand.quantity).toBe("20");
      expect(cand.entryPrice).toBe("380.50");
      expect(cand.grossPnl).toBe("420.00");
      expect(cand.notes).toContain("conservative Generic Broker parser");
    });

    it("ignores non-trade lines without buying/selling action", () => {
      const text = "Account summary balance total 50,000.00 margin 2,000.00";
      const result = profile.parse(text);
      expect(result).toHaveLength(0);
    });
  });

  describe("parseOcrText Dispatcher", () => {
    it("dispatches text to designated profile", () => {
      const mt4Text = "123 2023.01.01 10:00 buy 1.00 EURUSD 1.1000 50.00";
      const res = parseOcrText(mt4Text, "MT4");
      expect(res).toHaveLength(1);
      expect(res[0].side).toBe("LONG");
      expect(res[0].title).toBe("EURUSD");
    });
  });
});
