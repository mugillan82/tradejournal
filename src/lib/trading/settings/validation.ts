/**
 * Settings & User Preferences Domain — Input Validation & Layout Checks
 */

import {
  ALLOWED_DASHBOARD_WIDGET_IDS,
  ALLOWED_DATE_FORMATS,
  ALLOWED_TIME_FORMATS,
  ALLOWED_FIRST_DAY_OF_WEEK,
  ALLOWED_TABLE_DENSITIES,
  ALLOWED_PNL_MODES,
  ALLOWED_THEMES,
  ALLOWED_QUANTITY_UNITS,
  ALLOWED_LANDING_PAGES,
  ALLOWED_JOURNAL_VIEWS,
  ALLOWED_REVIEW_STATUSES,
  ALLOWED_DASHBOARD_DATE_RANGES,
  ALLOWED_IMPORT_ROUTES,
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardWidgetConfig,
  type UpdatePreferencesInput,
  type ResetPreferencesCategory,
} from "./types";

export class SettingsValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

/**
 * Validates whether a given timezone string is a valid IANA timezone identifier.
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string" || tz.trim().length === 0) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and normalizes dashboard layout widget configuration array.
 */
export function validateDashboardLayout(
  layout: unknown,
): DashboardWidgetConfig[] {
  if (!Array.isArray(layout)) {
    throw new SettingsValidationError(
      "Dashboard layout must be an array of widget configurations",
      { dashboardLayout: "Must be an array" },
    );
  }

  const seenIds = new Set<string>();
  const normalizedWidgets: DashboardWidgetConfig[] = [];

  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    if (!item || typeof item !== "object") {
      throw new SettingsValidationError(
        `Invalid widget configuration at index ${i}`,
        { dashboardLayout: `Item at index ${i} is not an object` },
      );
    }

    const { id, visible, order, label } = item as Record<string, unknown>;

    if (
      typeof id !== "string" ||
      !(ALLOWED_DASHBOARD_WIDGET_IDS as readonly string[]).includes(id)
    ) {
      throw new SettingsValidationError(
        `Invalid or unsupported widget ID: '${String(id)}'`,
        { dashboardLayout: `Unsupported widget ID '${String(id)}'` },
      );
    }

    if (seenIds.has(id)) {
      throw new SettingsValidationError(
        `Duplicate widget ID in layout: '${id}'`,
        { dashboardLayout: `Duplicate widget '${id}'` },
      );
    }
    seenIds.add(id);

    if (typeof visible !== "boolean") {
      throw new SettingsValidationError(
        `Widget '${id}' visibility must be a boolean`,
        { dashboardLayout: `Widget '${id}' visibility must be a boolean` },
      );
    }

    if (typeof order !== "number" || !Number.isInteger(order) || order < 0) {
      throw new SettingsValidationError(
        `Widget '${id}' order must be a non-negative integer`,
        { dashboardLayout: `Widget '${id}' order must be a non-negative integer` },
      );
    }

    const defaultMatch = DEFAULT_DASHBOARD_LAYOUT.find((d) => d.id === id);
    const resolvedLabel =
      typeof label === "string" && label.trim().length > 0
        ? label.trim()
        : defaultMatch?.label ?? id;

    normalizedWidgets.push({
      id: id as (typeof ALLOWED_DASHBOARD_WIDGET_IDS)[number],
      visible,
      order,
      label: resolvedLabel,
    });
  }

  // Ensure all allowed widgets are present in the configuration
  for (const def of DEFAULT_DASHBOARD_LAYOUT) {
    if (!seenIds.has(def.id)) {
      normalizedWidgets.push({
        id: def.id,
        visible: def.visible,
        order: normalizedWidgets.length,
        label: def.label,
      });
    }
  }

  // Sort by order ascending
  normalizedWidgets.sort((a, b) => a.order - b.order);

  // Normalize order index to sequential 0..N-1
  return normalizedWidgets.map((w, index) => ({
    ...w,
    order: index,
  }));
}

