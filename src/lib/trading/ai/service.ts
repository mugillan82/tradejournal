/**
 * AI Domain — Service Layer
 *
 * Orchestrates analytics extraction, pattern detection, LLM provider integration,
 * rate limiting, and output validation.
 *
 * Guarantees:
 * - Server-only execution.
 * - Strict per-user isolation (never leaks foreign trading data).
 * - Per-user in-memory rate limiting (max 10 requests / 60 seconds).
 * - Safe fallback to deterministic pattern engine.
 * - No persistent side-effects or unauthorized trade modifications.
 */

import "server-only";

import { buildAiAnalysisContext, buildReviewAnalysisContext } from "./context";
import { getAiProvider } from "./provider";
import type {
  AiAnalysisContext,
  AiInsightsResponseDto,
  AiReviewAnalysisDto,
} from "./types";
import type { AnalyticsFilterInput } from "@/lib/trading/analytics/types";

// ============================================================================
// RATE LIMITER (In-Memory Sliding Window)
// ============================================================================

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const rateLimitMap = new Map<string, RateLimitBucket>();

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const bucket = rateLimitMap.get(userId);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    const secondsRemaining = Math.ceil((bucket.resetAt - now) / 1000);
    throw new Error(
      `Rate limit exceeded for AI analysis. Please wait ${secondsRemaining} second(s) before trying again.`,
    );
  }

  bucket.count += 1;
}

// ============================================================================
// PUBLIC SERVICE FUNCTIONS
// ============================================================================

/**
 * Returns current server AI configuration status.
 */
export function getAiConfigurationStatus(): {
  readonly provider: string;
  readonly configured: boolean;
  readonly mode: "external-llm" | "deterministic" | "disabled";
} {
  const provider = getAiProvider();
  const configured = provider.isConfigured();

  let mode: "external-llm" | "deterministic" | "disabled" = "deterministic";
  if (!configured) {
    mode = "disabled";
  } else if (provider.name === "Google Gemini" || provider.name === "OpenAI") {
    mode = "external-llm";
  }

  return {
    provider: provider.name,
    configured,
    mode,
  };
}

/**
 * Generates structured, grounded insights for a user's trading dataset.
 */
export async function generateTradeInsights(
  userId: string,
  filter?: AnalyticsFilterInput,
): Promise<AiInsightsResponseDto> {
  if (!userId || typeof userId !== "string") {
    throw new Error("Authentication required to generate insights.");
  }

  // 1. Enforce per-user request throttling
  checkRateLimit(userId);

  // 2. Build structured, bounded analysis context from canonical analytics
  const context: AiAnalysisContext = await buildAiAnalysisContext(userId, filter);

  // 3. Delegate to provider (Deterministic, Gemini, or OpenAI)
  const provider = getAiProvider();
  const result = await provider.generateInsights(context);

  return {
    insights: result.insights,
    summary: result.summary,
    sampleSize: context.closedTrades,
    period: {
      from: context.dateRange.from,
      to: context.dateRange.to,
    },
    provider: provider.name,
    providerConfigured: provider.isConfigured(),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Performs structured debrief and debrief analysis on a specific trade review.
 */
export async function analyzeReview(
  userId: string,
  reviewId: string,
): Promise<AiReviewAnalysisDto> {
  if (!userId || typeof userId !== "string") {
    throw new Error("Authentication required to analyze review.");
  }
  if (!reviewId || typeof reviewId !== "string") {
    throw new Error("Valid review ID is required.");
  }

  // 1. Enforce per-user request throttling
  checkRateLimit(userId);

  // 2. Build review context (guarantees user ownership)
  const context = await buildReviewAnalysisContext(userId, reviewId);

  // 3. Delegate to provider
  const provider = getAiProvider();
  const result = await provider.analyzeReview(context);

  return {
    reviewId: context.reviewId,
    summary: result.summary,
    rating: context.rating,
    executionQuality: context.executionQuality,
    ruleAdherence: context.ruleAdherence,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    processRecommendations: result.processRecommendations,
    riskObservations: result.riskObservations,
    provider: provider.name,
    providerConfigured: provider.isConfigured(),
    generatedAt: new Date().toISOString(),
  };
}
