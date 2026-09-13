import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { confirmImport } from "@/lib/trading/import/service";
import { NormalizedTradeCandidate } from "@/lib/trading/import/types";

export async function POST(request: NextRequest) {
  try {
    await requireServerUserId();
  } catch {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("candidates" in body)) {
    return NextResponse.json({ error: { message: "candidates array is required" } }, { status: 400 });
  }

  const candidates = (body as { candidates: NormalizedTradeCandidate[] }).candidates;
  if (!Array.isArray(candidates)) {
    return NextResponse.json({ error: { message: "candidates array is required" } }, { status: 400 });
  }

  // Basic sanity check that these are the right objects
  if (candidates.length > 0 && typeof candidates[0].tradingAccountId !== "string") {
    return NextResponse.json({ error: { message: "Invalid candidate objects" } }, { status: 400 });
  }

  try {
    const result = await confirmImport(candidates);
    
    // We can return a 200 even if some failed, and let the client handle partial failures.
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Confirm import error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: { message: errorMessage } }, { status: 500 });
  }
}
