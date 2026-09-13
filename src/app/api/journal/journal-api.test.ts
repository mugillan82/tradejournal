import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { GET as listJournalEntriesRoute, POST as createJournalEntryRoute } from "./route";
import { GET as getJournalEntryRoute, PATCH as updateJournalEntryRoute, DELETE as deleteJournalEntryRoute } from "./[id]/route";
import { GET as getJournalByDateRoute } from "./by-date/route";

import * as authSession from "@/lib/auth/session";
import * as journalService from "@/lib/trading/journal/service";
import { createConflictError, createNotFoundError } from "@/lib/trading/journal/errors";

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/journal/service", () => ({
  listJournalEntries: vi.fn(),
  createJournalEntry: vi.fn(),
  getJournalEntryById: vi.fn(),
  getJournalEntryByDate: vi.fn(),
  updateJournalEntry: vi.fn(),
  deleteJournalEntry: vi.fn(),
}));

describe("Journal API Routes", () => {
  const mockUserId = "usr-test-123";
  const mockEntryId = "entry-test-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 AUTH_REQUIRED when unauthenticated on GET /api/journal", async () => {
      vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("Unauthorized"));

      const request = new NextRequest("http://localhost:3000/api/journal");
      const response = await listJournalEntriesRoute(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe("AUTH_REQUIRED");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("returns 401 AUTH_REQUIRED when unauthenticated on POST /api/journal", async () => {
      vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("Unauthorized"));

      const request = new NextRequest("http://localhost:3000/api/journal", {
        method: "POST",
        body: JSON.stringify({ entryDate: "2026-05-15" }),
      });
      const response = await createJournalEntryRoute(request);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/journal", () => {
    it("returns 200 with journal list and no-store headers", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.listJournalEntries).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });

      const request = new NextRequest("http://localhost:3000/api/journal?search=open");
      const response = await listJournalEntriesRoute(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.items).toBeDefined();
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(journalService.listJournalEntries).toHaveBeenCalledWith(
        expect.objectContaining({ search: "open" }),
        expect.any(Object),
      );
    });
  });

  describe("POST /api/journal", () => {
    it("returns 201 with created journal entry", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      const mockResult = {
        id: mockEntryId,
        userId: mockUserId,
        entryDate: new Date("2026-05-15T00:00:00Z"),
        title: "Morning Open",
        mood: "GOOD" as const,
        energy: 8,
        focus: 9,
        notes: "Good discipline",
        tags: [],
        trades: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(journalService.createJournalEntry).mockResolvedValue(mockResult);

      const request = new NextRequest("http://localhost:3000/api/journal", {
        method: "POST",
        body: JSON.stringify({
          entryDate: "2026-05-15",
          title: "Morning Open",
          mood: "GOOD",
        }),
      });
      const response = await createJournalEntryRoute(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.id).toBe(mockEntryId);
    });

    it("returns 409 when service throws duplicate entry conflict", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.createJournalEntry).mockRejectedValue(
        createConflictError("A journal entry already exists for this date"),
      );

      const request = new NextRequest("http://localhost:3000/api/journal", {
        method: "POST",
        body: JSON.stringify({ entryDate: "2026-05-15" }),
      });
      const response = await createJournalEntryRoute(request);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error.code).toBe("CONFLICT");
    });
  });

  describe("GET /api/journal/[id]", () => {
    it("returns 404 when entry does not exist or not owned", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.getJournalEntryById).mockRejectedValue(
        createNotFoundError("Journal entry"),
      );

      const request = new NextRequest(`http://localhost:3000/api/journal/${mockEntryId}`);
      const response = await getJournalEntryRoute(request, { params: Promise.resolve({ id: mockEntryId }) });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/journal/by-date", () => {
    it("returns 200 with entry or null when not found", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.getJournalEntryByDate).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/journal/by-date?date=2026-05-15");
      const response = await getJournalByDateRoute(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toBeNull();
    });
  });

  describe("PATCH & DELETE /api/journal/[id]", () => {
    it("updates entry successfully", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.updateJournalEntry).mockResolvedValue({
        id: mockEntryId,
        userId: mockUserId,
        entryDate: new Date(),
        title: "Updated",
        mood: "VERY_GOOD" as const,
        energy: null,
        focus: null,
        notes: null,
        tags: [],
        trades: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest(`http://localhost:3000/api/journal/${mockEntryId}`, {
        method: "PATCH",
        body: JSON.stringify({ mood: "VERY_GOOD" }),
      });
      const response = await updateJournalEntryRoute(request, { params: Promise.resolve({ id: mockEntryId }) });
      expect(response.status).toBe(200);
    });

    it("deletes entry successfully", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.deleteJournalEntry).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost:3000/api/journal/${mockEntryId}`, {
        method: "DELETE",
      });
      const response = await deleteJournalEntryRoute(request, { params: Promise.resolve({ id: mockEntryId }) });

      expect(response.status).toBe(204);
    });
  });
});
