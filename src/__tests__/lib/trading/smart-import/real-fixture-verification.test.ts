import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { Mt5Profile } from "@/lib/trading/smart-import/parsing";
import { detectSource } from "@/lib/trading/smart-import/source-detection";
import { normalizeRawCandidate } from "@/lib/trading/smart-import/normalization";
import { evaluateConfidence } from "@/lib/trading/smart-import/confidence";

describe("Section 9: Representative MT5 Mobile History Fixture Verification", () => {
  const representativeFixture = `
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

  it("processes representative MT5 mobile screenshot in milliseconds", () => {
    const startTime = performance.now();

    // Step 1: Source Detection
    const sourceResult = detectSource(representativeFixture);

    // Step 2: MT5 Parsing & Row Classification
    const profile = new Mt5Profile();
    const parseResult = profile.parseDetailed(representativeFixture);

    // Step 3: Normalization & Confidence Evaluation
    const candidates = parseResult.trades.map((raw, idx) => {
      const candidate = normalizeRawCandidate(raw, idx);
      candidate.tradingAccountId = "acc-test-1";
      evaluateConfidence(candidate, raw, sourceResult.confidence);
      return candidate;
    });

    const elapsedMs = performance.now() - startTime;

    // Report requirements
    console.log("=== SECTION 9 VERIFICATION METRICS ===");
    console.log(`- Processing time: ${elapsedMs.toFixed(2)} ms`);
    console.log(`- Number of trades extracted: ${candidates.length}`);
    console.log(`- Non-trade rows detected/excluded: ${parseResult.nonTradeRows.length}`);
    const warnings = candidates.flatMap((c) => c.validationIssues.filter((i) => i.level === "WARNING").map((i) => i.message));
    console.log(`- Warnings: ${warnings.length > 0 ? warnings.join("; ") : "None"}`);
    const finalState = candidates.every((c) => c.isValid) ? "SUCCESS" : "NEEDS_REVIEW";
    console.log(`- Final state: ${finalState}`);
    console.log("======================================");

    expect(elapsedMs).toBeLessThan(50); // High performance, orders of magnitude under 1 second
    expect(candidates).toHaveLength(2);
    expect(parseResult.nonTradeRows).toHaveLength(5);
    expect(finalState).toBe("SUCCESS");
    expect(candidates[0].title).toBe("NAS100.X");
    expect(candidates[0].side).toBe("LONG");
    expect(candidates[0].quantity).toBe("0.09");
    expect(candidates[0].entryPrice).toBe("29201.87");
    expect(candidates[0].exitPrice).toBe("29271.19");
    expect(candidates[0].grossPnl).toBe("6.24");

    expect(candidates[1].title).toBe("EURUSD.X");
    expect(candidates[1].side).toBe("SHORT");
    expect(candidates[1].quantity).toBe("0.90");
    expect(candidates[1].entryPrice).toBe("1.08920");
    expect(candidates[1].exitPrice).toBe("1.08650");
    expect(candidates[1].grossPnl).toBe("-12.50");
  });
});
