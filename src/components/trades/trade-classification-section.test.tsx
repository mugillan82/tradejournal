// @vitest-environment happy-dom
/**
 * Trade Classification Section — Component Unit Test
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TradeClassificationSection } from "./trade-classification-section";
import * as clientTrades from "@/lib/client/trades";

vi.mock("@/lib/client/trades", async () => {
  const actual = await vi.importActual("@/lib/client/trades");
  return {
    ...actual,
    fetchTradeClassificationsClient: vi.fn(),
    fetchTagsClient: vi.fn(),
    fetchStrategiesClient: vi.fn(),
    fetchSetupsClient: vi.fn(),
    fetchMistakesClient: vi.fn(),
    setTradeTagsClient: vi.fn(),
    setTradeMistakesClient: vi.fn(),
    assignTradeStrategyClient: vi.fn(),
    assignTradeSetupClient: vi.fn(),
    createTagClient: vi.fn(),
    createStrategyClient: vi.fn(),
    createSetupClient: vi.fn(),
    createMistakeClient: vi.fn(),
  };
});

describe("TradeClassificationSection Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(clientTrades.fetchTradeClassificationsClient).mockResolvedValue({
      tradeId: "trade_test_123",
      strategy: {
        id: "strat_1",
        name: "Breakout Alpha",
        description: "Standard breakout rules",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      setup: {
        id: "setup_1",
        name: "Morning Gap",
        description: "Gap continuation",
        createdAt: new Date(),
      },
      tags: [
        { id: "tag_1", name: "HighVolume", color: "#10b981", createdAt: new Date() },
      ],
      mistakes: [
        { id: "mist_1", name: "FOMO Entry", description: "Chased entry", createdAt: new Date() },
      ],
    });

    vi.mocked(clientTrades.fetchTagsClient).mockResolvedValue([
      { id: "tag_1", name: "HighVolume", color: "#10b981", createdAt: new Date() },
      { id: "tag_2", name: "Earnings", color: "#3b82f6", createdAt: new Date() },
    ]);

    vi.mocked(clientTrades.fetchStrategiesClient).mockResolvedValue([
      {
        id: "strat_1",
        name: "Breakout Alpha",
        description: "Standard breakout rules",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "strat_2",
        name: "Mean Reversion",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    vi.mocked(clientTrades.fetchSetupsClient).mockResolvedValue([
      {
        id: "setup_1",
        name: "Morning Gap",
        description: "Gap continuation",
        createdAt: new Date(),
      },
    ]);

    vi.mocked(clientTrades.fetchMistakesClient).mockResolvedValue([
      {
        id: "mist_1",
        name: "FOMO Entry",
        description: "Chased entry",
        createdAt: new Date(),
      },
      {
        id: "mist_2",
        name: "Moved Stop",
        description: "Risk violation",
        createdAt: new Date(),
      },
    ]);
  });

  it("renders loading state initially and then displays classification data", async () => {
    render(<TradeClassificationSection tradeId="trade_test_123" />);

    expect(screen.getByText(/loading trade classifications/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Framework & Classifications")).toBeDefined();
    });

    // Check strategy and setup rendered
    expect(screen.getByText(/Active Strategy:/i)).toBeDefined();
    expect(screen.getAllByText("Breakout Alpha").length).toBeGreaterThan(0);
    expect(screen.getByText(/Active Setup:/i)).toBeDefined();
    expect(screen.getAllByText("Morning Gap").length).toBeGreaterThan(0);


    // Check tag pills
    expect(screen.getByRole("button", { name: /HighVolume/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Earnings/i })).toBeDefined();

    // Check mistake pills
    expect(screen.getByRole("button", { name: /FOMO Entry/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Moved Stop/i })).toBeDefined();
  });

  it("toggles a tag association when clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(clientTrades.setTradeTagsClient).mockResolvedValue([
      { id: "tag_1", name: "HighVolume", color: "#10b981", createdAt: new Date() },
      { id: "tag_2", name: "Earnings", color: "#3b82f6", createdAt: new Date() },
    ]);

    render(<TradeClassificationSection tradeId="trade_test_123" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Earnings/i })).toBeDefined();
    });

    await user.click(screen.getByRole("button", { name: /Earnings/i }));

    expect(clientTrades.setTradeTagsClient).toHaveBeenCalledWith("trade_test_123", [
      "tag_1",
      "tag_2",
    ]);
  });
});
