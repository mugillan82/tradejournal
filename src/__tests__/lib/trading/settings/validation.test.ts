import { describe, it, expect } from "vitest";
import {
  isValidTimezone,
  validateDashboardLayout,
  validateUpdatePreferencesInput,
  validateResetCategory,
  SettingsValidationError,
} from "@/lib/trading/settings/validation";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  ALLOWED_DASHBOARD_WIDGET_IDS,
} from "@/lib/trading/settings/types";

describe("Settings Validation — Domain Logic", () => {
  describe("Timezone Validation", () => {
    it("accepts valid IANA timezones", () => {
      expect(isValidTimezone("UTC")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("Europe/London")).toBe(true);
      expect(isValidTimezone("Asia/Tokyo")).toBe(true);
      expect(isValidTimezone("Australia/Sydney")).toBe(true);
    });

    it("rejects invalid timezones", () => {
      expect(isValidTimezone("")).toBe(false);
      expect(isValidTimezone("Mars/Olympus_Mons")).toBe(false);
      expect(isValidTimezone("Invalid/TZ")).toBe(false);
      expect(isValidTimezone(null as unknown as string)).toBe(false);
    });
  });

  describe("Dashboard Layout Validation", () => {
    it("accepts the canonical default dashboard layout", () => {
      const result = validateDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
      expect(result).toHaveLength(DEFAULT_DASHBOARD_LAYOUT.length);
      expect(result[0]!.id).toBe("performance-hero");
    });

    it("rejects non-array inputs", () => {
      expect(() => validateDashboardLayout("not an array")).toThrow(
        SettingsValidationError,
      );
      expect(() => validateDashboardLayout({})).toThrow(SettingsValidationError);
    });

    it("rejects unknown widget IDs not in the allowlist", () => {
      const maliciousLayout = [
        { id: "hacked-widget", visible: true, order: 0, label: "Hacked" },
      ];
      expect(() => validateDashboardLayout(maliciousLayout)).toThrow(
        SettingsValidationError,
      );
    });

    it("rejects duplicate widget IDs", () => {
      const duplicateLayout = [
        { id: "performance-hero", visible: true, order: 0, label: "Hero 1" },
        { id: "performance-hero", visible: true, order: 1, label: "Hero 2" },
      ];
      expect(() => validateDashboardLayout(duplicateLayout)).toThrow(
        SettingsValidationError,
      );
    });

    it("rejects non-boolean visibility or negative order", () => {
      expect(() =>
        validateDashboardLayout([
          { id: "performance-hero", visible: "yes", order: 0, label: "Hero" },
        ]),
      ).toThrow(SettingsValidationError);

      expect(() =>
        validateDashboardLayout([
          { id: "performance-hero", visible: true, order: -1, label: "Hero" },
        ]),
      ).toThrow(SettingsValidationError);
    });

    it("automatically appends missing allowed widgets to preserve complete layout", () => {
      const partial = [
        { id: "recent-trades", visible: true, order: 0, label: "Recent Trades" },
      ];
      const result = validateDashboardLayout(partial);
      expect(result).toHaveLength(ALLOWED_DASHBOARD_WIDGET_IDS.length);
      expect(result[0]!.id).toBe("recent-trades");
      // All other allowed widgets are appended
      const ids = result.map((w) => w.id);
      for (const id of ALLOWED_DASHBOARD_WIDGET_IDS) {
        expect(ids).toContain(id);
      }
    });
  });

  describe("Update Preferences Input Validation", () => {
    it("validates valid partial updates", () => {
      const valid = {
        timezone: "America/New_York",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12H",
        firstDayOfWeek: 1,
        tableDensity: "compact",
        decimalPlaces: 4,
        pnlDisplayMode: "r_multiple",
        theme: "dark",
        preferredQuantityUnit: "contracts",
        defaultLandingPage: "/trades",
        defaultRiskPercent: "1.50",
        defaultRiskAmount: "250.00",
      };

      const res = validateUpdatePreferencesInput(valid);
      expect(res.timezone).toBe("America/New_York");
      expect(res.dateFormat).toBe("DD/MM/YYYY");
      expect(res.timeFormat).toBe("12H");
      expect(res.firstDayOfWeek).toBe(1);
      expect(res.tableDensity).toBe("compact");
      expect(res.decimalPlaces).toBe(4);
      expect(res.pnlDisplayMode).toBe("r_multiple");
      expect(res.preferredQuantityUnit).toBe("contracts");
      expect(res.defaultLandingPage).toBe("/trades");
      expect(res.defaultRiskPercent).toBe("1.50");
      expect(res.defaultRiskAmount).toBe("250.00");
    });

    it("rejects unknown or client-injected fields (e.g. userId, id, role)", () => {
      const injected = {
        userId: "foreign-user-id",
        role: "admin",
        theme: "dark",
      };
      expect(() => validateUpdatePreferencesInput(injected)).toThrow(
        SettingsValidationError,
      );
    });

    it("rejects invalid enum values", () => {
      expect(() =>
        validateUpdatePreferencesInput({ dateFormat: "INVALID_DATE_FORMAT" }),
      ).toThrow(SettingsValidationError);

      expect(() =>
        validateUpdatePreferencesInput({ timeFormat: "INVALID_TIME" }),
      ).toThrow(SettingsValidationError);

      expect(() =>
        validateUpdatePreferencesInput({ tableDensity: "ultra-huge" }),
      ).toThrow(SettingsValidationError);

      expect(() =>
        validateUpdatePreferencesInput({ pnlDisplayMode: "bitcoins" }),
      ).toThrow(SettingsValidationError);

      expect(() =>
        validateUpdatePreferencesInput({ decimalPlaces: 99 }),
      ).toThrow(SettingsValidationError);
    });

    it("sanitizes and bounds displayName", () => {
      const normal = validateUpdatePreferencesInput({ displayName: "  Trader Pro  " });
      expect(normal.displayName).toBe("Trader Pro");

      const empty = validateUpdatePreferencesInput({ displayName: "   " });
      expect(empty.displayName).toBe(null);

      const tooLong = "a".repeat(101);
      expect(() => validateUpdatePreferencesInput({ displayName: tooLong })).toThrow(
        SettingsValidationError,
      );
    });
  });

  describe("Reset Category Validation", () => {
    it("accepts valid categories", () => {
      expect(validateResetCategory("all")).toBe("all");
      expect(validateResetCategory("general")).toBe("general");
      expect(validateResetCategory("trading")).toBe("trading");
      expect(validateResetCategory("display")).toBe("display");
      expect(validateResetCategory("dashboard")).toBe("dashboard");
      expect(validateResetCategory("journal")).toBe("journal");
      expect(validateResetCategory("imports")).toBe("imports");
      expect(validateResetCategory(undefined)).toBe("all");
    });

    it("rejects invalid categories", () => {
      expect(() => validateResetCategory("invalid_category")).toThrow(
        SettingsValidationError,
      );
    });
  });
});
