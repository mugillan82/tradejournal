// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardCustomizeModal } from "@/components/dashboard/dashboard-customize-modal";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { DEFAULT_DASHBOARD_LAYOUT, type UserPreferencesDto } from "@/lib/trading/settings/types";
import * as clientSettings from "@/lib/client/settings";

vi.mock("@/lib/client/settings", () => ({
  fetchSettingsClient: vi.fn(),
  updateSettingsClient: vi.fn(),
  resetSettingsClient: vi.fn(),
  SettingsClientApiError: class extends Error {},
}));

const mockPreferences: UserPreferencesDto = {
  id: "pref-1",
  userId: "user-1",
  displayName: "Trader",
  email: "trader@test.com",
  timezone: "UTC",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "24H",
  firstDayOfWeek: 0,
  defaultLandingPage: "/dashboard",
  defaultAccountId: null,
  defaultTradeSide: null,
  defaultRiskPercent: null,
  defaultRiskAmount: null,
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

describe("DashboardCustomizeModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open and lists all layout widgets", () => {
    render(
      <SettingsProvider initialPreferences={mockPreferences}>
        <DashboardCustomizeModal isOpen={true} onClose={() => {}} />
      </SettingsProvider>,
    );

    expect(screen.getByText("Customize Dashboard Layout")).toBeDefined();
    expect(screen.getByText("Performance Overview")).toBeDefined();
    expect(screen.getByText("Recent Trades")).toBeDefined();
    expect(screen.getByText("Trading Accounts")).toBeDefined();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <SettingsProvider initialPreferences={mockPreferences}>
        <DashboardCustomizeModal isOpen={false} onClose={() => {}} />
      </SettingsProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("toggles widget visibility checkbox", () => {
    render(
      <SettingsProvider initialPreferences={mockPreferences}>
        <DashboardCustomizeModal isOpen={true} onClose={() => {}} />
      </SettingsProvider>,
    );

    const checkbox = screen.getByLabelText("Performance Overview") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("saves layout when Save Layout is clicked", async () => {
    vi.mocked(clientSettings.updateSettingsClient).mockResolvedValue(mockPreferences);
    const handleClose = vi.fn();

    render(
      <SettingsProvider initialPreferences={mockPreferences}>
        <DashboardCustomizeModal isOpen={true} onClose={handleClose} />
      </SettingsProvider>,
    );

    const saveBtn = screen.getByText("Save Layout");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(clientSettings.updateSettingsClient).toHaveBeenCalled();
    });
  });
});
