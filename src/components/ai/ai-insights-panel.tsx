/**
 * AI Insights & Pattern Intelligence Panel
 *
 * Interactive component presenting grounded, evidence-based trade intelligence.
 * Explicitly triggered by user ("Generate Insights" / "Analyze Period").
 * Never calls AI automatically on mount or filter change.
 */

"use client";

import React, { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
} from "lucide-react";
import { fetchAiInsights, AiClientError } from "@/lib/client/ai";
import type {
  AiInsightsResponseDto,
  InsightCategory,
  InsightSeverity,
  TradeInsight,
} from "@/lib/trading/ai/types";

interface AiInsightsPanelProps {
  readonly filters?: Record<string, unknown>;
  readonly title?: string;
  readonly compact?: boolean;
}

export function AiInsightsPanel({
  filters,
  title = "AI Insights & Pattern Intelligence",
  compact = false,
}: AiInsightsPanelProps) {
  const [data, setData] = useState<AiInsightsResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedInsightIds, setExpandedInsightIds] = useState<Record<string, boolean>>({});

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAiInsights(filters);
      setData(res);
      // Auto-expand first 2 insights
      if (res.insights && res.insights.length > 0) {
        const initial: Record<string, boolean> = {};
        res.insights.slice(0, 2).forEach((i) => {
          initial[i.id] = true;
        });
        setExpandedInsightIds(initial);
      }
    } catch (err: unknown) {
      if (err instanceof AiClientError) {
        setError(err.message);
      } else {
        setError("Unable to generate AI insights at this time.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedInsightIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getSeverityBadge = (sev: InsightSeverity) => {
    switch (sev) {
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> High Focus
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-3 h-3" /> Medium Focus
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Info className="w-3 h-3" /> Low Focus
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Info className="w-3 h-3" /> Info
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: InsightCategory) => {
    return (
      <span className="text-[11px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
        {cat}
      </span>
    );
  };

  return (
    <div
      className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md shadow-sm space-y-4"
      data-testid="ai-insights-panel"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Grounded pattern synthesis derived strictly from your canonical trading metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          data-testid="generate-insights-btn"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Canonical Data...</span>
            </>
          ) : data ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Insights</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              <span>Generate Insights</span>
            </>
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Initial state */}
      {!data && !isLoading && !error && (
        <div className="text-center py-6 px-4 rounded-lg bg-zinc-950/40 border border-dashed border-zinc-800">
          <Target className="w-8 h-8 text-zinc-500 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-medium text-zinc-300">No Insights Generated Yet</p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Click &quot;Generate Insights&quot; to examine directional win rates, risk-reward ratios, mistake leakage, and rule adherence.
          </p>
        </div>
      )}

      {/* Loading state skeleton */}
      {isLoading && (
        <div className="space-y-3 py-2 animate-pulse">
          <div className="h-10 bg-zinc-800/50 rounded-lg w-full" />
          <div className="h-24 bg-zinc-800/40 rounded-lg w-full" />
          <div className="h-24 bg-zinc-800/40 rounded-lg w-full" />
        </div>
      )}

      {/* Generated Insights Content */}
      {data && !isLoading && (
        <div className="space-y-4">
          {/* Metadata banner */}
          <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-zinc-300">
              <span className="text-zinc-500 mr-1.5 font-medium">Summary:</span>
              <span>{data.summary}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Engine: {data.provider}
              </span>
              <span>•</span>
              <span>Sample: {data.sampleSize} closed trades</span>
            </div>
          </div>

          {/* Zero closed trades notice */}
          {data.insights.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-400">
              No significant behavioral anomalies or risk divergences detected for this sample.
            </div>
          ) : (
            <div className="space-y-3">
              {(compact ? data.insights.slice(0, 3) : data.insights).map((insight: TradeInsight) => {
                const isExpanded = Boolean(expandedInsightIds[insight.id]);

                return (
                  <div
                    key={insight.id}
                    className="rounded-lg border border-zinc-800/90 bg-zinc-950/40 hover:border-zinc-700/80 transition-colors overflow-hidden"
                  >
                    {/* Insight Header */}
                    <div
                      onClick={() => toggleExpand(insight.id)}
                      className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {getCategoryBadge(insight.category)}
                          {getSeverityBadge(insight.severity)}
                          <span className="text-xs text-zinc-500">
                            Confidence: {insight.confidence}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-200">
                          {insight.title}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-2">
                          {insight.summary}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="text-zinc-400 hover:text-zinc-200 p-1 flex-shrink-0"
                        aria-label={isExpanded ? "Collapse insight" : "Expand insight"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-zinc-800/60 space-y-3 text-xs bg-zinc-900/30">
                        {/* Evidence facts */}
                        {insight.evidence.facts.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-medium text-zinc-400 tracking-wider uppercase">
                              Observed Evidence Facts:
                            </span>
                            <ul className="space-y-1 pl-1">
                              {insight.evidence.facts.map((fact, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-zinc-300 font-mono text-[11px]"
                                >
                                  <span className="text-indigo-400">•</span>
                                  <span>{fact}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Process Recommendations */}
                        {insight.recommendations.length > 0 && (
                          <div className="p-2.5 rounded bg-indigo-950/20 border border-indigo-900/30 space-y-1.5">
                            <span className="text-[11px] font-medium text-indigo-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                              Actionable Process Recommendations:
                            </span>
                            <ul className="space-y-1 pl-5 list-disc text-zinc-300">
                              {insight.recommendations.map((rec, rIdx) => (
                                <li key={rIdx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
