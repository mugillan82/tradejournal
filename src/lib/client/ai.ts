/**
 * AI Domain — Client Data Layer
 *
 * Typed client API functions for AI insights and review debrief analysis.
 */

import type { AiInsightsResponseDto, AiReviewAnalysisDto } from "../trading/ai/types";

export class AiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "AI_ERROR") {
    super(message);
    this.name = "AiClientError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Triggers on-demand AI insight generation for user-selected analytics filters.
 */
export async function fetchAiInsights(
  filters?: Record<string, unknown>,
): Promise<AiInsightsResponseDto> {
  const res = await fetch("/api/ai/insights", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(filters || {}),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorObj = data.error || {};
    throw new AiClientError(
      errorObj.message || "Failed to generate AI insights.",
      res.status,
      errorObj.code || "REQUEST_FAILED",
    );
  }

  return data as AiInsightsResponseDto;
}

/**
 * Triggers structured debrief analysis for a single trade review.
 */
export async function fetchReviewAnalysis(reviewId: string): Promise<AiReviewAnalysisDto> {
  const res = await fetch("/api/ai/analyze-review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reviewId }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorObj = data.error || {};
    throw new AiClientError(
      errorObj.message || "Failed to analyze trade review.",
      res.status,
      errorObj.code || "REQUEST_FAILED",
    );
  }

  return data as AiReviewAnalysisDto;
}
