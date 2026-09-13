"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  User,
  Settings as SettingsIcon,
  Sliders,
  Eye,
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Check,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ShieldAlert,
} from "@/components/icons";
import { useSettings } from "@/components/settings/settings-provider";
import {
  ALLOWED_DATE_FORMATS,
  ALLOWED_TIME_FORMATS,
  ALLOWED_TABLE_DENSITIES,
  ALLOWED_QUANTITY_UNITS,
  ALLOWED_LANDING_PAGES,
  ALLOWED_JOURNAL_VIEWS,
  ALLOWED_REVIEW_STATUSES,
  ALLOWED_DASHBOARD_DATE_RANGES,
  DEFAULT_DASHBOARD_LAYOUT,
  type UserPreferencesDto,
  type UpdatePreferencesInput,
  type ResetPreferencesCategory,
} from "@/lib/trading/settings/types";
import { SettingsClientApiError } from "@/lib/client/settings";

type TabKey =
  | "general"
  | "trading"
  | "display"
  | "dashboard"
  | "journal"
  | "imports"
  | "danger";

interface AccountOption {
  id: string;
  name: string;
  currency: string;
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Frankfurt",
  "Europe/Zurich",
  "Europe/Madrid",
  "Europe/Rome",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function buildFormFromPreferences(prefs: UserPreferencesDto | null): UpdatePreferencesInput {
  if (!prefs) return {};
  return {
    displayName: prefs.displayName ?? "",
    timezone: prefs.timezone,
    dateFormat: prefs.dateFormat,
    timeFormat: prefs.timeFormat,
    firstDayOfWeek: prefs.firstDayOfWeek,
    defaultLandingPage: prefs.defaultLandingPage,
    defaultAccountId: prefs.defaultAccountId,
    defaultTradeSide: prefs.defaultTradeSide,
    defaultRiskPercent: prefs.defaultRiskPercent ?? "",
    defaultRiskAmount: prefs.defaultRiskAmount ?? "",
    preferredQuantityUnit: prefs.preferredQuantityUnit,
    tableDensity: prefs.tableDensity,
    decimalPlaces: prefs.decimalPlaces,
    pnlDisplayMode: prefs.pnlDisplayMode,
    theme: prefs.theme,
    dashboardLayout: prefs.dashboardLayout,
    defaultDashboardDateRange: prefs.defaultDashboardDateRange,
    defaultJournalView: prefs.defaultJournalView,
    defaultReviewStatus: prefs.defaultReviewStatus,
    defaultTemplateId: prefs.defaultTemplateId,
    defaultImportTimezone: prefs.defaultImportTimezone,
    defaultImportAccountId: prefs.defaultImportAccountId,
    defaultImportRoute: prefs.defaultImportRoute,
  };
}

export function SettingsClientPage() {
  const { preferences, updatePreferences, resetPreferences, isLoading: isContextLoading } =
    useSettings();

  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [form, setForm] = useState<UpdatePreferencesInput>(() =>
    buildFormFromPreferences(preferences),
  );
  const [prevPreferences, setPrevPreferences] = useState(preferences);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isResetting, setIsResetting] = useState(false);

  // Sync state when preferences are updated externally
  if (preferences !== prevPreferences) {
    setPrevPreferences(preferences);
    setForm(buildFormFromPreferences(preferences));
  }

  // Fetch user accounts for default account pickers
  useEffect(() => {
    let ignore = false;
    async function loadAccounts() {
      try {
        const res = await fetch("/api/accounts", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (!ignore && Array.isArray(json.data)) {
            setAccounts(
              json.data.map((acc: { id: string; name: string; currency: string }) => ({
                id: acc.id,
                name: acc.name,
                currency: acc.currency,
              })),
            );
          }
        }
      } catch {
        // Accounts list fetch failed, account picker will show empty
      }
    }
    loadAccounts();
    return () => {
      ignore = true;
    };
  }, []);

