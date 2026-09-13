import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { resetUserPreferences } from "@/lib/trading/settings/service";
import { SettingsValidationError } from "@/lib/trading/settings/validation";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireServerUserId();
  } catch {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  let category: unknown = "all";
  try {
    const text = await request.text();
    if (text && text.trim().length > 0) {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && "category" in parsed) {
        category = parsed.category;
      }
    }
  } catch {
    // If parsing fails, default to "all"
  }

  try {
    const reset = await resetUserPreferences(userId, category);
    return NextResponse.json({ data: reset }, { headers: NO_STORE_HEADERS });
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
      { error: { code: "INTERNAL_ERROR", message: "Failed to reset preferences" } },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } },
    { status: 405, headers: { Allow: "POST", ...NO_STORE_HEADERS } },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } },
    { status: 405, headers: { Allow: "POST", ...NO_STORE_HEADERS } },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" } },
    { status: 405, headers: { Allow: "POST", ...NO_STORE_HEADERS } },
  );
}
