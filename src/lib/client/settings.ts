/**
 * Client API utilities for Settings & User Preferences
 */

import type {
  UserPreferencesDto,
  UpdatePreferencesInput,
  ResetPreferencesCategory,
} from "@/lib/trading/settings/types";

export class SettingsClientApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "SettingsClientApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  let json: { data?: T; error?: { message?: string; code?: string; details?: Record<string, string> } };
  try {
    json = await res.json();
  } catch {
    throw new SettingsClientApiError("Network or server parsing error", res.status);
  }

  if (!res.ok) {
    const errorMsg = json?.error?.message || `Request failed with status ${res.status}`;
    throw new SettingsClientApiError(
      errorMsg,
      res.status,
      json?.error?.code,
      json?.error?.details,
    );
  }

  if (!json || !("data" in json)) {
    throw new SettingsClientApiError("Malformed API response: missing 'data'", res.status);
  }

  return json.data as T;
}

export async function fetchSettingsClient(
  signal?: AbortSignal,
): Promise<UserPreferencesDto> {
  const res = await fetch("/api/settings", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  return handleResponse<UserPreferencesDto>(res);
}

export async function updateSettingsClient(
  input: UpdatePreferencesInput,
  signal?: AbortSignal,
): Promise<UserPreferencesDto> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(input),
    signal,
  });

  return handleResponse<UserPreferencesDto>(res);
}

export async function resetSettingsClient(
  category: ResetPreferencesCategory = "all",
  signal?: AbortSignal,
): Promise<UserPreferencesDto> {
  const res = await fetch("/api/settings/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({ category }),
    signal,
  });

  return handleResponse<UserPreferencesDto>(res);
}