  // Determine if form has unsaved modifications
  const isDirty = useMemo(() => {
    if (!preferences) return false;
    if ((form.displayName ?? "") !== (preferences.displayName ?? "")) return true;
    if (form.timezone !== preferences.timezone) return true;
    if (form.dateFormat !== preferences.dateFormat) return true;
    if (form.timeFormat !== preferences.timeFormat) return true;
    if (form.firstDayOfWeek !== preferences.firstDayOfWeek) return true;
    if (form.defaultLandingPage !== preferences.defaultLandingPage) return true;
    if (form.defaultAccountId !== preferences.defaultAccountId) return true;
    if (form.defaultTradeSide !== preferences.defaultTradeSide) return true;
    if (String(form.defaultRiskPercent ?? "") !== String(preferences.defaultRiskPercent ?? "")) return true;
    if (String(form.defaultRiskAmount ?? "") !== String(preferences.defaultRiskAmount ?? "")) return true;
    if (form.preferredQuantityUnit !== preferences.preferredQuantityUnit) return true;
    if (form.tableDensity !== preferences.tableDensity) return true;
    if (form.decimalPlaces !== preferences.decimalPlaces) return true;
    if (form.pnlDisplayMode !== preferences.pnlDisplayMode) return true;
    if (form.theme !== preferences.theme) return true;
    if (form.defaultDashboardDateRange !== preferences.defaultDashboardDateRange) return true;
    if (form.defaultJournalView !== preferences.defaultJournalView) return true;
    if (form.defaultReviewStatus !== preferences.defaultReviewStatus) return true;
    if (form.defaultImportTimezone !== preferences.defaultImportTimezone) return true;
    if (form.defaultImportAccountId !== preferences.defaultImportAccountId) return true;
    if (form.defaultImportRoute !== preferences.defaultImportRoute) return true;

    if (form.dashboardLayout && preferences.dashboardLayout) {
      if (JSON.stringify(form.dashboardLayout) !== JSON.stringify(preferences.dashboardLayout)) {
        return true;
      }
    }

    return false;
  }, [form, preferences]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setFieldErrors({});
    setSaveSuccess(null);

    try {
      await updatePreferences(form);
      setSaveSuccess("Preferences saved successfully!");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      if (err instanceof SettingsClientApiError) {
        setErrorMessage(err.message);
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        }
      } else {
        setErrorMessage("Failed to save preferences. Please check your inputs.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!preferences) return;
    setForm({
      displayName: preferences.displayName ?? "",
      timezone: preferences.timezone,
      dateFormat: preferences.dateFormat,
      timeFormat: preferences.timeFormat,
      firstDayOfWeek: preferences.firstDayOfWeek,
      defaultLandingPage: preferences.defaultLandingPage,
      defaultAccountId: preferences.defaultAccountId,
      defaultTradeSide: preferences.defaultTradeSide,
      defaultRiskPercent: preferences.defaultRiskPercent ?? "",
      defaultRiskAmount: preferences.defaultRiskAmount ?? "",
      preferredQuantityUnit: preferences.preferredQuantityUnit,
      tableDensity: preferences.tableDensity,
      decimalPlaces: preferences.decimalPlaces,
      pnlDisplayMode: preferences.pnlDisplayMode,
      theme: preferences.theme,
      dashboardLayout: preferences.dashboardLayout,
      defaultDashboardDateRange: preferences.defaultDashboardDateRange,
      defaultJournalView: preferences.defaultJournalView,
      defaultReviewStatus: preferences.defaultReviewStatus,
      defaultTemplateId: preferences.defaultTemplateId,
      defaultImportTimezone: preferences.defaultImportTimezone,
      defaultImportAccountId: preferences.defaultImportAccountId,
      defaultImportRoute: preferences.defaultImportRoute,
    });
    setErrorMessage(null);
    setFieldErrors({});
  };

  const handleResetCategory = async (category: ResetPreferencesCategory) => {
    const confirmMsg =
      category === "all"
        ? "Are you sure you want to reset all preferences to factory defaults?"
        : `Are you sure you want to reset ${category} preferences to defaults?`;

    if (!window.confirm(confirmMsg)) return;

    setIsResetting(true);
    setErrorMessage(null);
    setSaveSuccess(null);

    try {
      await resetPreferences(category);
      setSaveSuccess(`Reset ${category === "all" ? "all" : category} preferences successfully!`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "Failed to reset preferences");
    } finally {
      setIsResetting(false);
    }
  };

  // Dashboard layout widget manipulation
  const currentWidgets = form.dashboardLayout ?? DEFAULT_DASHBOARD_LAYOUT;

  const handleToggleWidget = (id: string) => {
    const updated = currentWidgets.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w,
    );
    setForm((prev) => ({ ...prev, dashboardLayout: updated }));
  };

  const handleMoveWidget = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === currentWidgets.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newWidgets = [...currentWidgets];
    const temp = newWidgets[index]!;
    newWidgets[index] = newWidgets[targetIndex]!;
    newWidgets[targetIndex] = temp;

    // re-normalize order indices
    const normalized = newWidgets.map((w, i) => ({ ...w, order: i }));
    setForm((prev) => ({ ...prev, dashboardLayout: normalized }));
  };

