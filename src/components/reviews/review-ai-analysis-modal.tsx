/**
 * AI Review Analysis Modal
 *
 * Provides an on-demand AI debrief for structured trade reviews.
 * Adheres to the principle that AI is an analyst and does NOT modify the original review.
 */

"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { fetchReviewAnalysis, AiClientError } from "@/lib/client/ai";
import type { AiReviewAnalysisDto } from "@/lib/trading/ai/types";

interface ReviewAiAnalysisModalProps {
  readonly reviewId: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function ReviewAiAnalysisModal({
  reviewId,
  isOpen,
  onClose,
}: ReviewAiAnalysisModalProps) {
  const [data, setData] = useState<AiReviewAnalysisDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchReviewAnalysis(reviewId);
      setData(res);
    } catch (err: unknown) {
      if (err instanceof AiClientError) {
        setError(err.message);
      } else {
        setError("Failed to analyze review.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      data-testid="review-ai-modal"
    >
      <div className="relative w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">
                AI Review Debrief & Retrospective
              </h3>
              <p className="text-xs text-zinc-400">
                Objective analysis of execution scores, plan adherence, and noted frictions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Initial call-to-action state */}
        {!data && !isLoading && !error && (
          <div className="text-center py-8 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-medium text-zinc-200">
              Ready to debrief this review session?
            </h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              The AI engine will inspect your execution quality rating, rule adherence score,
              qualitative notes, and linked trades to suggest process optimizations.
            </p>
            <button
              type="button"
              onClick={handleAnalyze}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-sm"
            >
              <span>Start AI Debrief</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="py-8 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-xs text-zinc-400">
              Analyzing review notes, scores, and execution metrics...
            </p>
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <div className="space-y-4 text-xs">
            {/* Summary */}
            <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
              <span className="font-semibold text-zinc-300">Executive Summary:</span>
              <p className="text-zinc-300 leading-relaxed">{data.summary}</p>
            </div>

            {/* Strengths */}
            {data.strengths.length > 0 && (
              <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 space-y-2">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Observed Strengths & Plan Adherence:
                </span>
                <ul className="space-y-1 pl-5 list-disc text-zinc-300">
                  {data.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses / Frictions */}
            {data.weaknesses.length > 0 && (
              <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/30 space-y-2">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Identified Frictions & Vulnerabilities:
                </span>
                <ul className="space-y-1 pl-5 list-disc text-zinc-300">
                  {data.weaknesses.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Process Recommendations */}
            {data.processRecommendations.length > 0 && (
              <div className="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-900/30 space-y-2">
                <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Process & Discipline Recommendations:
                </span>
                <ul className="space-y-1 pl-5 list-disc text-zinc-300">
                  {data.processRecommendations.map((pr, idx) => (
                    <li key={idx}>{pr}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Observations */}
            {data.riskObservations.length > 0 && (
              <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/30 space-y-2">
                <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Risk & Capital Considerations:
                </span>
                <ul className="space-y-1 pl-5 list-disc text-zinc-300">
                  {data.riskObservations.map((ro, idx) => (
                    <li key={idx}>{ro}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advisory footer */}
            <div className="pt-2 text-[11px] text-zinc-500 border-t border-zinc-800/80 flex items-center justify-between">
              <span>Engine: {data.provider}</span>
              <span>Advisory debrief only • No review data modified</span>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
