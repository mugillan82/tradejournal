import { describe, it, expect } from "vitest";
import {
  validateAttachmentUpload,
  sanitizeFileName,
} from "./validation";
import { MAX_ATTACHMENT_SIZE_BYTES } from "./types";

describe("Attachment Validation", () => {
  describe("sanitizeFileName", () => {
    it("preserves standard filenames", () => {
      expect(sanitizeFileName("chart_btc_1h.png")).toBe("chart_btc_1h.png");
    });

    it("strips path traversal sequences (slashes, backslashes, dots)", () => {
      expect(sanitizeFileName("../../../etc/passwd.jpg")).toBe("passwd.jpg");
      expect(sanitizeFileName("..\\..\\windows\\system32.png")).toBe("system32.png");
    });

    it("strips null bytes and control characters", () => {
      expect(sanitizeFileName("evil\0file.pdf")).toBe("evilfile.pdf");
    });

    it("falls back to attachment for empty or invalid names", () => {
      expect(sanitizeFileName("")).toBe("attachment");
      expect(sanitizeFileName("   ")).toBe("attachment");
      expect(sanitizeFileName("///")).toBe("attachment");
    });

    it("truncates names longer than 255 characters", () => {
      const longName = "a".repeat(300) + ".png";
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });

  describe("validateAttachmentUpload", () => {
    const validPngBuffer = Buffer.from("dummy png content");

    it("accepts valid PNG image", () => {
      const result = validateAttachmentUpload({
        fileName: "setup_trade.png",
        mimeType: "image/png",
        size: validPngBuffer.length,
        buffer: validPngBuffer,
      });

      expect(result.isValid).toBe(true);
      expect(result.sanitizedFileName).toBe("setup_trade.png");
      expect(result.normalizedMimeType).toBe("image/png");
    });

    it("accepts valid PDF document", () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 dummy pdf");
      const result = validateAttachmentUpload({
        fileName: "statement.pdf",
        mimeType: "application/pdf",
        size: pdfBuffer.length,
        buffer: pdfBuffer,
      });

      expect(result.isValid).toBe(true);
      expect(result.normalizedMimeType).toBe("application/pdf");
    });

    it("rejects empty file buffer", () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = validateAttachmentUpload({
        fileName: "empty.png",
        mimeType: "image/png",
        size: 0,
        buffer: emptyBuffer,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message === "File cannot be empty")).toBe(true);
    });

    it("rejects oversized file buffer (> 10MB)", () => {
      const oversizedBuffer = Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES + 1024);
      const result = validateAttachmentUpload({
        fileName: "huge_chart.png",
        mimeType: "image/png",
        size: oversizedBuffer.length,
        buffer: oversizedBuffer,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("exceeds the maximum"))).toBe(true);
    });

    it("rejects unsupported MIME type (e.g. text/html, application/x-msdownload)", () => {
      const exeBuffer = Buffer.from("MZ dummy exe");
      const result = validateAttachmentUpload({
        fileName: "malicious.exe",
        mimeType: "application/x-msdownload",
        size: exeBuffer.length,
        buffer: exeBuffer,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("Unsupported file type"))).toBe(true);
    });
  });
});