  const handleResetDashboardLayout = () => {
    setForm((prev) => ({ ...prev, dashboardLayout: DEFAULT_DASHBOARD_LAYOUT }));
  };

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: "general", label: "Profile & General", icon: User },
    { key: "trading", label: "Trading Defaults", icon: Sliders },
    { key: "display", label: "Display & Format", icon: Eye },
    { key: "dashboard", label: "Dashboard Layout", icon: LayoutDashboard },
    { key: "journal", label: "Journal & Reviews", icon: BookOpen },
    { key: "imports", label: "Import Defaults", icon: FileSpreadsheet },
    { key: "danger", label: "Data & Reset", icon: AlertTriangle },
  ];

  if (isContextLoading && !preferences) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8" data-testid="settings-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <SettingsIcon size={24} className="text-emerald-400" />
            Product Settings & Customization
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure your profile, trading defaults, display formatting, and dashboard layout.
          </p>
        </div>

        {/* Action badges */}
        <div className="flex items-center gap-3">
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700/60 transition-colors"
          >
            Documentation & Help
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Feedback Alerts */}
      {saveSuccess && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm animate-fade-in"
        >
          <Check size={18} className="text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{saveSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm animate-fade-in"
        >
          <ShieldAlert size={18} className="text-rose-400 flex-shrink-0" />
          <div>
            <span className="font-medium">{errorMessage}</span>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="mt-1.5 list-disc list-inside text-xs space-y-0.5 text-rose-300/80">
                {Object.entries(fieldErrors).map(([field, err]) => (
                  <li key={field}>
                    <span className="font-mono text-rose-200">{field}</span>: {err}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Main Container with Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <nav
          className="space-y-1 md:col-span-1"
          aria-label="Settings sections"
          role="tablist"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-emerald-400" : "text-slate-500"}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content Panel */}
        <form
          onSubmit={handleSave}
          className="md:col-span-3 space-y-6"
          role="tabpanel"
        >
          {/* TAB 1: Profile & General */}
          {activeTab === "general" && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Profile & General Preferences
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage your personal identity, timezone, and regional date/time formats.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Display Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-displayName"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Display Name
                  </label>
                  <input
                    id="settings-displayName"
                    type="text"
                    value={form.displayName ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    placeholder="Trader Name"
                    maxLength={100}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Shown in the sidebar header and trade journal records.
                  </p>
                </div>

                {/* Account Email (Read-only) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Account Email
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled
                      value={preferences?.email ?? ""}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-400 cursor-not-allowed"
                    />
                    <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-semibold text-slate-400">
                      Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Authentication credential managed by Better Auth.
                  </p>
                </div>

                {/* Timezone */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="settings-timezone"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Display Timezone
                  </label>
                  <select
                    id="settings-timezone"
                    value={form.timezone ?? "UTC"}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, timezone: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    All timestamps are stored canonically in UTC and rendered in this timezone across Calendar, Journal, and Analytics.
                  </p>
                </div>

                {/* Date Format */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-dateFormat"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Date Format
                  </label>
                  <select
                    id="settings-dateFormat"
                    value={form.dateFormat ?? "YYYY-MM-DD"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        dateFormat: e.target.value as UpdatePreferencesInput["dateFormat"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {ALLOWED_DATE_FORMATS.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Format */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-timeFormat"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Time Format
                  </label>
                  <select
                    id="settings-timeFormat"
                    value={form.timeFormat ?? "24H"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        timeFormat: e.target.value as UpdatePreferencesInput["timeFormat"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {ALLOWED_TIME_FORMATS.map((tf) => (
                      <option key={tf} value={tf}>
                        {tf === "24H" ? "24-Hour (15:30:00)" : "12-Hour (3:30:00 PM)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* First Day of Week */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-firstDayOfWeek"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    First Day of Week
                  </label>
                  <select
                    id="settings-firstDayOfWeek"
                    value={form.firstDayOfWeek ?? 0}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        firstDayOfWeek: Number(e.target.value) as 0 | 1,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Controls calendar matrix layout and weekly aggregation.
                  </p>
                </div>

                {/* Default Landing Page */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-defaultLandingPage"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Default Landing Page
                  </label>
                  <select
                    id="settings-defaultLandingPage"
                    value={form.defaultLandingPage ?? "/dashboard"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultLandingPage: e.target.value as UpdatePreferencesInput["defaultLandingPage"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {ALLOWED_LANDING_PAGES.map((page) => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Primary route redirected to after login.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Trading Defaults */}
          {activeTab === "trading" && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Trading Defaults & Risk Rules
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-populate default values when creating trades and logging executions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Default Account */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="settings-defaultAccountId"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Default Trading Account
                  </label>
                  <select
                    id="settings-defaultAccountId"
                    value={form.defaultAccountId ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultAccountId: e.target.value ? e.target.value : null,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">None (Always Prompt)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Pre-selected account in Add Trade, CSV Import, and Dashboard filter.
                  </p>
                </div>

                {/* Default Trade Side */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-defaultTradeSide"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Default Direction
                  </label>
                  <select
                    id="settings-defaultTradeSide"
                    value={form.defaultTradeSide ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultTradeSide: e.target.value ? (e.target.value as "LONG" | "SHORT") : null,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">None</option>
                    <option value="LONG">Long (Buy)</option>
                    <option value="SHORT">Short (Sell)</option>
                  </select>
                </div>

                {/* Preferred Quantity Unit */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-preferredQuantityUnit"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Quantity Unit
                  </label>
                  <select
                    id="settings-preferredQuantityUnit"
                    value={form.preferredQuantityUnit ?? "lots"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        preferredQuantityUnit: e.target.value as UpdatePreferencesInput["preferredQuantityUnit"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {ALLOWED_QUANTITY_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Risk % */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-defaultRiskPercent"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Default Risk (% of Account)
                  </label>
                  <div className="relative">
                    <input
                      id="settings-defaultRiskPercent"
                      type="number"
                      step="0.05"
                      min="0"
                      max="100"
                      value={form.defaultRiskPercent ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          defaultRiskPercent: e.target.value || null,
                        }))
                      }
                      placeholder="e.g. 1.00"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-3.5 pr-8 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                      %
                    </span>
                  </div>
                </div>

                {/* Default Risk $ */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-defaultRiskAmount"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Default Risk ($ Dollar Amount)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                      $
                    </span>
                    <input
                      id="settings-defaultRiskAmount"
                      type="number"
                      step="1"
                      min="0"
                      value={form.defaultRiskAmount ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          defaultRiskAmount: e.target.value || null,
                        }))
                      }
                      placeholder="e.g. 250.00"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-7 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Display & Format */}
          {activeTab === "display" && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Display & Formatting
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tailor numerical precision, table row density, and P&L representations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Table Density */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-tableDensity"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Table Density
                  </label>
                  <select
                    id="settings-tableDensity"
                    value={form.tableDensity ?? "comfortable"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tableDensity: e.target.value as UpdatePreferencesInput["tableDensity"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {ALLOWED_TABLE_DENSITIES.map((d) => (
                      <option key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Controls padding across trade tables, executions, and reports.
                  </p>
                </div>

                {/* Decimal Places */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-decimalPlaces"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Financial Decimal Precision
                  </label>
                  <select
                    id="settings-decimalPlaces"
                    value={form.decimalPlaces ?? 2}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        decimalPlaces: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={0}>0 decimals ($125)</option>
                    <option value={2}>2 decimals ($125.50 - standard)</option>
                    <option value={4}>4 decimals ($1.2550 - forex)</option>
                    <option value={6}>6 decimals ($0.001255 - crypto)</option>
                    <option value={8}>8 decimals (micro-units)</option>
                  </select>
                </div>

                {/* P&L Display Mode */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-pnlDisplayMode"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    P&L Display Mode
                  </label>
                  <select
                    id="settings-pnlDisplayMode"
                    value={form.pnlDisplayMode ?? "currency"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pnlDisplayMode: e.target.value as UpdatePreferencesInput["pnlDisplayMode"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="currency">Currency ($ USD)</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="r_multiple">R-Multiple (+2.5R)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Determines prominent representation in dashboard KPI cards and trade lists.
                  </p>
                </div>

                {/* Theme */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-theme"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Color Theme
                  </label>
                  <select
                    id="settings-theme"
                    value={form.theme ?? "dark"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        theme: e.target.value as UpdatePreferencesInput["theme"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="dark">Emerald Dark (Default)</option>
                    <option value="system">System Synced</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Dashboard Layout */}
          {activeTab === "dashboard" && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    Dashboard Layout & Widget Organization
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toggle visibility and reorder widgets to customize your trading command center.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetDashboardLayout}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors"
                >
                  <RotateCcw size={13} />
                  Reset Order
                </button>
              </div>

              {/* Default Date Range Filter */}
              <div className="max-w-xs space-y-1.5">
                <label
                  htmlFor="settings-defaultDashboardDateRange"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  Default Date Range
                </label>
                <select
                  id="settings-defaultDashboardDateRange"
                  value={form.defaultDashboardDateRange ?? "ALL"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      defaultDashboardDateRange: e.target.value as UpdatePreferencesInput["defaultDashboardDateRange"],
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {ALLOWED_DASHBOARD_DATE_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interactive Widget List */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-slate-400">
                  Widgets & Visibility (Drag-free sequential ordering):
                </p>
                <div className="space-y-2">
                  {currentWidgets.map((widget, idx) => (
                    <div
                      key={widget.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        widget.visible
                          ? "border-slate-800 bg-slate-950/80"
                          : "border-slate-800/40 bg-slate-950/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`widget-${widget.id}`}
                          checked={widget.visible}
                          onChange={() => handleToggleWidget(widget.id)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                        />
                        <label
                          htmlFor={`widget-${widget.id}`}
                          className="text-sm font-medium text-slate-200 cursor-pointer select-none"
                        >
                          {widget.label}
                        </label>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveWidget(idx, "up")}
                          aria-label={`Move ${widget.label} up`}
                          className="p-1 rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === currentWidgets.length - 1}
                          onClick={() => handleMoveWidget(idx, "down")}
                          aria-label={`Move ${widget.label} down`}
                          className="p-1 rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <span className="text-[11px] font-mono text-slate-500 w-6 text-center">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Journal & Reviews */}
          {activeTab === "journal" && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Journal & Review Defaults
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure default views and filters for Daily Journal and Trade Reviews.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Default Journal View */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-defaultJournalView"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Default Journal View
                  </label>
                  <select
                    id="settings-defaultJournalView"
                    value={form.defaultJournalView ?? "daily"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultJournalView: e.target.value as UpdatePreferencesInput["defaultJournalView"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {ALLOWED_JOURNAL_VIEWS.map((v) => (
                      <option key={v} value={v}>
                        {v.charAt(0).toUpperCase() + v.slice(1)} View
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Review Status */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-defaultReviewStatus"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Default Review Filter
                  </label>
                  <select
                    id="settings-defaultReviewStatus"
                    value={form.defaultReviewStatus ?? "ALL"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultReviewStatus: e.target.value as UpdatePreferencesInput["defaultReviewStatus"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {ALLOWED_REVIEW_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s === "ALL" ? "All Reviews" : s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Import Defaults */}
          {activeTab === "imports" && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Import Center Preferences
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Defaults for CSV, XLSX, and Smart Screenshot import pipelines.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* Default Import Account */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="settings-defaultImportAccountId"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Default Import Account
                  </label>
                  <select
                    id="settings-defaultImportAccountId"
                    value={form.defaultImportAccountId ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultImportAccountId: e.target.value ? e.target.value : null,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">None (Prompt Each Import)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Pre-selected when uploading files in /import/csv.
                  </p>
                </div>

                {/* Default Import Timezone */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-defaultImportTimezone"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Broker Export Timezone
                  </label>
                  <select
                    id="settings-defaultImportTimezone"
                    value={form.defaultImportTimezone ?? "UTC"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultImportTimezone: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Assumed timezone when broker timestamps omit explicit offset.
                  </p>
                </div>

                {/* Default Import Route */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="settings-defaultImportRoute"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Preferred Import Method
                  </label>
                  <select
                    id="settings-defaultImportRoute"
                    value={form.defaultImportRoute ?? "/import"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        defaultImportRoute: e.target.value as UpdatePreferencesInput["defaultImportRoute"],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="/import">Import Hub (Overview)</option>
                    <option value="/import/csv">CSV & Excel Direct Upload</option>
                    <option value="/import/smart">Smart Vision Screenshot AI</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Danger Zone & Reset */}
          {activeTab === "danger" && (
            <div className="rounded-xl border border-rose-500/30 bg-slate-900/60 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-rose-300 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-rose-400" />
                  Data Management & Preferences Reset
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Export complete backups or reset customization values back to system defaults.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-lg border border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-slate-200">
                      Export Backups & Data Management
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Export trades, journal entries, and account statements to CSV or JSON.
                    </p>
                  </div>
                  <Link
                    href="/data-management"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    Open Data Management
                    <ExternalLink size={12} />
                  </Link>
                </div>

                <div className="p-4 rounded-lg border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-rose-300">
                      Reset All User Preferences
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Restores all display formats, dashboard layout, and trading defaults to factory defaults. Your trades, accounts, and journal entries are NOT affected.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => handleResetCategory("all")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-rose-500/40 bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    {isResetting ? "Resetting..." : "Reset All Preferences"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Unsaved Changes Action Bar */}
          {isDirty && (
            <div className="sticky bottom-4 z-40 flex items-center justify-between p-4 rounded-xl border border-emerald-500/40 bg-slate-900/95 backdrop-blur shadow-2xl shadow-black/80 animate-fade-in">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">You have unsaved changes</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-50 shadow-md shadow-emerald-900/30"
                >
                  {isSaving ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
