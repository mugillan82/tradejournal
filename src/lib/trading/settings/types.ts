/**
 * Settings & User Preferences Domain — Types and Constants
 */

export const ALLOWED_DASHBOARD_WIDGET_IDS = [
  "performance-hero",
  "today-card",
  "breakdowns",
  "recent-trades",
  "calendar-preview",
  "accounts-card",
  "journal-preview",
  "quick-actions",
] as const;

export type DashboardWidgetId = (typeof ALLOWED_DASHBOARD_WIDGET_IDS)[number];

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  visible: boolean;
  order: number;
  label: string;
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetConfig[] = [
  { id: "performance-hero", visible: true, order: 0, label: "Performance Overview" },
  { id: "today-card", visible: true, order: 1, label: "Today & Monthly Performance" },
  { id: "breakdowns", visible: true, order: 2, label: "Top Breakdowns (Symbols, Strategies, Direction)" },
  { id: "recent-trades", visible: true, order: 3, label: "Recent Trades" },
  { id: "calendar-preview", visible: true, order: 4, label: "Calendar Snapshot" },
  { id: "accounts-card", visible: true, order: 5, label: "Trading Accounts" },
  { id: "journal-preview", visible: true, order: 6, label: "Journal & Daily Context" },
  { id: "quick-actions", visible: true, order: 7, label: "Quick Navigation Actions" },
];

export const ALLOWED_DATE_FORMATS = [
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY.MM.DD",
] as const;
export type DateFormat = (typeof ALLOWED_DATE_FORMATS)[number];

export const ALLOWED_TIME_FORMATS = ["24H", "12H"] as const;
export type TimeFormat = (typeof ALLOWED_TIME_FORMATS)[number];

export const ALLOWED_FIRST_DAY_OF_WEEK = [0, 1] as const; // 0 = Sunday, 1 = Monday
export type FirstDayOfWeek = (typeof ALLOWED_FIRST_DAY_OF_WEEK)[number];

export const ALLOWED_TABLE_DENSITIES = ["compact", "comfortable", "spacious"] as const;
export type TableDensity = (typeof ALLOWED_TABLE_DENSITIES)[number];

export const ALLOWED_PNL_MODES = ["currency", "percentage", "r_multiple"] as const;
export type PnlDisplayMode = (typeof ALLOWED_PNL_MODES)[number];

export const ALLOWED_THEMES = ["dark", "system"] as const;
export type Theme = (typeof ALLOWED_THEMES)[number];

export const ALLOWED_QUANTITY_UNITS = ["lots", "units", "shares", "contracts"] as const;
export type QuantityUnit = (typeof ALLOWED_QUANTITY_UNITS)[number];

export const ALLOWED_LANDING_PAGES = [
  "/dashboard",
  "/trades",
  "/journal",
  "/analytics",
  "/calendar",
] as const;
export type DefaultLandingPage = (typeof ALLOWED_LANDING_PAGES)[number];

export const ALLOWED_JOURNAL_VIEWS = ["daily", "calendar", "list"] as const;
export type DefaultJournalView = (typeof ALLOWED_JOURNAL_VIEWS)[number];

export const ALLOWED_REVIEW_STATUSES = ["ALL", "DRAFT", "IN_REVIEW", "COMPLETED"] as const;
export type DefaultReviewStatus = (typeof ALLOWED_REVIEW_STATUSES)[number];

export const ALLOWED_DASHBOARD_DATE_RANGES = [
  "ALL",
  "TODAY",
  "THIS_WEEK",
  "THIS_MONTH",
  "THIS_YEAR",
  "LAST_30_DAYS",
  "LAST_90_DAYS",
] as const;
export type DefaultDashboardDateRange = (typeof ALLOWED_DASHBOARD_DATE_RANGES)[number];

export const ALLOWED_IMPORT_ROUTES = ["/import", "/import/csv", "/import/smart"] as const;
export type DefaultImportRoute = (typeof ALLOWED_IMPORT_ROUTES)[number];

export interface UserPreferencesDto {
  id: string;
  userId: string;
  displayName: string | null;
  email?: string | null;

  // General
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  firstDayOfWeek: FirstDayOfWeek;
  defaultLandingPage: DefaultLandingPage;

  // Trading Defaults
  defaultAccountId: string | null;
  defaultTradeSide: "LONG" | "SHORT" | null;
  defaultRiskPercent: string | null;
  defaultRiskAmount: string | null;
  preferredQuantityUnit: QuantityUnit;

  // Display
  tableDensity: TableDensity;
  decimalPlaces: number;
  pnlDisplayMode: PnlDisplayMode;
  theme: Theme;

  // Dashboard
  dashboardLayout: DashboardWidgetConfig[];
  defaultDashboardDateRange: DefaultDashboardDateRange;

  // Journal & Reviews
  defaultJournalView: DefaultJournalView;
  defaultReviewStatus: DefaultReviewStatus;
  defaultTemplateId: string | null;

  // Imports
  defaultImportTimezone: string;
  defaultImportAccountId: string | null;
  defaultImportRoute: DefaultImportRoute;

  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencesInput {
  displayName?: string | null;
  timezone?: string;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  firstDayOfWeek?: FirstDayOfWeek;
  defaultLandingPage?: DefaultLandingPage;

  defaultAccountId?: string | null;
  defaultTradeSide?: "LONG" | "SHORT" | null;
  defaultRiskPercent?: string | number | null;
  defaultRiskAmount?: string | number | null;
  preferredQuantityUnit?: QuantityUnit;

  tableDensity?: TableDensity;
  decimalPlaces?: number;
  pnlDisplayMode?: PnlDisplayMode;
  theme?: Theme;

  dashboardLayout?: DashboardWidgetConfig[];
  defaultDashboardDateRange?: DefaultDashboardDateRange;

  defaultJournalView?: DefaultJournalView;
  defaultReviewStatus?: DefaultReviewStatus;
  defaultTemplateId?: string | null;

  defaultImportTimezone?: string;
  defaultImportAccountId?: string | null;
  defaultImportRoute?: DefaultImportRoute;
}

export type ResetPreferencesCategory =
  | "all"
  | "general"
  | "trading"
  | "display"
  | "dashboard"
  | "journal"
  | "imports";
