/**
 * AI Domain — Provider Abstraction & Implementations
 *
 * Implements:
 * 1. DeterministicProvider (offline, rule-based, zero-cost, 100% reliable)
 * 2. GeminiProvider (Google Gemini API via standard fetch)
 * 3. OpenAiProvider (OpenAI API via standard fetch)
 * 4. Factory getAiProvider() respecting environment variables
 *
 * Guarantees:
 * - No vendor lock-in.
 * - Zero extra npm dependencies required.
 * - No secrets leaked to client or logs.
 * - Strict JSON schema validation and HTML tag stripping on all LLM outputs.
 */

import "server-only";

import { detectDeterministicPatterns } from "./patterns";
import type {
  AIProvider,
  AiAnalysisContext,
  InsightCategory,
  InsightConfidence,
  InsightSeverity,
  ReviewAnalysisContext,
  TradeInsight,
} from "./types";

/**
 * Strips HTML tags and excessive whitespace from text to prevent injection.
 */
function sanitizeAiText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\r\n]{3,}/g, "\n\n")
    .trim();
}

/**
 * Validates and normalizes insight fields from untrusted external provider output.
 */
function normalizeProviderInsight(raw: unknown, index: number): TradeInsight | null {
  if (!raw || typeof raw !== "object") return null;
  const rawObj = raw as Record<string, unknown>;

  const validCategories: InsightCategory[] = [
    "PERFORMANCE",
    "RISK",
    "EXECUTION",
    "BEHAVIOR",
    "STRATEGY",
    "JOURNAL",
    "CONSISTENCY",
  ];
  const validSeverities: InsightSeverity[] = ["INFO", "LOW", "MEDIUM", "HIGH"];
  const validConfidences: InsightConfidence[] = ["LOW", "MODERATE", "HIGH"];

  const rawCat = typeof rawObj.category === "string" ? rawObj.category : "";
  const rawSev = typeof rawObj.severity === "string" ? rawObj.severity : "";
  const rawConf = typeof rawObj.confidence === "string" ? rawObj.confidence : "";

  const category = validCategories.includes(rawCat as InsightCategory) ? (rawCat as InsightCategory) : "PERFORMANCE";
  const severity = validSeverities.includes(rawSev as InsightSeverity) ? (rawSev as InsightSeverity) : "INFO";
  const confidence = validConfidences.includes(rawConf as InsightConfidence) ? (rawConf as InsightConfidence) : "MODERATE";

  const title = sanitizeAiText(String(rawObj.title || "")).slice(0, 100) || `Insight #${index + 1}`;
  const summary = sanitizeAiText(String(rawObj.summary || "")).slice(0, 500);
  if (!summary) return null;

  const rawEvidence = typeof rawObj.evidence === "object" && rawObj.evidence !== null
    ? (rawObj.evidence as Record<string, unknown>)
    : {};

  const rawFacts = Array.isArray(rawEvidence.facts) ? rawEvidence.facts : [];
  const facts = rawFacts.map((f: unknown) => sanitizeAiText(String(f)).slice(0, 200)).filter(Boolean);

  const sampleSize = typeof rawEvidence.sampleSize === "number" && !isNaN(rawEvidence.sampleSize)
    ? Math.max(0, Math.floor(rawEvidence.sampleSize))
    : 0;

  const rawRecs = Array.isArray(rawObj.recommendations) ? rawObj.recommendations : [];
  const recommendations = rawRecs.map((r: unknown) => sanitizeAiText(String(r)).slice(0, 250)).filter(Boolean);

  return {
    id: `ai-${Date.now()}-${index}`,
    category,
    title,
    summary,
    evidence: {
      facts,
      sampleSize,
      metrics: {},
    },
    severity,
    confidence,
    recommendations,
  };
}

// ============================================================================
// 1. DETERMINISTIC PROVIDER (Canonical Baseline)
// ============================================================================

export class DeterministicProvider implements AIProvider {
  readonly name = "Deterministic Engine";

  isConfigured(): boolean {
    return true;
  }

