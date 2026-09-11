import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSession = vi.hoisted(() => ({ currentUserId: null as string | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({
  requireServerUserId: async () => {
    if (!mockSession.currentUserId) {
      throw new Error("Unauthorized: authentication required");
    }
    return mockSession.currentUserId;
  },
  getServerUserId: async () => mockSession.currentUserId,
}));

const mockPrismaHolder = vi.hoisted(() => ({
  current: {
    trade: {
      findFirst: vi.fn(),
    },
    attachment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/client", () => ({
  get prisma() {
    return mockPrismaHolder.current;
  },
}));

// Mock storage provider
const mockStorage = {
  save: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue({
    data: Buffer.from("file-binary"),
    contentType: "image/png",
    contentLength: 11,
  }),
  delete: vi.fn().mockResolvedValue(undefined),
};

vi.mock("./storage", () => ({
  getAttachmentStorageProvider: () => mockStorage,
}));

import {
  listTradeAttachments,
  uploadTradeAttachment,
  deleteTradeAttachment,
  getTradeAttachmentContent,
} from "./service";

describe("Attachment Service", () => {
  const USER_A = "user-a";
  const TRADE_ID = "trade-123";

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.currentUserId = USER_A;
  });

  describe("Authentication", () => {
    it("throws AUTH_REQUIRED if session is not present", async () => {
      mockSession.currentUserId = null;

      await expect(listTradeAttachments(TRADE_ID)).rejects.toMatchObject({
        code: "AUTH_REQUIRED",
        httpStatus: 401,
      });
    });
  });

  describe("listTradeAttachments", () => {
    it("rejects if trade does not belong to the user", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce(null);

      await expect(listTradeAttachments(TRADE_ID)).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });

      expect(mockPrismaHolder.current.trade.findFirst).toHaveBeenCalledWith({
        where: { id: TRADE_ID, userId: USER_A },
        select: { id: true },
      });
    });

    it("returns list of attachments for owned trade", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce({
        id: TRADE_ID,
      });

      const mockDbAttachments = [
        {
          id: "att-1",
          tradeId: TRADE_ID,
          journalEntryId: null,
          fileName: "chart1.png",
          fileUrl: "/api/trades/trade-123/attachments/att-1/download",
          fileSize: 1024,
          mimeType: "image/png",
          uploadedAt: new Date("2026-01-01T00:00:00Z"),
        },
      ];
      mockPrismaHolder.current.attachment.findMany.mockResolvedValueOnce(mockDbAttachments);

      const result = await listTradeAttachments(TRADE_ID);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("att-1");
      expect(result[0].fileName).toBe("chart1.png");
    });
  });

  describe("uploadTradeAttachment", () => {
    it("rejects if trade is not owned", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce(null);

      await expect(
        uploadTradeAttachment(TRADE_ID, {
          fileName: "test.png",
          mimeType: "image/png",
          buffer: Buffer.from("data"),
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });

    it("validates file payload and creates database and storage records", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce({
        id: TRADE_ID,
      });

      const fakeAttachment = {
        id: "att-new",
        tradeId: TRADE_ID,
        journalEntryId: null,
        fileName: "test.png",
        fileUrl: "/api/trades/trade-123/attachments/att-new/download",
        fileSize: 4,
        mimeType: "image/png",
        uploadedAt: new Date(),
      };
      mockPrismaHolder.current.attachment.create.mockResolvedValueOnce(fakeAttachment);

      const result = await uploadTradeAttachment(TRADE_ID, {
        fileName: "test.png",
        mimeType: "image/png",
        buffer: Buffer.from("data"),
      });

      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockPrismaHolder.current.attachment.create).toHaveBeenCalled();
      expect(result.id).toBe("att-new");
    });

    it("throws VALIDATION for invalid files", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce({
        id: TRADE_ID,
      });

      await expect(
        uploadTradeAttachment(TRADE_ID, {
          fileName: "bad.exe",
          mimeType: "application/x-msdownload",
          buffer: Buffer.from("exe"),
        }),
      ).rejects.toMatchObject({
        code: "VALIDATION",
        httpStatus: 400,
      });
    });
  });

  describe("deleteTradeAttachment", () => {
    it("rejects if trade is not owned", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce(null);

      await expect(deleteTradeAttachment(TRADE_ID, "att-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });

    it("rejects if attachment not found on trade", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce({
        id: TRADE_ID,
      });
      mockPrismaHolder.current.attachment.findFirst.mockResolvedValueOnce(null);

      await expect(deleteTradeAttachment(TRADE_ID, "att-missing")).rejects.toMatchObject({
        code: "NOT_FOUND",
        httpStatus: 404,
      });
    });

    it("deletes from storage and database when valid", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce({
        id: TRADE_ID,
      });
      mockPrismaHolder.current.attachment.findFirst.mockResolvedValueOnce({
        id: "att-1",
        tradeId: TRADE_ID,
        fileName: "chart.png",
      });
      mockPrismaHolder.current.attachment.delete.mockResolvedValueOnce({});

      await deleteTradeAttachment(TRADE_ID, "att-1");

      expect(mockStorage.delete).toHaveBeenCalledWith("trades/trade-123/att-1.png");
      expect(mockPrismaHolder.current.attachment.delete).toHaveBeenCalledWith({
        where: { id: "att-1" },
      });
    });
  });

  describe("getTradeAttachmentContent", () => {
    it("returns metadata and file buffer for owned attachment", async () => {
      mockPrismaHolder.current.trade.findFirst.mockResolvedValueOnce({
        id: TRADE_ID,
      });
      mockPrismaHolder.current.attachment.findFirst.mockResolvedValueOnce({
        id: "att-1",
        tradeId: TRADE_ID,
        fileName: "chart.png",
        fileUrl: "/api/trades/trade-123/attachments/att-1/download",
        mimeType: "image/png",
        fileSize: 1024,
        uploadedAt: new Date(),
      });

      const result = await getTradeAttachmentContent(TRADE_ID, "att-1");
      expect(result.attachment.fileName).toBe("chart.png");
      expect(result.data).toEqual(Buffer.from("file-binary"));
    });
  });
});
