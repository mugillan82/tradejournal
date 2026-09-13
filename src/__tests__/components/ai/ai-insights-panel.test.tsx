// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockFetchAiInsights = vi.fn();
vi.mock("@/lib/client/ai", () => ({
  fetchAiInsights: (...args: unknown[]) => mockFetchAiInsights(...args),
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

import { AiInsightsPanel } from "@/components/ai/ai-insights-panel";
import type { AiInsightsResponseDto } from "@/lib/trading/ai/types";

describe("AiInsightsPanel Component", () => {
  const mockResponse: AiInsightsResponseDto = {
    insights: [
      {
        id: "insight-1",
        category: "PERFORMANCE",
        title: "Directional Asymmetry: Long Outperforms Short",
        summary: "Noticeable discrepancy in win rate between sides.",
        evidence: {
          facts: ["LONG positions won 70% of the time across 20 trades."],
          sampleSize: 20,
          metrics: {},
        },
        severity: "HIGH",
        confidence: "HIGH",
        recommendations: ["Review short entry checklists"],
      },
    ],
    summary: "Analyzed 20 closed trades.",
    sampleSize: 20,
    period: { from: "2026-01-01", to: "2026-03-01" },
    provider: "Deterministic Engine",
    providerConfigured: true,
    generatedAt: "2026-03-01T12:00:00Z",
  };

  beforeEach(() => {
    mockFetchAiInsights.mockReset();
  });

  it("renders in initial un-triggered state with Generate Insights button", () => {
    render(<AiInsightsPanel />);
    expect(screen.getByTestId("ai-insights-panel")).toBeDefined();
    expect(screen.getByText("No Insights Generated Yet")).toBeDefined();
    expect(screen.getByTestId("generate-insights-btn")).toBeDefined();
    // Verify AI is NOT called automatically on mount
    expect(mockFetchAiInsights).not.toHaveBeenCalled();
  });

  it("triggers insight generation on user button click and renders results", async () => {
    mockFetchAiInsights.mockResolvedValue(mockResponse);

    render(<AiInsightsPanel filters={{ symbol: "EURUSD" }} />);
    const btn = screen.getByTestId("generate-insights-btn");
    fireEvent.click(btn);

    expect(mockFetchAiInsights).toHaveBeenCalledWith({ symbol: "EURUSD" });

    await waitFor(() => {
      expect(
        screen.getByText("Directional Asymmetry: Long Outperforms Short"),
      ).toBeDefined();
    });

    expect(screen.getByText(/High Focus/i)).toBeDefined();
    expect(screen.getByText("PERFORMANCE")).toBeDefined();
    expect(screen.getByText("Confidence: HIGH")).toBeDefined();
    expect(screen.getByText("LONG positions won 70% of the time across 20 trades.")).toBeDefined();
    expect(screen.getByText("Review short entry checklists")).toBeDefined();
  });

  it("displays error message gracefully when generation fails", async () => {
    mockFetchAiInsights.mockRejectedValue(new Error("Network failure"));

    render(<AiInsightsPanel />);
    fireEvent.click(screen.getByTestId("generate-insights-btn"));

    await waitFor(() => {
      expect(screen.getByText("Unable to generate AI insights at this time.")).toBeDefined();
    });
  });
});
