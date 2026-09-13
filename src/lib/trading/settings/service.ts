/**
 * Settings & User Preferences Domain — Server-Side Service
 *
 * Provides user-scoped persistence, default initialization,
 * strict validation, foreign key ownership verification, and layout persistence.
 */

import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  type UserPreferencesDto,
  type DashboardWidgetConfig,
  type UpdatePreferencesInput,
  type ResetPreferencesCategory,
} from "./types";
import {
  SettingsValidationError,
  validateUpdatePreferencesInput,
  validateResetCategory,
} from "./validation";

function serializePreferences(
  record: {
    id: string;
    userId: string;
    displayName: string | null;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    firstDayOfWeek: number;
    defaultLandingPage: string;
    defaultAccountId: string | null;
    defaultTradeSide: string | null;
    defaultRiskPercent: Prisma.Decimal | null;
    defaultRiskAmount: Prisma.Decimal | null;
    preferredQuantityUnit: string;
    tableDensity: string;
    decimalPlaces: number;
    pnlDisplayMode: string;
    theme: string;
    dashboardLayout: string | null;
    defaultDashboardDateRange: string;
    defaultJournalView: string;
    defaultReviewStatus: string;
    defaultTemplateId: string | null;
    defaultImportTimezone: string;
    defaultImportAccountId: string | null;
    defaultImportRoute: string;
    createdAt: Date;
    updatedAt: Date;
  },
  userEmail?: string | null,
): UserPreferencesDto {
  let parsedLayout: DashboardWidgetConfig[] = DEFAULT_DASHBOARD_LAYOUT;
  if (record.dashboardLayout) {
    try {
      const parsed = JSON.parse(record.dashboardLayout);
      if (Array.isArray(parsed)) {
        parsedLayout = parsed;
      }
    } catch {
      parsedLayout = DEFAULT_DASHBOARD_LAYOUT;
    }
  }

  return {
    id: record.id,
    userId: record.userId,
    displayName: record.displayName,
    email: userEmail ?? null,

    // General
    timezone: record.timezone,
    dateFormat: record.dateFormat as UserPreferencesDto["dateFormat"],
    timeFormat: record.timeFormat as UserPreferencesDto["timeFormat"],
    firstDayOfWeek: record.firstDayOfWeek as UserPreferencesDto["firstDayOfWeek"],
    defaultLandingPage: record.defaultLandingPage as UserPreferencesDto["defaultLandingPage"],

    // Trading Defaults
    defaultAccountId: record.defaultAccountId,
    defaultTradeSide: record.defaultTradeSide as UserPreferencesDto["defaultTradeSide"],
    defaultRiskPercent: record.defaultRiskPercent ? record.defaultRiskPercent.toString() : null,
    defaultRiskAmount: record.defaultRiskAmount ? record.defaultRiskAmount.toString() : null,
    preferredQuantityUnit: record.preferredQuantityUnit as UserPreferencesDto["preferredQuantityUnit"],

    // Display
    tableDensity: record.tableDensity as UserPreferencesDto["tableDensity"],
    decimalPlaces: record.decimalPlaces,
    pnlDisplayMode: record.pnlDisplayMode as UserPreferencesDto["pnlDisplayMode"],
    theme: record.theme as UserPreferencesDto["theme"],

    // Dashboard
    dashboardLayout: parsedLayout,
    defaultDashboardDateRange: record.defaultDashboardDateRange as UserPreferencesDto["defaultDashboardDateRange"],

    // Journal & Reviews
    defaultJournalView: record.defaultJournalView as UserPreferencesDto["defaultJournalView"],
    defaultReviewStatus: record.defaultReviewStatus as UserPreferencesDto["defaultReviewStatus"],
    defaultTemplateId: record.defaultTemplateId,

    // Imports
    defaultImportTimezone: record.defaultImportTimezone,
    defaultImportAccountId: record.defaultImportAccountId,
    defaultImportRoute: record.defaultImportRoute as UserPreferencesDto["defaultImportRoute"],

    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Retrieves the preferences for an authenticated user.
 * Automatically initializes canonical defaults in the database if none exist.
 */
export async function getUserPreferences(
  userId: string,
): Promise<UserPreferencesDto> {
  if (!userId || typeof userId !== "string") {
    throw new SettingsValidationError("User ID is required");
  }

  const [user, existing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    }),
    prisma.userPreference.findUnique({
      where: { userId },
    }),
  ]);

  if (!user) {
    throw new SettingsValidationError("User not found", { userId: "Unknown user" });
  }

  if (existing) {
    return serializePreferences(existing, user.email);
  }

  // Atomically create default preferences for the user
  const created = await prisma.userPreference.create({
    data: {
      userId,
      displayName: user.name,
      timezone: "UTC",
      dateFormat: "YYYY-MM-DD",
      timeFormat: "24H",
      firstDayOfWeek: 0,
      defaultLandingPage: "/dashboard",
      tableDensity: "comfortable",
      decimalPlaces: 2,
      pnlDisplayMode: "currency",
      theme: "dark",
      dashboardLayout: JSON.stringify(DEFAULT_DASHBOARD_LAYOUT),
      defaultDashboardDateRange: "ALL",
      defaultJournalView: "daily",
      defaultReviewStatus: "ALL",
      preferredQuantityUnit: "lots",
      defaultImportTimezone: "UTC",
      defaultImportRoute: "/import",
    },
  });

  return serializePreferences(created, user.email);
}

