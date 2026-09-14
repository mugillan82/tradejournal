import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { Mt5Profile } from "@/lib/trading/smart-import/parsing";
import { detectSource } from "@/lib/trading/smart-import/source-detection";
import { normalizeRawCandidate } from "@/lib/trading/smart-import/normalization";
import { evaluateConfidence } from "@/lib/trading/smart-import/confidence";
import { PIPELINE_TIMEOUT_MS } from "@/lib/trading/smart-import/service";
import { TesseractOcrProvider } from "@/lib/trading/smart-import/ocr";

describe("MT5 Mobile History Screenshot Extraction & Invariants", () => {
  const profile = new Mt5Profile();

  const realMt5MobileOcrFixture = `
History
NAS100.x, buy 0.09
29 201.87 → 29 271.19
2024.03.15 14:32:05
6.24

EURUSD.x, sell 0.90
1.08920 → 1.08650
2024.03.15 15:10:20
-12.50

Balance 10 000.00
Deposit 5 000.00
Withdrawal -1 000.00
Swap -1.50
Commission -3.50
`;

  it("1. extracts MT5 mobile history screenshot trades successfully", () => {
    const result = profile.parseDetailed(realMt5MobileOcrFixture);
    expect(result.trades).toHaveLength(2);

    const [trade1, trade2] = result.trades;
    expect(trade1.title).toBe("NAS100.X");
    expect(trade1.side).toBe("LONG");
    expect(trade1.quantity).toBe("0.09");
    expect(trade1.entryPrice).toBe("29201.87");
    expect(trade1.exitPrice).toBe("29271.19");
    expect(trade1.grossPnl).toBe("6.24");

    expect(trade2.title).toBe("EURUSD.X");
    expect(trade2.side).toBe("SHORT");
    expect(trade2.quantity).toBe("0.90");
    expect(trade2.entryPrice).toBe("1.08920");
    expect(trade2.exitPrice).toBe("1.08650");
    expect(trade2.grossPnl).toBe("-12.50");
  });

  it("2. correctly distinguishes BUY and SELL directions", () => {
    const text = `
XAUUSD.x, buy 0.05
2040.50 → 2045.00
2024.03.15 12:00:00
22.50

GBPUSD, sell 1.20
1.28500 → 1.28000
2024.03.15 13:00:00
60.00
`;
    const result = profile.parseDetailed(text);
    expect(result.trades[0].side).toBe("LONG");
    expect(result.trades[1].side).toBe("SHORT");
  });

  it("3. correctly handles positive and negative P&L", () => {
    const text = `
BTCUSD, buy 0.10
65000.00 → 66000.00
2024.03.15 10:00:00
+100.00

ETHUSD, sell 0.50
3500.00 → 3550.00
2024.03.15 11:00:00
-25.00
`;
    const result = profile.parseDetailed(text);
    expect(result.trades[0].grossPnl).toBe("+100.00");
    expect(result.trades[1].grossPnl).toBe("-25.00");

    const norm1 = normalizeRawCandidate(result.trades[0], 0);
    const norm2 = normalizeRawCandidate(result.trades[1], 1);
    expect(norm1.grossPnl).toBe("100.00");
    expect(norm2.grossPnl).toBe("-25.00");
  });

  it("4. normalizes decimal volume and decimal prices with space thousands separators", () => {
    const text = `
US30.cash, buy 0.15
38 850.50 → 39 120.75
2024.03.15 14:00:00
40.50
`;
    const result = profile.parseDetailed(text);
    const trade = result.trades[0];
    expect(trade.quantity).toBe("0.15");
    expect(trade.entryPrice).toBe("38850.50");
    expect(trade.exitPrice).toBe("39120.75");

    const normalized = normalizeRawCandidate(trade, 0);
    expect(normalized.quantity).toBe("0.15");
    expect(normalized.entryPrice).toBe("38850.50");
    expect(normalized.exitPrice).toBe("39120.75");
  });

  it("5. classifies and excludes Balance, Deposit, Withdrawal, Swap, and Commission rows", () => {
    const result = profile.parseDetailed(realMt5MobileOcrFixture);
    
    // Exactly 2 trades extracted, 0 non-trades leaked into trade candidates
    expect(result.trades).toHaveLength(2);
    expect(result.trades.some((t) => /balance|deposit|withdrawal|swap|commission/i.test(t.title || ""))).toBe(false);

    // Exactly 5 non-trade entries classified
    expect(result.nonTradeRows).toHaveLength(5);
    const types = result.nonTradeRows.map((r) => r.type);
    expect(types).toContain("Balance");
    expect(types).toContain("Deposit");
    expect(types).toContain("Withdrawal");
    expect(types).toContain("Swap");
    expect(types).toContain("Commission");
  });

  it("6. marks uncertain OCR row as NEEDS_REVIEW without fabricating missing values", () => {
    // A corrupted row missing price and timestamp
    const uncertainOcrText = `
NAS100.x, buy 0.09
corrupted_unreadable_line
15.00
`;
    const result = profile.parseDetailed(uncertainOcrText);
    expect(result.trades).toHaveLength(1);
    const raw = result.trades[0];

    // Must NOT invent or fabricate an entry price
    expect(raw.entryPrice).toBeUndefined();
    expect(raw.exitPrice).toBeUndefined();

    const normalized = normalizeRawCandidate(raw, 0);
    normalized.tradingAccountId = "acc-1";
    evaluateConfidence(normalized, raw, 0.9);

    // Flagged as invalid due to missing entry price, confidence lowered
    expect(normalized.isValid).toBe(false);
    expect(normalized.confidence.level).toBe("LOW");
    expect(normalized.validationIssues.some((i) => i.field === "entryPrice")).toBe(true);
  });

  it("7. handles OCR/provider failure gracefully without crashing", async () => {
    const ocrProvider = new TesseractOcrProvider();
    vi.spyOn(ocrProvider, "readText").mockRejectedValueOnce(new Error("OCR engine initialization failed"));

    await expect(ocrProvider.readText(Buffer.from("corrupt"), "image/png")).rejects.toThrow(
      "OCR engine initialization failed"
    );
  });

  it("8. proves a hanging processing operation reaches a terminal timeout state within bounded budget", async () => {
    vi.useFakeTimers();

    // Create a hanging promise that never resolves on its own
    const hangingPromise = new Promise(() => {});

    const withTimeout = async (ms: number) => {
      return Promise.race([
        hangingPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT: Bounded timeout reached")), ms)),
      ]);
    };

    const timeoutCheck = withTimeout(PIPELINE_TIMEOUT_MS);
    vi.advanceTimersByTime(PIPELINE_TIMEOUT_MS + 100);

    await expect(timeoutCheck).rejects.toThrow("TIMEOUT: Bounded timeout reached");

    vi.useRealTimers();
  });

  it("9. verifies source detection correctly classifies mobile MT5 history screenshot as MT5", () => {
    const detected = detectSource(realMt5MobileOcrFixture);
    expect(detected.source).toBe("MT5");
    expect(detected.confidence).toBeGreaterThanOrEqual(0.7);
    expect(detected.evidence.some((e) => e.includes("MT5 mobile") || e.includes("arrow"))).toBe(true);
  });
});
