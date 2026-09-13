// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockFetchReviewAnalysis = vi.fn();
vi.mock("@/lib/client/ai", () => ({
  fetchReviewAnalysis: (...args: unknown[]) => mockFetchReviewAnalysis(...args),
  AiClientError: class AiClientError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code = "AI_ERROR") {
      super(message);
      this.name = "AiClientError";
      this.status = status;
      this.code = code;
    }
  },
}));

import { ReviewAiAnalysisModal } from "@/components/reviews/review-ai-analysis-modal";
import type { AiReviewAnalysisDto } from "@/lib/trading/ai/types";

describe("ReviewAiAnalysisModal Component", () => {
  const mockAnalysis: AiReviewAnalysisDto = {
    reviewId: "rev-101",
    summary: "Structured debrief for post-trade reflection.",
    rating: 8,
    executionQuality: 9,
    ruleAdherence: 8,
    strengths: ["Clean entry confirmation according to plan."],
    weaknesses: ["Trailing stop was wider than intended."],
    processRecommendations: ["Define strict tick-based trailing distance."],
    riskObservations: ["Realized risk did not exceed 1% threshold."],
    provider: "Deterministic Engine",
    providerConfigured: true,
    generatedAt: "2026-03-01T12:00:00Z",
  };

  beforeEach(() => {
    mockFetchReviewAnalysis.mockReset();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <ReviewAiAnalysisModal reviewId="rev-101" isOpen={false} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal when open and debriefs review on user trigger", async () => {
    mockFetchReviewAnalysis.mockResolvedValue(mockAnalysis);

    render(
      <ReviewAiAnalysisModal reviewId="rev-101" isOpen={true} onClose={() => {}} />,
    );

    expect(screen.getByTestId("review-ai-modal")).toBeDefined();
    expect(screen.getByText("Ready to debrief this review session?")).toBeDefined();

    const startBtn = screen.getByText("Start AI Debrief");
    fireEvent.click(startBtn);

    expect(mockFetchReviewAnalysis).toHaveBeenCalledWith("rev-101");

    await waitFor(() => {
      expect(screen.getByText("Structured debrief for post-trade reflection.")).toBeDefined();
    });

    expect(screen.getByText("Clean entry confirmation according to plan.")).toBeDefined();
    expect(screen.getByText("Trailing stop was wider than intended.")).toBeDefined();
    expect(screen.getByText("Define strict tick-based trailing distance.")).toBeDefined();
    expect(screen.getByText("Realized risk did not exceed 1% threshold.")).toBeDefined();
    expect(screen.getByText(/No review data modified/i)).toBeDefined();
  });

  it("displays error message when debrief fails", async () => {
    mockFetchReviewAnalysis.mockRejectedValue(new Error("Unable to analyze review"));

    render(
      <ReviewAiAnalysisModal reviewId="rev-101" isOpen={true} onClose={() => {}} />,
    );

    fireEvent.click(screen.getByText("Start AI Debrief"));

    await waitFor(() => {
      expect(screen.getByText("Failed to analyze review.")).toBeDefined();
    });
  });
});
