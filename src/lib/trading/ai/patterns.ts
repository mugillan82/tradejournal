/**
 * AI Insights — Deterministic Pattern Engine
 *
 * Evaluates canonical analytics facts to detect statistically meaningful
 * patterns in performance, risk, execution, behavior, and reviews.
 * Does not fabricate data or psychological claims.
 */

import type {
  AiAnalysisContext,
  TradeInsight,
  InsightConfidence,
} from "./types";

function getConfidence(sampleSize: number): InsightConfidence {
  if (sampleSize < 10) return "LOW";
  if (sampleSize < 30) return "MODERATE";
  return "HIGH";
}

export function detectDeterministicPatterns(
  context: AiAnalysisContext,
): { summary: string; insights: TradeInsight[] } {
  const insights: TradeInsight[] = [];
  const { closedTrades } = context;

  if (closedTrades < 1) {
    return {
      summary: "No closed trades are available in the selected period to detect patterns.",
      insights: [
        {
          id: "no-data",
          category: "PERFORMANCE",
          title: "Insufficient Trading History",
          summary: "There are no closed trade records available in this period to evaluate performance.",
          evidence: {
            facts: ["0 closed trades in selected range"],
            sampleSize: 0,
            metrics: { closedTrades: 0 },
          },
          severity: "INFO",
          confidence: "LOW",
          recommendations: [
            "Log trades or import broker historical statements to unlock analytical insights.",
          ],
        },
      ],
    };
  }

  const confidence = getConfidence(closedTrades);

  // 1. Long vs Short Directional Divergence
  const { longCount, shortCount, longWinRate, shortWinRate, longNetPnl, shortNetPnl } =
    context.longVsShort;

  if (longCount >= 3 && shortCount >= 3) {
    const diff = Math.abs(longWinRate - shortWinRate);
    if (diff >= 20) {
      const betterSide = longWinRate > shortWinRate ? "LONG" : "SHORT";
      const worseSide = betterSide === "LONG" ? "SHORT" : "LONG";
      const betterWinRate = betterSide === "LONG" ? longWinRate : shortWinRate;
      const worseWinRate = betterSide === "LONG" ? shortWinRate : longWinRate;
      const worsePnl = worseSide === "LONG" ? longNetPnl : shortNetPnl;

      insights.push({
        id: "directional-asymmetry",
        category: "PERFORMANCE",
        title: `Directional Divergence: ${betterSide} Outperforms ${worseSide}`,
        summary: `Your historical data shows a marked disparity in win rate between long and short positions (${betterWinRate}% vs ${worseWinRate}%).`,
        evidence: {
          facts: [
            `${betterSide} positions won ${betterWinRate}% of the time across ${betterSide === "LONG" ? longCount : shortCount} trades.`,
            `${worseSide} positions won ${worseWinRate}% of the time across ${worseSide === "LONG" ? longCount : shortCount} trades (Net: $${worsePnl}).`,
          ],
          sampleSize: closedTrades,
          metrics: {
            longCount,
            shortCount,
            longWinRate,
            shortWinRate,
          },
        },
        severity: diff >= 35 ? "HIGH" : "MEDIUM",
        confidence: getConfidence(Math.min(longCount, shortCount)),
        recommendations: [
          `Review the entry triggers for your ${worseSide.toLowerCase()} setups to determine if higher timeframe trend filters are needed.`,
          `Consider requiring stricter risk confirmation before initiating ${worseSide.toLowerCase()} trades until the disparity narrows.`,
        ],
      });
    }
  }

  // 2. Risk & Loss Asymmetry (Average Loser vs Average Winner)
  const avgWinNum = parseFloat(context.averageWinner);
  const avgLossNum = Math.abs(parseFloat(context.averageLoser));

  if (!isNaN(avgWinNum) && !isNaN(avgLossNum) && avgLossNum > 0 && avgWinNum > 0) {
    const lossToWinRatio = avgLossNum / avgWinNum;
    if (lossToWinRatio >= 1.5 && closedTrades >= 5) {
      insights.push({
        id: "risk-asymmetry-oversized-losses",
        category: "RISK",
        title: "Risk Asymmetry: Average Loss Exceeds Average Win",
        summary: `On average, losing trades are costing significantly more than winning trades deliver (${lossToWinRatio.toFixed(2)}x magnitude).`,
        evidence: {
          facts: [
            `Average winning trade net return is $${context.averageWinner}.`,
            `Average losing trade net loss is -$${avgLossNum.toFixed(2)}.`,
            `The average loser is ${(lossToWinRatio * 100 - 100).toFixed(0)}% larger than the average winner.`,
          ],
          sampleSize: closedTrades,
          metrics: {
            averageWinner: context.averageWinner,
            averageLoser: context.averageLoser,
            ratio: lossToWinRatio.toFixed(2),
          },
        },
        severity: lossToWinRatio >= 2.0 ? "HIGH" : "MEDIUM",
        confidence,
        recommendations: [
          "Audit recent losing trades to verify whether predefined stop-loss rules were moved or delayed.",
          "Check whether target profit targets are being taken prematurely relative to risk boundaries.",
        ],
      });
    }
  }

  // 3. Symbol Concentration & Outlier Losses
  if (context.topSymbols.length > 0) {
    const losingSymbols = context.topSymbols.filter(
      (s) => parseFloat(s.netPnl) < 0 && s.count >= 3,
    );

    if (losingSymbols.length > 0) {
      const worstSymbol = losingSymbols.reduce((prev, curr) =>
        parseFloat(curr.netPnl) < parseFloat(prev.netPnl) ? curr : prev,
      );

      insights.push({
        id: `symbol-drag-${worstSymbol.symbol}`,
        category: "STRATEGY",
        title: `Persistent Drag on Symbol: ${worstSymbol.symbol}`,
        summary: `${worstSymbol.symbol} shows negative expectancy across ${worstSymbol.count} trades in the selected sample.`,
        evidence: {
          facts: [
            `${worstSymbol.count} trades executed on ${worstSymbol.symbol} resulting in net P&L of $${worstSymbol.netPnl}.`,
            `Win rate on ${worstSymbol.symbol} is ${worstSymbol.winRate}%.`,
          ],
          sampleSize: worstSymbol.count,
          metrics: {
            symbol: worstSymbol.symbol,
            trades: worstSymbol.count,
            winRate: worstSymbol.winRate,
            netPnl: worstSymbol.netPnl,
          },
        },
        severity: worstSymbol.winRate < 40 ? "HIGH" : "MEDIUM",
        confidence: getConfidence(worstSymbol.count),
        recommendations: [
          `Review whether spread costs, slippage, or session volatility on ${worstSymbol.symbol} adversely impact your strategy.`,
          `Consider temporarily pausing or reducing position sizing on ${worstSymbol.symbol} while reviewing execution logs.`,
        ],
      });
    }
  }

  // 4. Strategy Performance Divergence
  if (context.topStrategies.length >= 2) {
    const winningStrats = context.topStrategies.filter(
      (s) => parseFloat(s.netPnl) > 0 && s.count >= 3,
    );
    const losingStrats = context.topStrategies.filter(
      (s) => parseFloat(s.netPnl) < 0 && s.count >= 3,
    );

    if (winningStrats.length > 0 && losingStrats.length > 0) {
      const best = winningStrats[0]!;
      const worst = losingStrats[0]!;

      insights.push({
        id: "strategy-disparity",
        category: "STRATEGY",
        title: `Strategy Disparity: '${best.name}' vs '${worst.name}'`,
        summary: `Performance divergence observed between your active setups: '${best.name}' shows positive edge while '${worst.name}' is detracting from portfolio growth.`,
        evidence: {
          facts: [
            `'${best.name}' generated $${best.netPnl} across ${best.count} trades with a ${best.winRate}% win rate.`,
            `'${worst.name}' generated $${worst.netPnl} across ${worst.count} trades with a ${worst.winRate}% win rate.`,
          ],
          sampleSize: best.count + worst.count,
          metrics: {
            bestStrategyPnl: best.netPnl,
            worstStrategyPnl: worst.netPnl,
          },
        },
        severity: "MEDIUM",
        confidence: getConfidence(best.count + worst.count),
        recommendations: [
          `Review the playbook criteria for '${worst.name}' to confirm whether market conditions favored the setup.`,
          `Focus execution capital and attention on setups that align with the edge demonstrated in '${best.name}'.`,
        ],
      });
    }
  }

  // 5. Behavioral Mistake Attribution
  if (context.topMistakes.length > 0) {
    const primaryMistake = context.topMistakes[0]!;
    const lossNum = Math.abs(parseFloat(primaryMistake.totalLoss));

    if (lossNum > 0 && primaryMistake.count >= 2) {
      insights.push({
        id: `recurring-mistake-${primaryMistake.name}`,
        category: "BEHAVIOR",
        title: `Loss Concentration in Recurring Mistake: '${primaryMistake.name}'`,
        summary: `The tagged mistake '${primaryMistake.name}' is directly tied to significant financial leakage in your journal history.`,
        evidence: {
          facts: [
            `'${primaryMistake.name}' was tagged on ${primaryMistake.count} trades.`,
            `Total realized loss attributed to this mistake is -$${lossNum.toFixed(2)}.`,
          ],
          sampleSize: primaryMistake.count,
          metrics: {
            mistakeName: primaryMistake.name,
            occurrenceCount: primaryMistake.count,
            totalLoss: primaryMistake.totalLoss,
          },
        },
        severity: "HIGH",
        confidence: getConfidence(primaryMistake.count),
        recommendations: [
          `Formulate an explicit rule in your trade checklist targeting the specific trigger of '${primaryMistake.name}'.`,
          `Conduct a debrief on the ${primaryMistake.count} tagged trades to identify the pre-market conditions preceding the error.`,
        ],
      });
    }
  }

  // 6. Review & Rule Adherence Patterns
  if (context.reviewThemes && context.reviewThemes.totalReviews >= 3) {
    const { averageRuleAdherence, averageExecutionQuality, totalReviews } =
      context.reviewThemes;

    if (averageRuleAdherence !== null && averageRuleAdherence < 3.5) {
      insights.push({
        id: "rule-adherence-slippage",
        category: "EXECUTION",
        title: "Rule Adherence Self-Ratings Indicate Execution Friction",
        summary: `Your structured trade reviews reflect an average rule adherence rating of ${averageRuleAdherence.toFixed(1)}/5, indicating repeated deviations from your trading plan.`,
        evidence: {
          facts: [
            `${totalReviews} trade reviews analyzed with an average rule adherence score of ${averageRuleAdherence.toFixed(1)}/5.`,
            averageExecutionQuality !== null
              ? `Average execution quality rated at ${averageExecutionQuality.toFixed(1)}/5.`
              : "Execution quality data pending.",
          ],
          sampleSize: totalReviews,
          metrics: {
            totalReviews,
            averageRuleAdherence: averageRuleAdherence.toFixed(1),
          },
        },
        severity: averageRuleAdherence < 2.5 ? "HIGH" : "MEDIUM",
        confidence: getConfidence(totalReviews),
        recommendations: [
          "Establish a cooling-off rule after an execution mistake before taking the next trade.",
          "Keep your rule adherence criteria visible during active market hours.",
        ],
      });
    }
  }

  // 7. General Health & Consistency Summary
  if (insights.length === 0) {
    insights.push({
      id: "baseline-consistency",
      category: "CONSISTENCY",
      title: "Balanced Performance & Risk Metrics",
      summary: "No anomalous risk concentration or severe execution deviations were identified in this sample.",
      evidence: {
        facts: [
          `Analyzed ${closedTrades} closed trades with ${context.winRate}% win rate and net return of $${context.netPnl}.`,
          `Directional and symbol distributions show steady execution within normal variances.`,
        ],
        sampleSize: closedTrades,
        metrics: {
          closedTrades,
          winRate: context.winRate,
          netPnl: context.netPnl,
        },
      },
      severity: "INFO",
      confidence,
      recommendations: [
        "Continue logging daily notes and trade classifications to deepen analytical data points.",
        "Maintain current position sizing while monitoring ongoing risk-to-reward stability.",
      ],
    });
  }

  const summary = `Analyzed ${closedTrades} closed trades across ${
    context.topSymbols.length
  } active instruments. Detected ${insights.length} analytical pattern${
    insights.length === 1 ? "" : "s"
  } based on canonical performance metrics.`;

  return { summary, insights };
}