  async generateInsights(
    context: AiAnalysisContext,
  ): Promise<{ summary: string; insights: TradeInsight[] }> {
    const { summary, insights } = detectDeterministicPatterns(context);

    return {
      summary,
      insights,
    };
  }

  async analyzeReview(
    context: ReviewAnalysisContext,
  ): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    processRecommendations: string[];
    riskObservations: string[];
  }> {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const processRecommendations: string[] = [];
    const riskObservations: string[] = [];

    // Evaluate ratings
    if (context.executionQuality !== null) {
      if (context.executionQuality >= 8) {
        strengths.push(`High execution quality rating of ${context.executionQuality}/10 recorded.`);
      } else if (context.executionQuality <= 5) {
        weaknesses.push(`Low execution quality rating of ${context.executionQuality}/10 indicates entry/exit slippage or execution hesitations.`);
        processRecommendations.push("Audit your pre-market checklist before entering positions to reduce execution errors.");
      }
    }

    if (context.ruleAdherence !== null) {
      if (context.ruleAdherence >= 8) {
        strengths.push(`Disciplined trading plan adherence with a score of ${context.ruleAdherence}/10.`);
      } else if (context.ruleAdherence <= 5) {
        weaknesses.push(`Rule adherence scored at ${context.ruleAdherence}/10, reflecting deviation from your written system.`);
        processRecommendations.push("Define a hard rule: if a setup deviates from criteria by even 1 checklist item, no position may be taken.");
      }
    }

    if (context.riskManagement !== null) {
      if (context.riskManagement >= 8) {
        strengths.push(`Solid risk management adherence (${context.riskManagement}/10).`);
      } else if (context.riskManagement <= 5) {
        weaknesses.push(`Risk management score of ${context.riskManagement}/10 indicates potential sizing or stop-loss discipline lapses.`);
        riskObservations.push("Ensure stop-loss orders are placed immediately upon fill and position sizing never exceeds your maximum risk threshold.");
      }
    }

    // Evaluate user notes
    if (context.whatWentWell && context.whatWentWell.trim()) {
      strengths.push(`Observed strength: ${context.whatWentWell.trim().slice(0, 150)}`);
    }
    if (context.whatWentWrong && context.whatWentWrong.trim()) {
      weaknesses.push(`Identified friction: ${context.whatWentWrong.trim().slice(0, 150)}`);
    }

    // Evaluate mistakes
    if (context.mistakes && context.mistakes.length > 0) {
      weaknesses.push(`Tagged mistake(s): ${context.mistakes.join(", ")}`);
      processRecommendations.push(`Create an intentional review protocol focused specifically on eliminating "${context.mistakes[0]}".`);
    }

    // Evaluate trades included
    const tradeCount = context.trades.length;
    let netSum = 0;
    for (const t of context.trades) {
      if (t.netPnl) netSum += Number(t.netPnl);
    }
    if (tradeCount > 0) {
      riskObservations.push(`Review encompasses ${tradeCount} trade(s) with aggregate realized P&L of $${netSum.toFixed(2)}.`);
    }

    if (processRecommendations.length === 0) {
      processRecommendations.push("Continue documenting structured reviews consistently to track long-term adherence trends.");
    }

    const summary = `Structured debrief of review "${context.title || context.reviewDate}" analyzing ${tradeCount} trade(s). ${strengths.length} strength(s) and ${weaknesses.length} observation(s) noted.`;

    return {
      summary,
      strengths,
      weaknesses,
      processRecommendations,
      riskObservations,
    };
  }
}

// ============================================================================
// 2. GEMINI PROVIDER
// ============================================================================

