/**
 * AI Domain — Context Builder
 *
 * Compiles canonical analytics outputs, trade distributions, and recent
 * review/journal debriefs into a compact, bounded context for the AI layer.
 *
 * Guarantees:
 * - Server-only execution.
 * - Strict per-user data isolation.
 * - Zero raw secrets, passwords, or personal account credentials included.
 * - Bounded payload sizes (capped arrays, summarized metrics).
 */

import "server-only";

import { prisma } from "@/lib/db/client";
import { getAnalyticsOverview } from "@/lib/trading/analytics/service";
import type { AnalyticsFilterInput } from "@/lib/trading/analytics/types";
import { getReviewById } from "@/lib/trading/journal/service";
import type {
  AiAnalysisContext,
  ReviewAnalysisContext,
} from "./types";

/**
 * Builds a compact, bounded analysis context from canonical analytics
 * and recent user review records.
 */
export async function buildAiAnalysisContext(
  userId: string,
  filter?: AnalyticsFilterInput,
): Promise<AiAnalysisContext> {
  // 1. Fetch canonical analytics overview for this user
  const overview = await getAnalyticsOverview(filter, userId);
  const { metrics } = overview;

  // 2. Fetch up to 10 recent reviews to summarize execution and rule themes
  const recentReviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { reviewDate: "desc" },
    take: 10,
    select: {
      executionQuality: true,
      ruleAdherence: true,
      whatWentWrong: true,
      emotionalObservation: true,
    },
  });

  let totalExec = 0;
  let execCount = 0;
  let totalRules = 0;
  let ruleCount = 0;
  const commonWhatWentWrong: string[] = [];
  const commonEmotionalObservations: string[] = [];

  for (const r of recentReviews) {
    if (r.executionQuality !== null && r.executionQuality !== undefined) {
      totalExec += r.executionQuality;
      execCount++;
    }
    if (r.ruleAdherence !== null && r.ruleAdherence !== undefined) {
      totalRules += r.ruleAdherence;
      ruleCount++;
    }
    if (r.whatWentWrong && r.whatWentWrong.trim()) {
      commonWhatWentWrong.push(r.whatWentWrong.trim().slice(0, 150));
    }
    if (r.emotionalObservation && r.emotionalObservation.trim()) {
      commonEmotionalObservations.push(r.emotionalObservation.trim().slice(0, 150));
    }
  }

  // 3. Extract top symbols (bounded to top 6 by trade count)
  const topSymbols = (overview.bySymbol || [])
    .slice(0, 6)
    .map((s) => ({
      symbol: s.symbol,
      count: s.tradeCount,
      winRate: s.winRate,
      netPnl: s.netPnl,
      profitFactor: s.profitFactor,
    }));

  // 4. Extract top strategies (bounded to top 5)
  const topStrategies = (overview.byStrategy || [])
    .slice(0, 5)
    .map((st) => ({
      name: st.strategyName,
      count: st.tradeCount,
      winRate: st.winRate,
      netPnl: st.netPnl,
    }));

  // 5. Extract top mistakes (bounded to top 5)
  const topMistakes = (overview.byMistake || [])
    .slice(0, 5)
    .map((m) => ({
      name: m.mistakeName,
      count: m.tradeCount,
      totalLoss: m.totalLoss,
    }));

  return {
    dateRange: {
      from: filter?.dateFrom ? filter.dateFrom.toISOString().slice(0, 10) : undefined,
      to: filter?.dateTo ? filter.dateTo.toISOString().slice(0, 10) : undefined,
    },
    totalTrades: metrics.totalTrades,
    closedTrades: metrics.closedTrades,
    winRate: metrics.winRate,
    profitFactor: metrics.profitFactor,
    netPnl: metrics.netPnl,
    averageWinner: metrics.averageWinner,
    averageLoser: metrics.averageLoser,
    averageTradePnl: metrics.averageTradePnl,
    averageHoldingDurationSeconds: metrics.averageHoldingDurationSeconds,
    maxDrawdown: metrics.maxDrawdown,
    longVsShort: {
      longCount: metrics.longTradeCount,
      shortCount: metrics.shortTradeCount,
      longWinRate: metrics.longWinRate,
      shortWinRate: metrics.shortWinRate,
      longNetPnl: metrics.longNetPnl,
      shortNetPnl: metrics.shortNetPnl,
    },
    topSymbols,
    topStrategies,
    topMistakes,
    reviewThemes: {
      totalReviews: recentReviews.length,
      averageExecutionQuality: execCount > 0 ? Math.round((totalExec / execCount) * 10) / 10 : null,
      averageRuleAdherence: ruleCount > 0 ? Math.round((totalRules / ruleCount) * 10) / 10 : null,
      commonWhatWentWrong: commonWhatWentWrong.slice(0, 5),
      commonEmotionalObservations: commonEmotionalObservations.slice(0, 5),
    },
  };
}

/**
 * Builds a review-specific analysis context from the canonical review DTO.
 */
export async function buildReviewAnalysisContext(
  userId: string,
  reviewId: string,
): Promise<ReviewAnalysisContext> {
  // getReviewById enforces userId resolution internally
  const review = await getReviewById(reviewId);

  // Ensure review belongs to user
  if (review.userId !== userId) {
    throw new Error("Review not found or unauthorized");
  }

  return {
    reviewId: review.id,
    title: review.title,
    reviewDate: review.reviewDate.toISOString().slice(0, 10),
    rating: review.rating,
    status: review.status,
    executionQuality: review.executionQuality,
    ruleAdherence: review.ruleAdherence,
    riskManagement: review.riskManagement,
    thesis: review.thesis,
    whatWentWell: review.whatWentWell,
    whatWentWrong: review.whatWentWrong,
    emotionalObservation: review.emotionalObservations,
    lessonsLearned: review.lessonsLearned,
    improvementActions: review.improvementActions,
    trades: (review.trades || []).map((t) => ({
      id: t.tradeId,
      side: t.trade?.side || "UNKNOWN",
      netPnl: t.trade?.netPnl || null,
      entryPrice: "0.00",
      exitPrice: null,
    })),
    mistakes: (review.mistakes || []).map((m) => m.name),
  };
}