const ALLOWED_UPDATE_FIELDS = new Set([
  "displayName",
  "timezone",
  "dateFormat",
  "timeFormat",
  "firstDayOfWeek",
  "defaultLandingPage",
  "defaultAccountId",
  "defaultTradeSide",
  "defaultRiskPercent",
  "defaultRiskAmount",
  "preferredQuantityUnit",
  "tableDensity",
  "decimalPlaces",
  "pnlDisplayMode",
  "theme",
  "dashboardLayout",
  "defaultDashboardDateRange",
  "defaultJournalView",
  "defaultReviewStatus",
  "defaultTemplateId",
  "defaultImportTimezone",
  "defaultImportAccountId",
  "defaultImportRoute",
]);

/**
 * Validates client partial update payload for User Preferences.
 * Strictly rejects unknown fields, client-injected userId, or invalid enum values.
 */
export function validateUpdatePreferencesInput(
  raw: unknown,
): UpdatePreferencesInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SettingsValidationError("Update payload must be an object", {
      body: "Expected a JSON object",
    });
  }

  const input = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Reject unknown fields
  for (const key of Object.keys(input)) {
    if (!ALLOWED_UPDATE_FIELDS.has(key)) {
      errors[key] = `Unknown or forbidden field '${key}'`;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new SettingsValidationError(
      "Payload contains unknown or forbidden fields",
      errors,
    );
  }

  const result: UpdatePreferencesInput = {};

  // Profile & General
  if ("displayName" in input) {
    if (input.displayName === null || input.displayName === undefined) {
      result.displayName = null;
    } else if (typeof input.displayName !== "string") {
      errors.displayName = "Display name must be a string or null";
    } else {
      const trimmed = input.displayName.trim();
      if (trimmed.length > 100) {
        errors.displayName = "Display name cannot exceed 100 characters";
      } else {
        result.displayName = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  if ("timezone" in input) {
    if (typeof input.timezone !== "string" || !isValidTimezone(input.timezone)) {
      errors.timezone = `Invalid IANA timezone: '${String(input.timezone)}'`;
    } else {
      result.timezone = input.timezone.trim();
    }
  }

  if ("dateFormat" in input) {
    if (
      typeof input.dateFormat !== "string" ||
      !(ALLOWED_DATE_FORMATS as readonly string[]).includes(input.dateFormat)
    ) {
      errors.dateFormat = `Invalid date format. Allowed: ${ALLOWED_DATE_FORMATS.join(", ")}`;
    } else {
      result.dateFormat = input.dateFormat as (typeof ALLOWED_DATE_FORMATS)[number];
    }
  }

  if ("timeFormat" in input) {
    if (
      typeof input.timeFormat !== "string" ||
      !(ALLOWED_TIME_FORMATS as readonly string[]).includes(input.timeFormat)
    ) {
      errors.timeFormat = `Invalid time format. Allowed: ${ALLOWED_TIME_FORMATS.join(", ")}`;
    } else {
      result.timeFormat = input.timeFormat as (typeof ALLOWED_TIME_FORMATS)[number];
    }
  }

  if ("firstDayOfWeek" in input) {
    if (
      typeof input.firstDayOfWeek !== "number" ||
      !(ALLOWED_FIRST_DAY_OF_WEEK as readonly number[]).includes(input.firstDayOfWeek)
    ) {
      errors.firstDayOfWeek = "First day of week must be 0 (Sunday) or 1 (Monday)";
    } else {
      result.firstDayOfWeek = input.firstDayOfWeek as (typeof ALLOWED_FIRST_DAY_OF_WEEK)[number];
    }
  }

  if ("defaultLandingPage" in input) {
    if (
      typeof input.defaultLandingPage !== "string" ||
      !(ALLOWED_LANDING_PAGES as readonly string[]).includes(input.defaultLandingPage)
    ) {
      errors.defaultLandingPage = `Invalid landing page. Allowed: ${ALLOWED_LANDING_PAGES.join(", ")}`;
    } else {
      result.defaultLandingPage = input.defaultLandingPage as (typeof ALLOWED_LANDING_PAGES)[number];
    }
  }

  // Trading Defaults
  if ("defaultAccountId" in input) {
    if (input.defaultAccountId === null || input.defaultAccountId === undefined) {
      result.defaultAccountId = null;
    } else if (
      typeof input.defaultAccountId !== "string" ||
      input.defaultAccountId.trim().length === 0
    ) {
      errors.defaultAccountId = "Default account ID must be a non-empty string or null";
    } else {
      result.defaultAccountId = input.defaultAccountId.trim();
    }
  }

  if ("defaultTradeSide" in input) {
    if (input.defaultTradeSide === null || input.defaultTradeSide === undefined) {
      result.defaultTradeSide = null;
    } else if (input.defaultTradeSide === "LONG" || input.defaultTradeSide === "SHORT") {
      result.defaultTradeSide = input.defaultTradeSide;
    } else {
      errors.defaultTradeSide = "Default trade side must be 'LONG', 'SHORT', or null";
    }
  }

  if ("defaultRiskPercent" in input) {
    if (input.defaultRiskPercent === null || input.defaultRiskPercent === undefined || input.defaultRiskPercent === "") {
      result.defaultRiskPercent = null;
    } else {
      const num = Number(input.defaultRiskPercent);
      if (isNaN(num) || num < 0 || num > 100) {
        errors.defaultRiskPercent = "Default risk percent must be a number between 0 and 100";
      } else {
        result.defaultRiskPercent = num.toFixed(2);
      }
    }
  }

  if ("defaultRiskAmount" in input) {
    if (input.defaultRiskAmount === null || input.defaultRiskAmount === undefined || input.defaultRiskAmount === "") {
      result.defaultRiskAmount = null;
    } else {
      const num = Number(input.defaultRiskAmount);
      if (isNaN(num) || num < 0 || num > 100000000) {
        errors.defaultRiskAmount = "Default risk amount must be a positive number";
      } else {
        result.defaultRiskAmount = num.toFixed(2);
      }
    }
  }

  if ("preferredQuantityUnit" in input) {
    if (
      typeof input.preferredQuantityUnit !== "string" ||
      !(ALLOWED_QUANTITY_UNITS as readonly string[]).includes(input.preferredQuantityUnit)
    ) {
      errors.preferredQuantityUnit = `Invalid quantity unit. Allowed: ${ALLOWED_QUANTITY_UNITS.join(", ")}`;
    } else {
      result.preferredQuantityUnit = input.preferredQuantityUnit as (typeof ALLOWED_QUANTITY_UNITS)[number];
    }
  }

  // Display Preferences
  if ("tableDensity" in input) {
    if (
      typeof input.tableDensity !== "string" ||
      !(ALLOWED_TABLE_DENSITIES as readonly string[]).includes(input.tableDensity)
    ) {
      errors.tableDensity = `Invalid table density. Allowed: ${ALLOWED_TABLE_DENSITIES.join(", ")}`;
    } else {
      result.tableDensity = input.tableDensity as (typeof ALLOWED_TABLE_DENSITIES)[number];
    }
  }

  if ("decimalPlaces" in input) {
    const num = Number(input.decimalPlaces);
    if (!Number.isInteger(num) || num < 0 || num > 8) {
      errors.decimalPlaces = "Decimal places must be an integer between 0 and 8";
    } else {
      result.decimalPlaces = num;
    }
  }

  if ("pnlDisplayMode" in input) {
    if (
      typeof input.pnlDisplayMode !== "string" ||
      !(ALLOWED_PNL_MODES as readonly string[]).includes(input.pnlDisplayMode)
    ) {
      errors.pnlDisplayMode = `Invalid PnL mode. Allowed: ${ALLOWED_PNL_MODES.join(", ")}`;
    } else {
      result.pnlDisplayMode = input.pnlDisplayMode as (typeof ALLOWED_PNL_MODES)[number];
    }
  }

  if ("theme" in input) {
    if (
      typeof input.theme !== "string" ||
      !(ALLOWED_THEMES as readonly string[]).includes(input.theme)
    ) {
      errors.theme = `Invalid theme. Allowed: ${ALLOWED_THEMES.join(", ")}`;
    } else {
      result.theme = input.theme as (typeof ALLOWED_THEMES)[number];
    }
  }

  // Dashboard Preferences
  if ("dashboardLayout" in input) {
    try {
      result.dashboardLayout = validateDashboardLayout(input.dashboardLayout);
    } catch (err) {
      if (err instanceof SettingsValidationError && err.fieldErrors) {
        Object.assign(errors, err.fieldErrors);
      } else {
        errors.dashboardLayout = (err as Error).message;
      }
    }
  }

  if ("defaultDashboardDateRange" in input) {
    if (
      typeof input.defaultDashboardDateRange !== "string" ||
      !(ALLOWED_DASHBOARD_DATE_RANGES as readonly string[]).includes(input.defaultDashboardDateRange)
    ) {
      errors.defaultDashboardDateRange = `Invalid date range. Allowed: ${ALLOWED_DASHBOARD_DATE_RANGES.join(", ")}`;
    } else {
      result.defaultDashboardDateRange = input.defaultDashboardDateRange as (typeof ALLOWED_DASHBOARD_DATE_RANGES)[number];
    }
  }

  // Journal & Reviews
  if ("defaultJournalView" in input) {
    if (
      typeof input.defaultJournalView !== "string" ||
      !(ALLOWED_JOURNAL_VIEWS as readonly string[]).includes(input.defaultJournalView)
    ) {
      errors.defaultJournalView = `Invalid journal view. Allowed: ${ALLOWED_JOURNAL_VIEWS.join(", ")}`;
    } else {
      result.defaultJournalView = input.defaultJournalView as (typeof ALLOWED_JOURNAL_VIEWS)[number];
    }
  }

  if ("defaultReviewStatus" in input) {
    if (
      typeof input.defaultReviewStatus !== "string" ||
      !(ALLOWED_REVIEW_STATUSES as readonly string[]).includes(input.defaultReviewStatus)
    ) {
      errors.defaultReviewStatus = `Invalid review status. Allowed: ${ALLOWED_REVIEW_STATUSES.join(", ")}`;
    } else {
      result.defaultReviewStatus = input.defaultReviewStatus as (typeof ALLOWED_REVIEW_STATUSES)[number];
    }
  }

  if ("defaultTemplateId" in input) {
    if (input.defaultTemplateId === null || input.defaultTemplateId === undefined) {
      result.defaultTemplateId = null;
    } else if (
      typeof input.defaultTemplateId !== "string" ||
      input.defaultTemplateId.trim().length === 0
    ) {
      errors.defaultTemplateId = "Default template ID must be a string or null";
    } else {
      result.defaultTemplateId = input.defaultTemplateId.trim();
    }
  }

  // Imports
  if ("defaultImportTimezone" in input) {
    if (
      typeof input.defaultImportTimezone !== "string" ||
      !isValidTimezone(input.defaultImportTimezone)
    ) {
      errors.defaultImportTimezone = `Invalid IANA timezone: '${String(input.defaultImportTimezone)}'`;
    } else {
      result.defaultImportTimezone = input.defaultImportTimezone.trim();
    }
  }

  if ("defaultImportAccountId" in input) {
    if (input.defaultImportAccountId === null || input.defaultImportAccountId === undefined) {
      result.defaultImportAccountId = null;
    } else if (
      typeof input.defaultImportAccountId !== "string" ||
      input.defaultImportAccountId.trim().length === 0
    ) {
      errors.defaultImportAccountId = "Default import account ID must be a string or null";
    } else {
      result.defaultImportAccountId = input.defaultImportAccountId.trim();
    }
  }

  if ("defaultImportRoute" in input) {
    if (
      typeof input.defaultImportRoute !== "string" ||
      !(ALLOWED_IMPORT_ROUTES as readonly string[]).includes(input.defaultImportRoute)
    ) {
      errors.defaultImportRoute = `Invalid import route. Allowed: ${ALLOWED_IMPORT_ROUTES.join(", ")}`;
    } else {
      result.defaultImportRoute = input.defaultImportRoute as (typeof ALLOWED_IMPORT_ROUTES)[number];
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new SettingsValidationError(
      "Validation failed for preferences update",
      errors,
    );
  }

  return result;
}

/**
 * Validates category parameter for resetting preferences.
 */
export function validateResetCategory(category: unknown): ResetPreferencesCategory {
  const allowed = [
    "all",
    "general",
    "trading",
    "display",
    "dashboard",
    "journal",
    "imports",
  ];
  if (!category || category === "all") return "all";
  if (typeof category === "string" && allowed.includes(category)) {
    return category as ResetPreferencesCategory;
  }
  throw new SettingsValidationError(
    `Invalid reset category: '${String(category)}'. Allowed: ${allowed.join(", ")}`,
  );
}
