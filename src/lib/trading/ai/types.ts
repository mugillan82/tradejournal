/**
 * AI Insights & Trading Journal Intelligence — Types and Contracts
 */

export const INSIGHT_CATEGORIES = [
  "PERFORMANCE",
  "RISK",
  "EXECUTION",
  "BEHAVIOR",
  "STRATEGY",
  "JOURNAL",
  "CONSISTENCY",
] as const;
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];

export const INSIGHT_SEVERITIES = ["INFO", "LOW", "MEDIUM", "HIGH"] as const;
export type InsightSeverity = (typeof INSIGHT_SEVERITIES)[number];

export const INSIGHT_CONFIDENCES = ["LOW", "MODERATE", "HIGH"] as const;
export type InsightConfidence = (typeof INSIGHT_CONFIDENCES)[number];

export interface InsightEvidence {
  readonly facts: string[];
  readonly sampleSize: number;
  readonly metrics: Record<string, string | number>;
}

export interface TradeInsight {
  readonly id: string;
  readonly category: InsightCategory;
  readonly title: string;
  readonly summary: string;
  readonly evidence: InsightEvidence;
  readonly severity: InsightSeverity;
  readonly confidence: InsightConfidence;
  readonly recommendations: string[];
}

export interface AiAnalysisContext {
  readonly dateRange: {
    readonly from?: string;
    readonly to?: string;
  };
  readonly totalTrades: number;
  readonly closedTrades: number;
  readonly winRate: number;
  readonly profitFactor: string | null;
  readonly netPnl: string;
  readonly averageWinner: string;
  readonly averageLoser: string;
  readonly averageTradePnl: string;
  readonly averageHoldingDurationSeconds: number;
  readonly maxDrawdown: string;
  readonly longVsShort: {
    readonly longCount: number;
    readonly shortCount: number;
    readonly longWinRate: number;
    readonly shortWinRate: number;
    readonly longNetPnl: string;
    readonly shortNetPnl: string;
  };
  readonly topSymbols: ReadonlyArray<{
    readonly symbol: string;
    readonly count: number;
    readonly winRate: number;
    readonly netPnl: string;
    readonly profitFactor: string | null;
  }>;
  readonly topStrategies: ReadonlyArray<{
    readonly name: string;
    readonly count: number;
    readonly winRate: number;
    readonly netPnl: string;
  }>;
  readonly topMistakes: ReadonlyArray<{
    readonly name: string;
    readonly count: number;
    readonly totalLoss: string;
  }>;
  readonly reviewThemes?: {
    readonly totalReviews: number;
    readonly averageExecutionQuality: number | null;
    readonly averageRuleAdherence: number | null;
    readonly commonWhatWentWrong: string[];
    readonly commonEmotionalObservations: string[];
  };
}

export interface AiInsightsResponseDto {
  readonly insights: ReadonlyArray<TradeInsight>;
  readonly summary: string;
  readonly sampleSize: number;
  readonly period: {
    readonly from?: string;
    readonly to?: string;
  };
  readonly provider: string;
  readonly providerConfigured: boolean;
  readonly generatedAt: string;
}

export interface ReviewAnalysisContext {
  readonly reviewId: string;
  readonly title: string | null;
  readonly reviewDate: string;
  readonly rating: number | null;
  readonly status: string;
  readonly executionQuality: number | null;
  readonly ruleAdherence: number | null;
  readonly riskManagement: number | null;
  readonly thesis: string | null;
  readonly whatWentWell: string | null;
  readonly whatWentWrong: string | null;
  readonly emotionalObservation: string | null;
  readonly lessonsLearned: string | null;
  readonly improvementActions: string | null;
  readonly trades: ReadonlyArray<{
    readonly id: string;
    readonly side: string;
    readonly netPnl: string | null;
    readonly entryPrice: string;
    readonly exitPrice: string | null;
  }>;
  readonly mistakes: ReadonlyArray<string>;
}

export interface AiReviewAnalysisDto {
  readonly reviewId: string;
  readonly summary: string;
  readonly rating: number | null;
  readonly executionQuality: number | null;
  readonly ruleAdherence: number | null;
  readonly strengths: string[];
  readonly weaknesses: string[];
  readonly processRecommendations: string[];
  readonly riskObservations: string[];
  readonly provider: string;
  readonly providerConfigured: boolean;
  readonly generatedAt: string;
}

export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateInsights(
    context: AiAnalysisContext,
  ): Promise<{ summary: string; insights: TradeInsight[] }>;
  analyzeReview(
    context: ReviewAnalysisContext,
  ): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    processRecommendations: string[];
    riskObservations: string[];
  }>;
}
