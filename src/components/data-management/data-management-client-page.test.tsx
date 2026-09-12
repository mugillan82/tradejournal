// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DataManagementClientPage } from "./data-management-client-page";
import * as clientModule from "@/lib/client/data-management";

vi.mock("@/lib/client/data-management", async () => {
  const actual = await vi.importActual<typeof clientModule>("@/lib/client/data-management");
  return {
    ...actual,
    fetchDataManagementOverview: vi.fn(),
    requestExportDownload: vi.fn(),
    triggerBrowserDownload: vi.fn(),
  };
});

describe("DataManagementClientPage UI", () => {
  const mockOverview: clientModule.DataManagementOverviewDto = {
    accounts: 3,
    trades: 25,
    executions: 50,
    journalEntries: 12,
    tradeNotes: 8,
    reviews: 2,
    tags: 15,
    strategies: 4,
    setups: 7,
    mistakes: 3,
    attachments: 6,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientModule.fetchDataManagementOverview).mockResolvedValue(mockOverview);
  });

  it("renders page header and data overview counts after loading", async () => {
    render(<DataManagementClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("overview-card-accounts").textContent).toContain("3");
    });

    expect(screen.getByText("Data Management & Export")).toBeDefined();
    expect(screen.getByTestId("overview-card-trades").textContent).toContain("25");
    expect(screen.getByTestId("overview-card-executions").textContent).toContain("50");
    expect(screen.getByTestId("overview-card-journalEntries").textContent).toContain("12");
  });

  it("handles overview load error with retry button", async () => {
    vi.mocked(clientModule.fetchDataManagementOverview).mockRejectedValueOnce(
      new Error("Failed to load overview counts")
    );

    render(<DataManagementClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("data-management-load-error").textContent).toContain(
        "Failed to load overview counts"
      );
    });

    // Click retry
    vi.mocked(clientModule.fetchDataManagementOverview).mockResolvedValueOnce(mockOverview);
    fireEvent.click(screen.getByText("Retry"));

    await waitFor(() => {
      expect(screen.getByTestId("overview-card-accounts").textContent).toContain("3");
    });
  });

  it("triggers CSV export for trades and shows success toast", async () => {
    vi.mocked(clientModule.requestExportDownload).mockResolvedValueOnce({
      filename: "tradejournal-trades-2026.csv",
      recordCount: 25,
      data: "Trade ID\r\n1",
      mimeType: "text/csv; charset=utf-8",
    });

    render(<DataManagementClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("export-btn-trades")).toBeDefined();
    });

    const exportTradesBtn = screen.getByTestId("export-btn-trades");
    fireEvent.click(exportTradesBtn);

    await waitFor(() => {
      expect(clientModule.requestExportDownload).toHaveBeenCalledWith({
        dataset: "trades",
        format: "csv",
      });
      expect(clientModule.triggerBrowserDownload).toHaveBeenCalledWith(
        "Trade ID\r\n1",
        "tradejournal-trades-2026.csv",
        "text/csv; charset=utf-8"
      );
      expect(screen.getByTestId("data-management-success-toast").textContent).toContain(
        "tradejournal-trades-2026.csv"
      );
    });
  });

  it("allows switching format to JSON before exporting trades", async () => {
    vi.mocked(clientModule.requestExportDownload).mockResolvedValueOnce({
      filename: "tradejournal-trades-2026.json",
      recordCount: 25,
      data: "[]",
      mimeType: "application/json",
    });

    render(<DataManagementClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("export-card-trades")).toBeDefined();
    });

    // Click JSON format toggle button on trades card
    const jsonBtn = screen.getByLabelText("Select JSON for Trades Export");
    fireEvent.click(jsonBtn);

    // Export button should now say "Download JSON"
    const exportTradesBtn = screen.getByTestId("export-btn-trades");
    expect(exportTradesBtn.textContent).toContain("Download JSON");

    fireEvent.click(exportTradesBtn);

    await waitFor(() => {
      expect(clientModule.requestExportDownload).toHaveBeenCalledWith({
        dataset: "trades",
        format: "json",
      });
    });
  });

  it("handles export failure gracefully and displays alert", async () => {
    vi.mocked(clientModule.requestExportDownload).mockRejectedValueOnce(
      new Error("Network error during export")
    );

    render(<DataManagementClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("export-btn-trades")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("export-btn-trades"));

    await waitFor(() => {
      expect(screen.getByTestId("data-management-export-error").textContent).toContain(
        "Network error during export"
      );
    });
  });

  it("triggers full backup export", async () => {
    vi.mocked(clientModule.requestExportDownload).mockResolvedValueOnce({
      filename: "tradejournal-full-backup-2026.json",
      recordCount: 90,
      data: "{}",
      mimeType: "application/json",
    });

    render(<DataManagementClientPage />);

    await waitFor(() => {
      expect(screen.getByTestId("export-btn-full")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("export-btn-full"));

    await waitFor(() => {
      expect(clientModule.requestExportDownload).toHaveBeenCalledWith({
        dataset: "full",
        format: "json",
      });
    });
  });
});
