import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, POST, PUT, DELETE } from "@/app/api/settings/route";
import { POST as POST_RESET } from "@/app/api/settings/reset/route";
import * as settingsService from "@/lib/trading/settings/service";
import { SettingsValidationError } from "@/lib/trading/settings/validation";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/trading/settings/types";

const mockAuth = vi.hoisted(() => ({
  userId: null as string | null,
}));

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: async () => {
    if (!mockAuth.userId) {
      throw new Error("Unauthorized: authentication required");
    }
    return mockAuth.userId;
  },
}));

vi.mock("@/lib/trading/settings/service", () => ({
  getUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
  resetUserPreferences: vi.fn(),
}));

describe("Settings API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.userId = "user-abc-123";
  });

  const mockPrefDto = {
    id: "pref-1",
    userId: "user-abc-123",
    displayName: "Trader",
    email: "trader@test.com",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD" as const,
    timeFormat: "24H" as const,
    firstDayOfWeek: 0 as const,
    defaultLandingPage: "/dashboard" as const,
    defaultAccountId: null,
    defaultTradeSide: null,
    defaultRiskPercent: null,
    defaultRiskAmount: null,
    preferredQuantityUnit: "lots" as const,
    tableDensity: "comfortable" as const,
    decimalPlaces: 2,
    pnlDisplayMode: "currency" as const,
    theme: "dark" as const,
    dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
    defaultDashboardDateRange: "ALL" as const,
    defaultJournalView: "daily" as const,
    defaultReviewStatus: "ALL" as const,
    defaultTemplateId: null,
    defaultImportTimezone: "UTC",
    defaultImportAccountId: null,
    defaultImportRoute: "/import" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  describe("GET /api/settings", () => {
    it("returns 200 with preferences and no-store header when authenticated", async () => {
      vi.mocked(settingsService.getUserPreferences).mockResolvedValue(mockPrefDto);

      const res = await GET();
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const json = await res.json();
      expect(json.data.timezone).toBe("UTC");
      expect(settingsService.getUserPreferences).toHaveBeenCalledWith("user-abc-123");
    });

    it("returns 401 when unauthenticated", async () => {
      mockAuth.userId = null;

      const res = await GET();
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("AUTH_REQUIRED");
    });
  });

  describe("PATCH /api/settings", () => {
    it("updates preferences and returns 200 with no-store header", async () => {
      const updatedDto = { ...mockPrefDto, timezone: "America/New_York" };
      vi.mocked(settingsService.updateUserPreferences).mockResolvedValue(updatedDto);

      const req = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ timezone: "America/New_York" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const json = await res.json();
      expect(json.data.timezone).toBe("America/New_York");
    });

    it("returns 400 when validation fails", async () => {
      vi.mocked(settingsService.updateUserPreferences).mockRejectedValue(
        new SettingsValidationError("Invalid timezone", { timezone: "Invalid" }),
      );

      const req = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ timezone: "Mars/Invalid" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details.timezone).toBe("Invalid");
    });

    it("returns 401 when unauthenticated", async () => {
      mockAuth.userId = null;

      const req = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ timezone: "UTC" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when JSON body is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: "{invalid-json",
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INVALID_JSON");
    });
  });

  describe("HTTP Method Not Allowed (405)", () => {
    it("returns 405 with Allow header for unsupported methods", async () => {
      const postRes = await POST();
      expect(postRes.status).toBe(405);
      expect(postRes.headers.get("Allow")).toContain("GET, PATCH");

      const putRes = await PUT();
      expect(putRes.status).toBe(405);

      const delRes = await DELETE();
      expect(delRes.status).toBe(405);
    });
  });

  describe("POST /api/settings/reset", () => {
    it("resets preferences and returns 200 with no-store header", async () => {
      vi.mocked(settingsService.resetUserPreferences).mockResolvedValue(mockPrefDto);

      const req = new NextRequest("http://localhost:3000/api/settings/reset", {
        method: "POST",
        body: JSON.stringify({ category: "all" }),
      });

      const res = await POST_RESET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(settingsService.resetUserPreferences).toHaveBeenCalledWith(
        "user-abc-123",
        "all",
      );
    });
  });
});