/**
 * Updates preferences for an authenticated user.
 * Strictly validates inputs, verifies ownership of referenced accounts and templates,
 * and updates only allowed fields.
 */
export async function updateUserPreferences(
  userId: string,
  rawInput: unknown,
): Promise<UserPreferencesDto> {
  if (!userId || typeof userId !== "string") {
    throw new SettingsValidationError("User ID is required");
  }

  const validated: UpdatePreferencesInput = validateUpdatePreferencesInput(rawInput);

  // 1. Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    throw new SettingsValidationError("User not found", { userId: "Unknown user" });
  }

  // 2. Verify account ownership if defaultAccountId is passed
  if (validated.defaultAccountId) {
    const account = await prisma.tradingAccount.findFirst({
      where: { id: validated.defaultAccountId, userId },
      select: { id: true },
    });
    if (!account) {
      throw new SettingsValidationError(
        "Default trading account not found or access denied",
        { defaultAccountId: "Account not found or access denied" },
      );
    }
  }

  // 3. Verify account ownership if defaultImportAccountId is passed
  if (validated.defaultImportAccountId) {
    const account = await prisma.tradingAccount.findFirst({
      where: { id: validated.defaultImportAccountId, userId },
      select: { id: true },
    });
    if (!account) {
      throw new SettingsValidationError(
        "Default import trading account not found or access denied",
        { defaultImportAccountId: "Account not found or access denied" },
      );
    }
  }

  // 4. Verify template ownership or global template if defaultTemplateId is passed
  if (validated.defaultTemplateId) {
    const template = await prisma.reviewTemplate.findFirst({
      where: {
        id: validated.defaultTemplateId,
        OR: [{ userId }, { userId: null }],
      },
      select: { id: true },
    });
    if (!template) {
      throw new SettingsValidationError(
        "Default review template not found or access denied",
        { defaultTemplateId: "Template not found or access denied" },
      );
    }
  }

  // 5. Update user display name in User record if provided
  if ("displayName" in validated) {
    await prisma.user.update({
      where: { id: userId },
      data: { name: validated.displayName },
    });
  }

  // 6. Build database update payload
  const updateData: Prisma.UserPreferenceUpdateInput = {};
  if ("displayName" in validated) updateData.displayName = validated.displayName;
  if ("timezone" in validated && validated.timezone) updateData.timezone = validated.timezone;
  if ("dateFormat" in validated && validated.dateFormat) updateData.dateFormat = validated.dateFormat;
  if ("timeFormat" in validated && validated.timeFormat) updateData.timeFormat = validated.timeFormat;
  if ("firstDayOfWeek" in validated && validated.firstDayOfWeek !== undefined) updateData.firstDayOfWeek = validated.firstDayOfWeek;
  if ("defaultLandingPage" in validated && validated.defaultLandingPage) updateData.defaultLandingPage = validated.defaultLandingPage;
  if ("defaultAccountId" in validated) updateData.defaultAccountId = validated.defaultAccountId;
  if ("defaultTradeSide" in validated) updateData.defaultTradeSide = validated.defaultTradeSide;
  if ("defaultRiskPercent" in validated) {
    updateData.defaultRiskPercent =
      validated.defaultRiskPercent !== null && validated.defaultRiskPercent !== undefined
        ? new Prisma.Decimal(validated.defaultRiskPercent)
        : null;
  }
  if ("defaultRiskAmount" in validated) {
    updateData.defaultRiskAmount =
      validated.defaultRiskAmount !== null && validated.defaultRiskAmount !== undefined
        ? new Prisma.Decimal(validated.defaultRiskAmount)
        : null;
  }
  if ("preferredQuantityUnit" in validated && validated.preferredQuantityUnit) {
    updateData.preferredQuantityUnit = validated.preferredQuantityUnit;
  }
  if ("tableDensity" in validated && validated.tableDensity) updateData.tableDensity = validated.tableDensity;
  if ("decimalPlaces" in validated && validated.decimalPlaces !== undefined) updateData.decimalPlaces = validated.decimalPlaces;
  if ("pnlDisplayMode" in validated && validated.pnlDisplayMode) updateData.pnlDisplayMode = validated.pnlDisplayMode;
  if ("theme" in validated && validated.theme) updateData.theme = validated.theme;
  if ("dashboardLayout" in validated && validated.dashboardLayout) {
    updateData.dashboardLayout = JSON.stringify(validated.dashboardLayout);
  }
  if ("defaultDashboardDateRange" in validated && validated.defaultDashboardDateRange) {
    updateData.defaultDashboardDateRange = validated.defaultDashboardDateRange;
  }
  if ("defaultJournalView" in validated && validated.defaultJournalView) updateData.defaultJournalView = validated.defaultJournalView;
  if ("defaultReviewStatus" in validated && validated.defaultReviewStatus) updateData.defaultReviewStatus = validated.defaultReviewStatus;
  if ("defaultTemplateId" in validated) updateData.defaultTemplateId = validated.defaultTemplateId;
  if ("defaultImportTimezone" in validated && validated.defaultImportTimezone) updateData.defaultImportTimezone = validated.defaultImportTimezone;
  if ("defaultImportAccountId" in validated) updateData.defaultImportAccountId = validated.defaultImportAccountId;
  if ("defaultImportRoute" in validated && validated.defaultImportRoute) updateData.defaultImportRoute = validated.defaultImportRoute;

  const updated = await prisma.userPreference.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      displayName: validated.displayName ?? user.name,
      timezone: validated.timezone ?? "UTC",
      dateFormat: validated.dateFormat ?? "YYYY-MM-DD",
      timeFormat: validated.timeFormat ?? "24H",
      firstDayOfWeek: validated.firstDayOfWeek ?? 0,
      defaultLandingPage: validated.defaultLandingPage ?? "/dashboard",
      defaultAccountId: validated.defaultAccountId ?? null,
      defaultTradeSide: validated.defaultTradeSide ?? null,
      defaultRiskPercent:
        validated.defaultRiskPercent !== null && validated.defaultRiskPercent !== undefined
          ? new Prisma.Decimal(validated.defaultRiskPercent)
          : null,
      defaultRiskAmount:
        validated.defaultRiskAmount !== null && validated.defaultRiskAmount !== undefined
          ? new Prisma.Decimal(validated.defaultRiskAmount)
          : null,
      preferredQuantityUnit: validated.preferredQuantityUnit ?? "lots",
      tableDensity: validated.tableDensity ?? "comfortable",
      decimalPlaces: validated.decimalPlaces ?? 2,
      pnlDisplayMode: validated.pnlDisplayMode ?? "currency",
      theme: validated.theme ?? "dark",
      dashboardLayout: validated.dashboardLayout ? JSON.stringify(validated.dashboardLayout) : JSON.stringify(DEFAULT_DASHBOARD_LAYOUT),
      defaultDashboardDateRange: validated.defaultDashboardDateRange ?? "ALL",
      defaultJournalView: validated.defaultJournalView ?? "daily",
      defaultReviewStatus: validated.defaultReviewStatus ?? "ALL",
      defaultTemplateId: validated.defaultTemplateId ?? null,
      defaultImportTimezone: validated.defaultImportTimezone ?? "UTC",
      defaultImportAccountId: validated.defaultImportAccountId ?? null,
      defaultImportRoute: validated.defaultImportRoute ?? "/import",
    },
  });

  return serializePreferences(updated, user.email);
}

