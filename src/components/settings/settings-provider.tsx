"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type {
  UserPreferencesDto,
  UpdatePreferencesInput,
  ResetPreferencesCategory,
} from "@/lib/trading/settings/types";
import {
  fetchSettingsClient,
  updateSettingsClient,
  resetSettingsClient,
  SettingsClientApiError,
} from "@/lib/client/settings";

interface SettingsContextType {
  preferences: UserPreferencesDto | null;
  isLoading: boolean;
  error: string | null;
  updatePreferences: (input: UpdatePreferencesInput) => Promise<UserPreferencesDto>;
  resetPreferences: (category?: ResetPreferencesCategory) => Promise<UserPreferencesDto>;
  refreshPreferences: () => Promise<void>;

  // Formatters that respect user preferences
  formatDate: (date: Date | string | null | undefined) => string;
  formatTime: (date: Date | string | null | undefined) => string;
  formatPnl: (val: number | string | null | undefined, currency?: string) => string;
  formatDecimal: (val: number | string | null | undefined, decimals?: number) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({
  children,
  initialPreferences,
}: {
  children: React.ReactNode;
  initialPreferences?: UserPreferencesDto | null;
}) {
  const [preferences, setPreferences] = useState<UserPreferencesDto | null>(
    initialPreferences ?? null,
  );
  const [isLoading, setIsLoading] = useState(!initialPreferences);
  const [error, setError] = useState<string | null>(null);

  const refreshPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchSettingsClient();
      setPreferences(data);
    } catch (err: unknown) {
      const msg =
        err instanceof SettingsClientApiError
          ? err.message
          : "Failed to load preferences";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialPreferences) return;

    let ignore = false;
    async function load() {
      try {
        const data = await fetchSettingsClient();
        if (!ignore) {
          setPreferences(data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg =
            err instanceof SettingsClientApiError
              ? err.message
              : "Failed to load preferences";
          setError(msg);
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [initialPreferences]);

  const handleUpdate = useCallback(
    async (input: UpdatePreferencesInput): Promise<UserPreferencesDto> => {
      const updated = await updateSettingsClient(input);
      setPreferences(updated);
      return updated;
    },
    [],
  );

  const handleReset = useCallback(
    async (category: ResetPreferencesCategory = "all"): Promise<UserPreferencesDto> => {
      const reset = await resetSettingsClient(category);
      setPreferences(reset);
      return reset;
    },
    [],
  );

  // Formatting helpers based on current preferences
  const formatDate = useCallback(
    (date: Date | string | null | undefined): string => {
      if (!date) return "—";
      const d = typeof date === "string" ? new Date(date) : date;
      if (isNaN(d.getTime())) return "—";

      const tz = preferences?.timezone || "UTC";
      const fmt = preferences?.dateFormat || "YYYY-MM-DD";

      try {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(d);

        const y = parts.find((p) => p.type === "year")?.value ?? "0000";
        const m = parts.find((p) => p.type === "month")?.value ?? "00";
        const day = parts.find((p) => p.type === "day")?.value ?? "00";

        if (fmt === "DD/MM/YYYY") return `${day}/${m}/${y}`;
        if (fmt === "MM/DD/YYYY") return `${m}/${day}/${y}`;
        if (fmt === "YYYY.MM.DD") return `${y}.${m}.${day}`;
        return `${y}-${m}-${day}`;
      } catch {
        return d.toISOString().split("T")[0]!;
      }
    },
    [preferences?.timezone, preferences?.dateFormat],
  );

  const formatTime = useCallback(
    (date: Date | string | null | undefined): string => {
      if (!date) return "—";
      const d = typeof date === "string" ? new Date(date) : date;
      if (isNaN(d.getTime())) return "—";

      const tz = preferences?.timezone || "UTC";
      const hour12 = preferences?.timeFormat === "12H";

      try {
        return new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12,
        }).format(d);
      } catch {
        return d.toISOString().slice(11, 19);
      }
    },
    [preferences?.timezone, preferences?.timeFormat],
  );

  const formatDecimal = useCallback(
    (val: number | string | null | undefined, decimals?: number): string => {
      if (val === null || val === undefined || val === "") return "—";
      const n = typeof val === "string" ? Number(val) : val;
      if (isNaN(n)) return String(val);
      const dec = decimals ?? preferences?.decimalPlaces ?? 2;
      return n.toLocaleString("en-US", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      });
    },
    [preferences?.decimalPlaces],
  );

  const formatPnl = useCallback(
    (val: number | string | null | undefined, currency: string = "USD"): string => {
      if (val === null || val === undefined || val === "") return "—";
      const n = typeof val === "string" ? Number(val) : val;
      if (isNaN(n)) return String(val);

      const dec = preferences?.decimalPlaces ?? 2;
      const formattedNum = Math.abs(n).toLocaleString("en-US", {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      });

      const sign = n > 0 ? "+" : n < 0 ? "-" : "";
      return `${sign}$${formattedNum} ${currency}`;
    },
    [preferences?.decimalPlaces],
  );

  const value = useMemo(
    () => ({
      preferences,
      isLoading,
      error,
      updatePreferences: handleUpdate,
      resetPreferences: handleReset,
      refreshPreferences,
      formatDate,
      formatTime,
      formatPnl,
      formatDecimal,
    }),
    [
      preferences,
      isLoading,
      error,
      handleUpdate,
      handleReset,
      refreshPreferences,
      formatDate,
      formatTime,
      formatPnl,
      formatDecimal,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    // Graceful fallback for tests or components rendered outside provider
    return {
      preferences: null,
      isLoading: false,
      error: null,
      updatePreferences: async () => {
        throw new Error("SettingsProvider missing");
      },
      resetPreferences: async () => {
        throw new Error("SettingsProvider missing");
      },
      refreshPreferences: async () => {},
      formatDate: (d) => (d ? new Date(d).toISOString().split("T")[0]! : "—"),
      formatTime: (d) => (d ? new Date(d).toISOString().slice(11, 19) : "—"),
      formatPnl: (v) => (v !== null && v !== undefined ? `$${v}` : "—"),
      formatDecimal: (v) => (v !== null && v !== undefined ? String(v) : "—"),
    };
  }
  return context;
}
