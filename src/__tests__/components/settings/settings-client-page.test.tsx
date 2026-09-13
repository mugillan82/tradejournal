// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsClientPage } from "@/components/settings/settings-client-page";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { DEFAULT_DASHBOARD_LAYOUT, type UserPreferencesDto } from "@/lib/trading/settings/types";
import * as clientSettings from "@/lib/client/settings";

vi.mock("@/lib/client/settings", () => ({
  fetchSettingsClient: vi.fn(),
  updateSettingsClient: vi.fn(),
  resetSettingsClient: vi.fn(),
  SettingsClientApiError: class extends Error {
    constructor(
      msg: string,
      public statusCode: number,
      public code?: string,
      public fieldErrors?: Record<string, string>,
    ) {
      super(msg);
    }
  },
}));

const mockInitialPreferences: UserPreferencesDto = {
  id: "pref-1",
  userId: "user-1",
  displayName: "Alex Trader",
  email: "alex@example.com",
  timezone: "UTC",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "24H",
  firstDayOfWeek: 0,
  defaultLandingPage: "/dashboard",
  defaultAccountId: null,
  defaultTradeSide: null,
  defaultRiskPercent: "1.00",
  defaultRiskAmount: "100.00",
  preferredQuantityUnit: "lots",
  tableDensity: "comfortable",
  decimalPlaces: 2,
  pnlDisplayMode: "currency",
  theme: "dark",
  dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
  defaultDashboardDateRange: "ALL",
  defaultJournalView: "daily",
  defaultReviewStatus: "ALL",
  defaultTemplateId: null,
  defaultImportTimezone: "UTC",
  defaultImportAccountId: null,
  defaultImportRoute: "/import",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("SettingsClientPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "acc-1", name: "Apex Prop", currency: "USD" }],
      }),
    } as Response);
  });

  it("renders page header and navigation tabs", async () => {
    render(
      <SettingsProvider initialPreferences={mockInitialPreferences}>
        <SettingsClientPage />
      </SettingsProvider>,
    );

    expect(
      screen.getByText("Product Settings & Customization"),
    ).toBeDefined();
    expect(screen.getByText("Profile & General")).toBeDefined();
    expect(screen.getByText("Trading Defaults")).toBeDefined();
    expect(screen.getByText("Display & Format")).toBeDefined();
    expect(screen.getByText("Dashboard Layout")).toBeDefined();
    expect(screen.getByText("Journal & Reviews")).toBeDefined();
    expect(screen.getByText("Import Defaults")).toBeDefined();
    expect(screen.getByText("Data & Reset")).toBeDefined();
  });

  it("switches tabs when clicked", async () => {
    render(
      <SettingsProvider initialPreferences={mockInitialPreferences}>
        <SettingsClientPage />
      </SettingsProvider>,
    );

    // Switch to Trading tab
    fireEvent.click(screen.getByText("Trading Defaults"));
    expect(screen.getByText("Trading Defaults & Risk Rules")).toBeDefined();

    // Switch to Display tab
    fireEvent.click(screen.getByText("Display & Format"));
    expect(screen.getByText("Display & Formatting")).toBeDefined();

    // Switch to Dashboard Layout tab
    fireEvent.click(screen.getByText("Dashboard Layout"));
    expect(screen.getByText("Dashboard Layout & Widget Organization")).toBeDefined();
  });

  it("shows unsaved changes bar when an input changes and can discard", async () => {
    render(
      <SettingsProvider initialPreferences={mockInitialPreferences}>
        <SettingsClientPage />
      </SettingsProvider>,
    );

    const displayNameInput = screen.getByLabelText("Display Name") as HTMLInputElement;
    fireEvent.change(displayNameInput, { target: { value: "New Trader Name" } });

    // Unsaved changes bar should appear
    expect(screen.getByText("You have unsaved changes")).toBeDefined();

    // Discard changes
    const discardBtn = screen.getByText("Discard");
    fireEvent.click(discardBtn);

    expect(displayNameInput.value).toBe("Alex Trader");
    expect(screen.queryByText("You have unsaved changes")).toBeNull();
  });

  it("submits changes and displays success feedback", async () => {
    vi.mocked(clientSettings.updateSettingsClient).mockResolvedValue({
      ...mockInitialPreferences,
      displayName: "Saved Trader",
    });

    render(
      <SettingsProvider initialPreferences={mockInitialPreferences}>
        <SettingsClientPage />
      </SettingsProvider>,
    );

    const displayNameInput = screen.getByLabelText("Display Name");
    fireEvent.change(displayNameInput, { target: { value: "Saved Trader" } });

    const saveBtn = screen.getByText("Save Changes");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Preferences saved successfully!")).toBeDefined();
    });
  });
});