export class GeminiProvider implements AIProvider {
  readonly name = "Google Gemini";
  private apiKey: string;
  private fallback = new DeterministicProvider();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 5);
  }

  async generateInsights(
    context: AiAnalysisContext,
  ): Promise<{ summary: string; insights: TradeInsight[] }> {
    // Generate deterministic baseline insights
    const deterministic = await this.fallback.generateInsights(context);

    if (!this.isConfigured() || context.closedTrades < 3) {
      return deterministic;
    }

    try {
      const prompt = `You are a professional quantitative trading analyst. Analyze the following trading performance data and produce structured, factual insights.
Rules:
1. Ground every statement strictly in the provided data.
2. Distinguish verified facts from analytical interpretation.
3. Never promise future financial returns, generate trading signals, or diagnose psychological disorders.
4. Recommendations must be process-oriented (e.g. risk capping, checklist adherence).
5. Output MUST be valid JSON conforming to:
{
  "summary": "Brief 2-3 sentence overview of findings",
  "insights": [
    {
      "category": "PERFORMANCE" | "RISK" | "EXECUTION" | "BEHAVIOR" | "STRATEGY" | "CONSISTENCY",
      "title": "Clear concise title",
      "summary": "Specific analytical interpretation",
      "severity": "INFO" | "LOW" | "MEDIUM" | "HIGH",
      "confidence": "LOW" | "MODERATE" | "HIGH",
      "evidence": {
        "facts": ["Specific numerical fact 1", "Specific numerical fact 2"],
        "sampleSize": number
      },
      "recommendations": ["Actionable process recommendation"]
    }
  ]
}

DATASET:
${JSON.stringify(context, null, 2)}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        },
      );

      if (!response.ok) {
        console.warn(`Gemini API responded with status ${response.status}. Falling back to deterministic engine.`);
        return deterministic;
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return deterministic;

      const parsed = JSON.parse(rawText);
      const rawInsights = Array.isArray(parsed.insights) ? parsed.insights : [];
      const normalizedInsights: TradeInsight[] = [];

      for (let i = 0; i < rawInsights.length; i++) {
        const item = normalizeProviderInsight(rawInsights[i], i);
        if (item) normalizedInsights.push(item);
      }

      if (normalizedInsights.length === 0) return deterministic;

      return {
        summary: sanitizeAiText(parsed.summary) || deterministic.summary,
        insights: normalizedInsights,
      };
    } catch (err) {
      console.warn("GeminiProvider error, falling back to deterministic:", err);
      return deterministic;
    }
  }

  async analyzeReview(
    context: ReviewAnalysisContext,
  ): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    processRecommendations: string[];
    riskObservations: string[];
  }> {
    const deterministic = await this.fallback.analyzeReview(context);

    if (!this.isConfigured()) {
      return deterministic;
    }

    try {
      const prompt = `You are a professional trading coach. Debrief the following trade review.
Rules:
1. Only evaluate the user's provided notes, execution scores, and trades.
2. Do not offer live trading signals. Focus on discipline, process, and risk adherence.
3. Respond ONLY in valid JSON conforming to:
{
  "summary": "Concise 2-sentence summary",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "processRecommendations": ["string"],
  "riskObservations": ["string"]
}

REVIEW DATA:
${JSON.stringify(context, null, 2)}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        },
      );

      if (!response.ok) return deterministic;

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return deterministic;

      const parsed = JSON.parse(rawText);
      return {
        summary: sanitizeAiText(parsed.summary) || deterministic.summary,
        strengths: (Array.isArray(parsed.strengths) ? parsed.strengths : [])
          .map((s: unknown) => sanitizeAiText(String(s)))
          .filter(Boolean),
        weaknesses: (Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [])
          .map((s: unknown) => sanitizeAiText(String(s)))
          .filter(Boolean),
        processRecommendations: (Array.isArray(parsed.processRecommendations) ? parsed.processRecommendations : [])
          .map((s: unknown) => sanitizeAiText(String(s)))
          .filter(Boolean),
        riskObservations: (Array.isArray(parsed.riskObservations) ? parsed.riskObservations : [])
          .map((s: unknown) => sanitizeAiText(String(s)))
          .filter(Boolean),
      };
    } catch {
      return deterministic;
    }
  }
}

// ============================================================================
// 3. OPENAI PROVIDER
// ============================================================================

