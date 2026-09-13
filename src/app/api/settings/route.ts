import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/trading/settings/service";
import { SettingsValidationError } from "@/lib/trading/settings/validation";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET() {
  let userId: string;
  try {
    userId = await requireServerUserId();
  } catch {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const preferences = await getUserPreferences(userId);
    return NextResponse.json({ data: preferences }, { headers: NO_STORE_HEADERS });
  } catch (err: unknown) {
    if (err instanceof SettingsValidationError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: err.message,
            details: err.fieldErrors,
          },
        },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to retrieve user preferences" } },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function PATCH(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireServerUserId();
  } catch {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const updated = await updateUserPreferences(userId, body);
    return NextResponse.json({ data: updated }, { headers: NO_STORE_HEADERS });
  } catch (err: unknown) {
    if (err instanceof SettingsValidationError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: err.message,
            details: err.fieldErrors,
          },
        },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update user preferences" } },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed. Use PATCH or /api/settings/reset" } },
    { status: 405, headers: { Allow: "GET, PATCH", ...NO_STORE_HEADERS } },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } },
    { status: 405, headers: { Allow: "GET, PATCH", ...NO_STORE_HEADERS } },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } },
    { status: 405, headers: { Allow: "GET, PATCH", ...NO_STORE_HEADERS } },
  );
}
