import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
} from "@/lib/trading/settings/service";
import { SettingsValidationError } from "@/lib/trading/settings/validation";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/trading/settings/types";

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  userPreference: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  tradingAccount: {
    findFirst: vi.fn(),
  },
  reviewTemplate: {
    findFirst: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

describe("Settings Service — Domain Operations", () => {
  const userId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserPreferences", () => {
    it("creates and returns canonical default preferences if none exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "trader@example.com",
        name: "Test Trader",
      });
      mockPrisma.userPreference.findUnique.mockResolvedValue(null);
      mockPrisma.userPreference.create.mockResolvedValue({
        id: "pref-1",
        userId,
        displayName: "Test Trader",
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
        dashboardLayout: JSON.stringify(DEFAULT_DASHBOARD_LAYOUT),
        defaultDashboardDateRange: "ALL",
        defaultJournalView: "daily",
        defaultReviewStatus: "ALL",
        defaultTemplateId: null,
        defaultImportTimezone: "UTC",
        defaultImportAccountId: null,
        defaultImportRoute: "/import",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });

      const res = await getUserPreferences(userId);
      expect(res.userId).toBe(userId);
      expect(res.timezone).toBe("UTC");
      expect(res.email).toBe("trader@example.com");
      expect(res.dashboardLayout).toHaveLength(DEFAULT_DASHBOARD_LAYOUT.length);
      expect(mockPrisma.userPreference.create).toHaveBeenCalledTimes(1);
    });

    it("returns existing preferences without recreating", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "trader@example.com",
        name: "Test Trader",
      });
      mockPrisma.userPreference.findUnique.mockResolvedValue({
        id: "pref-existing",
        userId,
        displayName: "Custom Trader",
        timezone: "America/New_York",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12H",
        firstDayOfWeek: 1,
        defaultLandingPage: "/trades",
        defaultAccountId: "acc-1",
        defaultTradeSide: "LONG",
        defaultRiskPercent: new Prisma.Decimal("1.50"),
        defaultRiskAmount: new Prisma.Decimal("200.00"),
        preferredQuantityUnit: "shares",
        tableDensity: "compact",
        decimalPlaces: 4,
        pnlDisplayMode: "percentage",
        theme: "dark",
        dashboardLayout: JSON.stringify(DEFAULT_DASHBOARD_LAYOUT),
        defaultDashboardDateRange: "THIS_MONTH",
        defaultJournalView: "calendar",
        defaultReviewStatus: "DRAFT",
        defaultTemplateId: null,
        defaultImportTimezone: "America/New_York",
        defaultImportAccountId: "acc-1",
        defaultImportRoute: "/import/csv",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-02T00:00:00Z"),
      });

      const res = await getUserPreferences(userId);
      expect(res.timezone).toBe("America/New_York");
      expect(res.dateFormat).toBe("DD/MM/YYYY");
      expect(res.defaultAccountId).toBe("acc-1");
      expect(mockPrisma.userPreference.create).not.toHaveBeenCalled();
    });

    it("throws when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(getUserPreferences(userId)).rejects.toThrow(
        SettingsValidationError,
      );
    });
  });

  describe("updateUserPreferences", () => {
    it("updates preferences safely and returns updated DTO", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "trader@example.com",
        name: "Test Trader",
      });
      mockPrisma.tradingAccount.findFirst.mockResolvedValue({ id: "acc-owned" });
      mockPrisma.userPreference.upsert.mockResolvedValue({
        id: "pref-1",
        userId,
        displayName: "Updated Trader",
        timezone: "Europe/London",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24H",
        firstDayOfWeek: 1,
        defaultLandingPage: "/analytics",
        defaultAccountId: "acc-owned",
        defaultTradeSide: "SHORT",
        defaultRiskPercent: new Prisma.Decimal("2.00"),
        defaultRiskAmount: new Prisma.Decimal("500.00"),
        preferredQuantityUnit: "contracts",
        tableDensity: "spacious",
        decimalPlaces: 2,
        pnlDisplayMode: "r_multiple",
        theme: "dark",
        dashboardLayout: JSON.stringify(DEFAULT_DASHBOARD_LAYOUT),
        defaultDashboardDateRange: "LAST_30_DAYS",
        defaultJournalView: "list",
        defaultReviewStatus: "COMPLETED",
        defaultTemplateId: null,
        defaultImportTimezone: "Europe/London",
        defaultImportAccountId: null,
        defaultImportRoute: "/import",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-03T00:00:00Z"),
      });

      const updateInput = {
        timezone: "Europe/London",
        defaultAccountId: "acc-owned",
        defaultRiskPercent: "2.00",
        tableDensity: "spacious" as const,
      };

      const res = await updateUserPreferences(userId, updateInput);
      expect(res.timezone).toBe("Europe/London");
      expect(res.defaultAccountId).toBe("acc-owned");
      expect(mockPrisma.tradingAccount.findFirst).toHaveBeenCalledWith({
        where: { id: "acc-owned", userId },
        select: { id: true },
      });
    });

    it("verifies account ownership and rejects foreign accounts", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "trader@example.com",
        name: "Test Trader",
      });
      // Foreign account returns null for this user
      mockPrisma.tradingAccount.findFirst.mockResolvedValue(null);

      await expect(
        updateUserPreferences(userId, { defaultAccountId: "foreign-account-999" }),
      ).rejects.toThrow(SettingsValidationError);
    });

    it("verifies template ownership and rejects unowned private templates", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "trader@example.com",
        name: "Test Trader",
      });
      mockPrisma.reviewTemplate.findFirst.mockResolvedValue(null);

      await expect(
        updateUserPreferences(userId, { defaultTemplateId: "foreign-template-999" }),
      ).rejects.toThrow(SettingsValidationError);
    });
  });

  describe("resetUserPreferences", () => {
    it("resets preferences to defaults", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "trader@example.com",
        name: "Test Trader",
      });
      mockPrisma.userPreference.upsert.mockResolvedValue({
        id: "pref-1",
        userId,
        displayName: "Test Trader",
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
        dashboardLayout: JSON.stringify(DEFAULT_DASHBOARD_LAYOUT),
        defaultDashboardDateRange: "ALL",
        defaultJournalView: "daily",
        defaultReviewStatus: "ALL",
        defaultTemplateId: null,
        defaultImportTimezone: "UTC",
        defaultImportAccountId: null,
        defaultImportRoute: "/import",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-04T00:00:00Z"),
      });

      const res = await resetUserPreferences(userId, "all");
      expect(res.timezone).toBe("UTC");
      expect(res.tableDensity).toBe("comfortable");
    });
  });
});