export class OpenAiProvider implements AIProvider {
  readonly name = "OpenAI";
  private apiKey: string;
  private fallback = new DeterministicProvider();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 5);
  }

  async generateInsights(
    context: AiAnalysisContext,
  ): Promise<{ summary: string; insights: TradeInsight[] }> {
    const deterministic = await this.fallback.generateInsights(context);

    if (!this.isConfigured() || context.closedTrades < 3) {
      return deterministic;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are an analytical trading journal intelligence system. Interpret user metrics factually without hallucinating, diagnosing psychology, or generating trade signals. Return valid JSON containing summary and insights array.",
            },
            {
              role: "user",
              content: JSON.stringify(context),
            },
          ],
        }),
      });

      if (!response.ok) {
        return deterministic;
      }

      const json = await response.json();
      const rawText = json.choices?.[0]?.message?.content;
      if (!rawText) return deterministic;

      const parsed = JSON.parse(rawText);
      const rawInsights = Array.isArray(parsed.insights) ? parsed.insights : [];
      const normalizedInsights: TradeInsight[] = [];

      for (let i = 0; i < rawInsights.length; i++) {
        const item = normalizeProviderInsight(rawInsights[i], i);
        if (item) normalizedInsights.push(item);
      }

      if (normalizedInsights.length === 0) return deterministic;

      return {
        summary: sanitizeAiText(parsed.summary) || deterministic.summary,
        insights: normalizedInsights,
      };
    } catch {
      return deterministic;
    }
  }

  async analyzeReview(
    context: ReviewAnalysisContext,
  ): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    processRecommendations: string[];
    riskObservations: string[];
  }> {
    const deterministic = await this.fallback.analyzeReview(context);

    if (!this.isConfigured()) {
      return deterministic;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are an objective trading review debriefer. Return valid JSON with summary, strengths, weaknesses, processRecommendations, riskObservations.",
            },
            {
              role: "user",
              content: JSON.stringify(context),
            },
          ],
        }),
      });

      if (!response.ok) return deterministic;

      const json = await response.json();
      const rawText = json.choices?.[0]?.message?.content;
      if (!rawText) return deterministic;

      const parsed = JSON.parse(rawText);
      return {
        summary: sanitizeAiText(parsed.summary) || deterministic.summary,
        strengths: (Array.isArray(parsed.strengths) ? parsed.strengths : [])
          .map((s: unknown) => sanitizeAiText(String(s)))
          .filter(Boolean),
        weaknesses: (Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [])
          .map((s: unknown) => sanitizeAiText(String(s)))
          .filter(Boolean),
        processRecommendations: (Array.isArray(parsed.processRecommendations) ? parsed.processRecommendations : [])
          .map((s: unknown) => sanitizeAiText(String(s)))
          .filter(Boolean),
        riskObservations: (Array.isArray(parsed.riskObservations) ? parsed.riskObservations : [])
          .map((s: unknown) => sanitizeAiText(String(s)))
          .filter(Boolean),
      };
    } catch {
      return deterministic;
    }
  }
}

// ============================================================================
// 4. DISABLED PROVIDER
// ============================================================================

export class DisabledProvider implements AIProvider {
  readonly name = "Disabled";

  isConfigured(): boolean {
    return false;
  }

  async generateInsights(): Promise<{ summary: string; insights: TradeInsight[] }> {
    return {
      summary: "AI Insights are currently disabled in server configuration.",
      insights: [],
    };
  }

  async analyzeReview(): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    processRecommendations: string[];
    riskObservations: string[];
  }> {
    return {
      summary: "AI Review Analysis is currently disabled.",
      strengths: [],
      weaknesses: [],
      processRecommendations: [],
      riskObservations: [],
    };
  }
}

// ============================================================================
// 5. FACTORY
// ============================================================================

/**
 * Returns the active AI Provider based on server configuration.
 */
export function getAiProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || "").toLowerCase().trim();

  if (providerType === "disabled") {
    return new DisabledProvider();
  }

  if (providerType === "gemini" && process.env.GEMINI_API_KEY) {
    return new GeminiProvider(process.env.GEMINI_API_KEY);
  }

  if (providerType === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAiProvider(process.env.OPENAI_API_KEY);
  }

  // Automatic discovery if AI_PROVIDER wasn't explicitly set
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider(process.env.GEMINI_API_KEY);
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiProvider(process.env.OPENAI_API_KEY);
  }

  // Default: Deterministic Engine (Always safe, zero dependencies, local-first)
  return new DeterministicProvider();
}
