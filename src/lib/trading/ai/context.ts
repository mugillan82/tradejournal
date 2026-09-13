/**
 * AI Domain — Context Builder
 *
 * Compiles canonical analytics outputs, trade distributions, and recent
 * review/journal debriefs into a compact, bounded context for the AI layer.
 *
 * Security & Trust Boundary Guarantees:
 * - Server-only execution.
 * - Strict per-user data isolation.
 * - Explicit boundary: all user-controlled text is treated as UNTRUSTED DATA.
 * - Delimiter neutralization to prevent prompt delimiter escaping.
 * - Strict character length limits on all user-supplied qualitative fields.
 * - Zero raw secrets, passwords, session tokens, or personal account credentials included.
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
 * Sanitizes and bounds untrusted user text before embedding into AI data payloads:
 * - Trims whitespace
 * - Neutralizes delimiter collision sequences (e.g. </untrusted_trading_data>)
 * - Binds maximum character length
 */
export function sanitizeContextString(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const sanitized = trimmed
    .replace(/<\/?(?:untrusted_trading_data|instruction|system|prompt)[^>]*>/gi, "[filtered]")
    .slice(0, maxLength);
  return sanitized.trim() || null;
}

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
    const cleanWrong = sanitizeContextString(r.whatWentWrong, 120);
    if (cleanWrong && commonWhatWentWrong.length < 3) {
      commonWhatWentWrong.push(cleanWrong);
    }
    const cleanEmotional = sanitizeContextString(r.emotionalObservation, 120);
    if (cleanEmotional && commonEmotionalObservations.length < 3) {
      commonEmotionalObservations.push(cleanEmotional);
    }
  }

  // 3. Extract top symbols (bounded to top 6 by trade count, sanitized names)
  const topSymbols = (overview.bySymbol || [])
    .slice(0, 6)
    .map((s) => ({
      symbol: sanitizeContextString(s.symbol, 20) || "UNKNOWN",
      count: s.tradeCount,
      winRate: s.winRate,
      netPnl: s.netPnl,
      profitFactor: s.profitFactor,
    }));

  // 4. Extract top strategies (bounded to top 5, sanitized names)
  const topStrategies = (overview.byStrategy || [])
    .slice(0, 5)
    .map((st) => ({
      name: sanitizeContextString(st.strategyName, 50) || "Unnamed Strategy",
      count: st.tradeCount,
      winRate: st.winRate,
      netPnl: st.netPnl,
    }));

  // 5. Extract top mistakes (bounded to top 5, sanitized names)
  const topMistakes = (overview.byMistake || [])
    .slice(0, 5)
    .map((m) => ({
      name: sanitizeContextString(m.mistakeName, 50) || "Unnamed Mistake",
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
      commonWhatWentWrong,
      commonEmotionalObservations,
    },
  };
}

/**
 * Builds a review-specific analysis context from the canonical review DTO.
 * Binds all user qualitative text and ensures strict user ownership.
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

  const cleanTitle = sanitizeContextString(review.title, 100);
  const cleanThesis = sanitizeContextString(review.thesis, 250);
  const cleanWhatWentWell = sanitizeContextString(review.whatWentWell, 250);
  const cleanWhatWentWrong = sanitizeContextString(review.whatWentWrong, 250);
  const cleanEmotional = sanitizeContextString(review.emotionalObservations, 250);
  const cleanLessons = sanitizeContextString(review.lessonsLearned, 250);
  const cleanActions = sanitizeContextString(review.improvementActions, 250);

  const cleanMistakes = (review.mistakes || [])
    .slice(0, 5)
    .map((m) => sanitizeContextString(m.name, 40))
    .filter((name): name is string => Boolean(name));

  return {
    reviewId: review.id,
    title: cleanTitle,
    reviewDate: review.reviewDate.toISOString().slice(0, 10),
    rating: review.rating,
    status: review.status,
    executionQuality: review.executionQuality,
    ruleAdherence: review.ruleAdherence,
    riskManagement: review.riskManagement,
    thesis: cleanThesis,
    whatWentWell: cleanWhatWentWell,
    whatWentWrong: cleanWhatWentWrong,
    emotionalObservation: cleanEmotional,
    lessonsLearned: cleanLessons,
    improvementActions: cleanActions,
    trades: (review.trades || []).slice(0, 15).map((t) => ({
      id: t.tradeId,
      side: t.trade?.side || "UNKNOWN",
      netPnl: t.trade?.netPnl || null,
      entryPrice: "0.00",
      exitPrice: null,
    })),
    mistakes: cleanMistakes,
  };
}
