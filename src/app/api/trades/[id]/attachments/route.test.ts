import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createNotFoundError,
} from "@/lib/trading/attachment/errors";

const mockListTradeAttachments = vi.fn();
const mockUploadTradeAttachment = vi.fn();
const mockDeleteTradeAttachment = vi.fn();
const mockGetTradeAttachmentContent = vi.fn();

vi.mock("@/lib/trading/attachment/service", () => ({
  listTradeAttachments: (...args: unknown[]) => mockListTradeAttachments(...args),
  uploadTradeAttachment: (...args: unknown[]) => mockUploadTradeAttachment(...args),
  deleteTradeAttachment: (...args: unknown[]) => mockDeleteTradeAttachment(...args),
  getTradeAttachmentContent: (...args: unknown[]) => mockGetTradeAttachmentContent(...args),
}));

const mockRequireServerUserId = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: () => mockRequireServerUserId(),
}));

vi.mock("server-only", () => ({}));

import * as ListUploadRoute from "./route";
import * as DeleteRoute from "./[attachmentId]/route";
import * as DownloadRoute from "./[attachmentId]/download/route";

describe("Attachment API Routes", () => {
  const TRADE_ID = "trade-123";
  const ATTACHMENT_ID = "att-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireServerUserId.mockResolvedValue("user-1");
  });

  describe("GET /api/trades/[id]/attachments", () => {
    it("returns 401 if unauthenticated", async () => {
      mockRequireServerUserId.mockRejectedValueOnce(new Error("Auth required"));
      const req = new NextRequest("http://localhost/api/trades/trade-123/attachments");
      const res = await ListUploadRoute.GET(req, { params: Promise.resolve({ id: TRADE_ID }) });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe("AUTH_REQUIRED");
    });

    it("returns 200 with attachment list for owned trade", async () => {
      const mockList = [
        {
          id: ATTACHMENT_ID,
          tradeId: TRADE_ID,
          fileName: "chart.png",
          mimeType: "image/png",
          fileSize: 1024,
          fileUrl: "/uploads/chart.png",
          uploadedAt: new Date(),
        },
      ];
      mockListTradeAttachments.mockResolvedValueOnce(mockList);

      const req = new NextRequest("http://localhost/api/trades/trade-123/attachments");
      const res = await ListUploadRoute.GET(req, { params: Promise.resolve({ id: TRADE_ID }) });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(ATTACHMENT_ID);
    });

    it("returns 404 when trade does not exist or belongs to another user", async () => {
      mockListTradeAttachments.mockRejectedValueOnce(
        createNotFoundError("Trade"),
      );

      const req = new NextRequest("http://localhost/api/trades/trade-123/attachments");
      const res = await ListUploadRoute.GET(req, { params: Promise.resolve({ id: TRADE_ID }) });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });

  describe("POST /api/trades/[id]/attachments", () => {
    it("returns 400 when body is not valid multipart form with file", async () => {
      const req = new NextRequest("http://localhost/api/trades/trade-123/attachments", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await ListUploadRoute.POST(req, { params: Promise.resolve({ id: TRADE_ID }) });
      expect(res.status).toBe(400);
    });

    it("returns 201 on successful file upload", async () => {
      const mockCreated = {
        id: ATTACHMENT_ID,
        tradeId: TRADE_ID,
        fileName: "screenshot.png",
        mimeType: "image/png",
        fileSize: 100,
        fileUrl: "/uploads/screenshot.png",
        uploadedAt: new Date(),
      };
      mockUploadTradeAttachment.mockResolvedValueOnce(mockCreated);

      const formData = new FormData();
      const fakeBlob = new Blob(["fake image data"], { type: "image/png" });
      formData.append("file", fakeBlob, "screenshot.png");

      const req = new NextRequest("http://localhost/api/trades/trade-123/attachments", {
        method: "POST",
        body: formData,
      });

      const res = await ListUploadRoute.POST(req, { params: Promise.resolve({ id: TRADE_ID }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe(ATTACHMENT_ID);
    });
  });

  describe("DELETE /api/trades/[id]/attachments/[attachmentId]", () => {
    it("returns 204 on successful deletion", async () => {
      mockDeleteTradeAttachment.mockResolvedValueOnce(undefined);

      const req = new NextRequest(`http://localhost/api/trades/${TRADE_ID}/attachments/${ATTACHMENT_ID}`, {
        method: "DELETE",
      });

      const res = await DeleteRoute.DELETE(req, {
        params: Promise.resolve({ id: TRADE_ID, attachmentId: ATTACHMENT_ID }),
      });

      expect(res.status).toBe(204);
    });

    it("returns 404 when attachment or trade not found", async () => {
      mockDeleteTradeAttachment.mockRejectedValueOnce(
        createNotFoundError("Attachment"),
      );

      const req = new NextRequest(`http://localhost/api/trades/${TRADE_ID}/attachments/${ATTACHMENT_ID}`, {
        method: "DELETE",
      });

      const res = await DeleteRoute.DELETE(req, {
        params: Promise.resolve({ id: TRADE_ID, attachmentId: ATTACHMENT_ID }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/trades/[id]/attachments/[attachmentId]/download", () => {
    it("returns 200 with file binary and safe headers", async () => {
      mockGetTradeAttachmentContent.mockResolvedValueOnce({
        attachment: {
          id: ATTACHMENT_ID,
          fileName: "chart.png",
          mimeType: "image/png",
          fileSize: 10,
        },
        data: Buffer.from("image-binary"),
      });

      const req = new NextRequest(`http://localhost/api/trades/${TRADE_ID}/attachments/${ATTACHMENT_ID}/download`);
      const res = await DownloadRoute.GET(req, {
        params: Promise.resolve({ id: TRADE_ID, attachmentId: ATTACHMENT_ID }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    });
  });
});
