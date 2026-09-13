import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { GET as listReviewsRoute, POST as createReviewRoute } from "./route";
import { GET as getReviewRoute, PATCH as updateReviewRoute, DELETE as deleteReviewRoute } from "./[id]/route";
import { PATCH as updateReviewStatusRoute } from "./[id]/status/route";

import * as authSession from "@/lib/auth/session";
import * as journalService from "@/lib/trading/journal/service";
import { createNotFoundError } from "@/lib/trading/journal/errors";

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: vi.fn(),
}));

vi.mock("@/lib/trading/journal/service", () => ({
  listReviews: vi.fn(),
  createReview: vi.fn(),
  getReviewById: vi.fn(),
  updateReview: vi.fn(),
  updateReviewStatus: vi.fn(),
  deleteReview: vi.fn(),
}));

describe("Trade Reviews API Routes", () => {
  const mockUserId = "usr-test-123";
  const mockReviewId = "review-test-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 UNAUTHENTICATED when unauthenticated on GET /api/reviews", async () => {
      vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("Unauthorized"));

      const request = new NextRequest("http://localhost:3000/api/reviews");
      const response = await listReviewsRoute(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHENTICATED");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("returns 401 UNAUTHENTICATED when unauthenticated on POST /api/reviews", async () => {
      vi.mocked(authSession.requireServerUserId).mockRejectedValue(new Error("Unauthorized"));

      const request = new NextRequest("http://localhost:3000/api/reviews", {
        method: "POST",
        body: JSON.stringify({ reviewDate: "2026-05-15" }),
      });
      const response = await createReviewRoute(request);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/reviews", () => {
    it("returns 200 with review list and filters applied", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.listReviews).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });

      const request = new NextRequest("http://localhost:3000/api/reviews?status=COMPLETED&rating=9");
      const response = await listReviewsRoute(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.items).toBeDefined();
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(journalService.listReviews).toHaveBeenCalledWith(
        expect.objectContaining({ status: "COMPLETED", rating: 9 }),
        expect.any(Object),
      );
    });
  });

  describe("POST /api/reviews", () => {
    it("returns 201 with created review", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      const mockResult = {
        id: mockReviewId,
        userId: mockUserId,
        title: "Weekly Debrief",
        reviewDate: new Date("2026-05-15T00:00:00Z"),
        status: "DRAFT" as const,
        thesis: "Trend trading",
        whatWentWell: "Discipline",
        whatWentWrong: "None",
        executionQuality: 9,
        ruleAdherence: 10,
        riskManagement: 9,
        emotionalObservations: "Calm",
        lessonsLearned: "Patience pays",
        improvementActions: "Keep going",
        notes: null,
        rating: 9,
        templateId: null,
        templateName: null,
        trades: [],
        tags: [],
        mistakes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(journalService.createReview).mockResolvedValue(mockResult);

      const request = new NextRequest("http://localhost:3000/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          reviewDate: "2026-05-15",
          title: "Weekly Debrief",
          status: "DRAFT",
          rating: 9,
        }),
      });
      const response = await createReviewRoute(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.id).toBe(mockReviewId);
      expect(body.status).toBe("DRAFT");
    });
  });

  describe("GET /api/reviews/[id]", () => {
    it("returns 404 when review does not exist", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.getReviewById).mockRejectedValue(
        createNotFoundError("Review"),
      );

      const request = new NextRequest(`http://localhost:3000/api/reviews/${mockReviewId}`);
      const response = await getReviewRoute(request, { params: Promise.resolve({ id: mockReviewId }) });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/reviews/[id]", () => {
    it("updates review successfully", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.updateReview).mockResolvedValue({
        id: mockReviewId,
        userId: mockUserId,
        title: "Updated Title",
        reviewDate: new Date(),
        status: "DRAFT",
        thesis: null,
        whatWentWell: null,
        whatWentWrong: null,
        executionQuality: null,
        ruleAdherence: null,
        riskManagement: null,
        emotionalObservations: null,
        lessonsLearned: null,
        improvementActions: null,
        notes: null,
        rating: null,
        templateId: null,
        templateName: null,
        trades: [],
        tags: [],
        mistakes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest(`http://localhost:3000/api/reviews/${mockReviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Title" }),
      });
      const response = await updateReviewRoute(request, { params: Promise.resolve({ id: mockReviewId }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.title).toBe("Updated Title");
    });
  });

  describe("PATCH /api/reviews/[id]/status", () => {
    it("updates review status successfully", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.updateReviewStatus).mockResolvedValue({
        id: mockReviewId,
        userId: mockUserId,
        title: "Weekly Debrief",
        reviewDate: new Date(),
        status: "COMPLETED",
        thesis: null,
        whatWentWell: null,
        whatWentWrong: null,
        executionQuality: null,
        ruleAdherence: null,
        riskManagement: null,
        emotionalObservations: null,
        lessonsLearned: null,
        improvementActions: null,
        notes: null,
        rating: null,
        templateId: null,
        templateName: null,
        trades: [],
        tags: [],
        mistakes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest(`http://localhost:3000/api/reviews/${mockReviewId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const response = await updateReviewStatusRoute(request, { params: Promise.resolve({ id: mockReviewId }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("COMPLETED");
    });

    it("rejects request if status field is missing in body", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);

      const request = new NextRequest(`http://localhost:3000/api/reviews/${mockReviewId}/status`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const response = await updateReviewStatusRoute(request, { params: Promise.resolve({ id: mockReviewId }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("DELETE /api/reviews/[id]", () => {
    it("deletes review successfully and returns 204", async () => {
      vi.mocked(authSession.requireServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(journalService.deleteReview).mockResolvedValue(undefined);

      const request = new NextRequest(`http://localhost:3000/api/reviews/${mockReviewId}`, {
        method: "DELETE",
      });
      const response = await deleteReviewRoute(request, { params: Promise.resolve({ id: mockReviewId }) });

      expect(response.status).toBe(204);
    });
  });
});
