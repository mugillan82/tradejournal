import { NextRequest, NextResponse } from "next/server";
import { requireServerUserId } from "@/lib/auth/session";
import { confirmImport, ConfirmImportEvidenceItem } from "@/lib/trading/import/service";
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

  const contentType = request.headers.get("content-type") || "";
  let candidates: NormalizedTradeCandidate[] = [];
  const evidenceMap: Record<string, ConfirmImportEvidenceItem> = {};

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const candidatesRaw = formData.get("candidates");
      if (!candidatesRaw || typeof candidatesRaw !== "string") {
        return NextResponse.json({ error: { message: "candidates array is required" } }, { status: 400 });
      }

      candidates = JSON.parse(candidatesRaw);
      if (!Array.isArray(candidates)) {
        return NextResponse.json({ error: { message: "candidates must be an array" } }, { status: 400 });
      }

      // Check for generic or candidate-specific evidence files
      const defaultEvidence = formData.get("evidence") as File | null;
      let defaultEvidenceItem: ConfirmImportEvidenceItem | null = null;
      if (defaultEvidence && typeof defaultEvidence === "object" && "arrayBuffer" in defaultEvidence) {
        const arrayBuf = await defaultEvidence.arrayBuffer();
        defaultEvidenceItem = {
          fileName: defaultEvidence.name || "screenshot.png",
          mimeType: defaultEvidence.type || "image/png",
          buffer: Buffer.from(arrayBuf),
        };
      }

      for (const cand of candidates) {
        if (!cand || !cand.candidateId) continue;
        const candidateFile = formData.get(`evidence_${cand.candidateId}`) as File | null;
        if (candidateFile && typeof candidateFile === "object" && "arrayBuffer" in candidateFile) {
          const arrayBuf = await candidateFile.arrayBuffer();
          evidenceMap[cand.candidateId] = {
            fileName: candidateFile.name || "screenshot.png",
            mimeType: candidateFile.type || "image/png",
            buffer: Buffer.from(arrayBuf),
          };
        } else if (defaultEvidenceItem) {
          evidenceMap[cand.candidateId] = defaultEvidenceItem;
        }
      }
    } catch {
      return NextResponse.json({ error: { message: "Invalid form data" } }, { status: 400 });
    }
  } else {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: { message: "Invalid JSON body" } }, { status: 400 });
    }

    if (!body || typeof body !== "object" || !("candidates" in body)) {
      return NextResponse.json({ error: { message: "candidates array is required" } }, { status: 400 });
    }

    candidates = (body as { candidates: NormalizedTradeCandidate[] }).candidates;
    if (!Array.isArray(candidates)) {
      return NextResponse.json({ error: { message: "candidates array is required" } }, { status: 400 });
    }

    const rawEvidence = (body as { evidence?: Record<string, { fileName: string; mimeType: string; base64: string }> }).evidence;
    if (rawEvidence && typeof rawEvidence === "object") {
      for (const [candId, item] of Object.entries(rawEvidence)) {
        if (item && typeof item === "object" && typeof item.base64 === "string") {
          evidenceMap[candId] = {
            fileName: item.fileName || "screenshot.png",
            mimeType: item.mimeType || "image/png",
            buffer: Buffer.from(item.base64, "base64"),
          };
        }
      }
    }
  }

  // Basic sanity check that these are valid objects
  if (candidates.length > 0 && typeof candidates[0].tradingAccountId !== "string") {
    return NextResponse.json({ error: { message: "Invalid candidate objects" } }, { status: 400 });
  }

  try {
    const result = await confirmImport(candidates, Object.keys(evidenceMap).length > 0 ? evidenceMap : undefined);

    // Return 200 with result
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Confirm import error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: { message: errorMessage } }, { status: 500 });
  }
}