/**
 * Resets user preferences back to canonical system defaults.
 * Supports resetting all categories or a specific category.
 */
export async function resetUserPreferences(
  userId: string,
  rawCategory?: unknown,
): Promise<UserPreferencesDto> {
  if (!userId || typeof userId !== "string") {
    throw new SettingsValidationError("User ID is required");
  }

  const category: ResetPreferencesCategory = validateResetCategory(rawCategory);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    throw new SettingsValidationError("User not found", { userId: "Unknown user" });
  }

  const updateData: Prisma.UserPreferenceUpdateInput = {};

  if (category === "all" || category === "general") {
    updateData.timezone = "UTC";
    updateData.dateFormat = "YYYY-MM-DD";
    updateData.timeFormat = "24H";
    updateData.firstDayOfWeek = 0;
    updateData.defaultLandingPage = "/dashboard";
  }

  if (category === "all" || category === "trading") {
    updateData.defaultAccountId = null;
    updateData.defaultTradeSide = null;
    updateData.defaultRiskPercent = null;
    updateData.defaultRiskAmount = null;
    updateData.preferredQuantityUnit = "lots";
  }

  if (category === "all" || category === "display") {
    updateData.tableDensity = "comfortable";
    updateData.decimalPlaces = 2;
    updateData.pnlDisplayMode = "currency";
    updateData.theme = "dark";
  }

  if (category === "all" || category === "dashboard") {
    updateData.dashboardLayout = JSON.stringify(DEFAULT_DASHBOARD_LAYOUT);
    updateData.defaultDashboardDateRange = "ALL";
  }

  if (category === "all" || category === "journal") {
    updateData.defaultJournalView = "daily";
    updateData.defaultReviewStatus = "ALL";
    updateData.defaultTemplateId = null;
  }

  if (category === "all" || category === "imports") {
    updateData.defaultImportTimezone = "UTC";
    updateData.defaultImportAccountId = null;
    updateData.defaultImportRoute = "/import";
  }

  const updated = await prisma.userPreference.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      displayName: user.name,
      timezone: "UTC",
      dateFormat: "YYYY-MM-DD",
      timeFormat: "24H",
      firstDayOfWeek: 0,
      defaultLandingPage: "/dashboard",
      tableDensity: "comfortable",
      decimalPlaces: 2,
      pnlDisplayMode: "currency",
      theme: "dark",
      dashboardLayout: JSON.stringify(DEFAULT_DASHBOARD_LAYOUT),
      defaultDashboardDateRange: "ALL",
      defaultJournalView: "daily",
      defaultReviewStatus: "ALL",
      preferredQuantityUnit: "lots",
      defaultImportTimezone: "UTC",
      defaultImportRoute: "/import",
    },
  });

  return serializePreferences(updated, user.email);
}
