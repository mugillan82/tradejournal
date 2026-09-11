/**
 * Attachment Domain — Service
 *
 * Production-grade service for managing trade evidence attachments.
 * Enforces server-side authentication, trade ownership validation,
 * input validation, safe storage operations, and metadata persistence.
 */

import "server-only";

import { randomUUID } from "crypto";
import path from "path";
import { prisma } from "@/lib/db/client";
import { requireServerUserId } from "@/lib/auth/session";
import type { AttachmentDto } from "./types";
import {
  AttachmentServiceError,
  createAuthRequiredError,
  createNotFoundError,
  createValidationError,
  createDatabaseError,
} from "./errors";
import { validateAttachmentUpload } from "./validation";
import { getAttachmentStorageProvider } from "./storage";

async function resolveUserId(): Promise<string> {
  try {
    return await requireServerUserId();
  } catch {
    throw createAuthRequiredError();
  }
}

async function verifyTradeOwnership(tradeId: string, userId: string): Promise<void> {
  try {
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
      select: { id: true },
    });

    if (!trade) {
      throw createNotFoundError("Trade");
    }
  } catch (err) {
    if (err instanceof AttachmentServiceError) throw err;
    throw createDatabaseError(err);
  }
}

function toAttachmentDto(record: {
  id: string;
  tradeId: string | null;
  journalEntryId: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: Date;
}): AttachmentDto {
  return {
    id: record.id,
    tradeId: record.tradeId,
    journalEntryId: record.journalEntryId,
    fileName: record.fileName,
    fileUrl: record.fileUrl,
    fileSize: record.fileSize,
    mimeType: record.mimeType,
    uploadedAt: record.uploadedAt,
  };
}

function getStorageKey(tradeId: string, attachmentId: string, fileName: string): string {
  const ext = path.extname(fileName).toLowerCase() || ".bin";
  return `trades/${tradeId}/${attachmentId}${ext}`;
}

/**
 * Lists all attachments for a specific trade.
 */
export async function listTradeAttachments(tradeId: string): Promise<ReadonlyArray<AttachmentDto>> {
  const userId = await resolveUserId();

  if (!tradeId || typeof tradeId !== "string") {
    throw createValidationError([{ path: "tradeId", message: "tradeId is required" }]);
  }

  await verifyTradeOwnership(tradeId, userId);

  try {
    const records = await prisma.attachment.findMany({
      where: { tradeId },
      orderBy: { uploadedAt: "desc" },
    });

    return records.map(toAttachmentDto);
  } catch (err) {
    throw createDatabaseError(err);
  }
}

/**
 * Uploads a new attachment file and records its metadata for a trade.
 */
export async function uploadTradeAttachment(
  tradeId: string,
  input: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  },
): Promise<AttachmentDto> {
  const userId = await resolveUserId();

  if (!tradeId || typeof tradeId !== "string") {
    throw createValidationError([{ path: "tradeId", message: "tradeId is required" }]);
  }

  await verifyTradeOwnership(tradeId, userId);

  const validation = validateAttachmentUpload({
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.buffer?.length,
    buffer: input.buffer,
  });

  if (!validation.isValid) {
    throw createValidationError(validation.errors);
  }

  const cleanFileName = validation.sanitizedFileName!;
  const normalizedMimeType = validation.normalizedMimeType!;
  const attachmentId = randomUUID();
  const storageKey = getStorageKey(tradeId, attachmentId, cleanFileName);
  const downloadUrl = `/api/trades/${encodeURIComponent(tradeId)}/attachments/${encodeURIComponent(attachmentId)}/download`;

  // 1. Save file to storage provider
  const storage = getAttachmentStorageProvider();
  await storage.save(storageKey, input.buffer, normalizedMimeType);

  // 2. Save metadata in database
  try {
    const record = await prisma.attachment.create({
      data: {
        id: attachmentId,
        tradeId,
        fileName: cleanFileName,
        fileUrl: downloadUrl,
        fileSize: input.buffer.length,
        mimeType: normalizedMimeType,
      },
    });

    return toAttachmentDto(record);
  } catch (err) {
    // Clean up storage if database insert fails
    await storage.delete(storageKey).catch(() => {});
    throw createDatabaseError(err);
  }
}

/**
 * Deletes an attachment from storage and database.
 */
export async function deleteTradeAttachment(tradeId: string, attachmentId: string): Promise<void> {
  const userId = await resolveUserId();

  if (!tradeId || typeof tradeId !== "string") {
    throw createValidationError([{ path: "tradeId", message: "tradeId is required" }]);
  }
  if (!attachmentId || typeof attachmentId !== "string") {
    throw createValidationError([{ path: "attachmentId", message: "attachmentId is required" }]);
  }

  await verifyTradeOwnership(tradeId, userId);

  let existing;
  try {
    existing = await prisma.attachment.findFirst({
      where: { id: attachmentId, tradeId },
    });
  } catch (err) {
    throw createDatabaseError(err);
  }

  if (!existing) {
    throw createNotFoundError("Attachment");
  }

  const storageKey = getStorageKey(tradeId, attachmentId, existing.fileName);
  const storage = getAttachmentStorageProvider();

  // Delete from DB first
  try {
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });
  } catch (err) {
    throw createDatabaseError(err);
  }

  // Delete from storage provider
  await storage.delete(storageKey).catch((storageErr) => {
    console.error("[AttachmentService] Failed to clean up file from storage:", storageErr);
  });
}

/**
 * Retrieves attachment metadata and binary content for secure streaming / download.
 */
export async function getTradeAttachmentContent(
  tradeId: string,
  attachmentId: string,
): Promise<{
  attachment: AttachmentDto;
  data: Buffer;
  contentType: string;
}> {
  const userId = await resolveUserId();

  if (!tradeId || typeof tradeId !== "string") {
    throw createValidationError([{ path: "tradeId", message: "tradeId is required" }]);
  }
  if (!attachmentId || typeof attachmentId !== "string") {
    throw createValidationError([{ path: "attachmentId", message: "attachmentId is required" }]);
  }

  await verifyTradeOwnership(tradeId, userId);

  let record;
  try {
    record = await prisma.attachment.findFirst({
      where: { id: attachmentId, tradeId },
    });
  } catch (err) {
    throw createDatabaseError(err);
  }

  if (!record) {
    throw createNotFoundError("Attachment");
  }

  const storageKey = getStorageKey(tradeId, attachmentId, record.fileName);
  const storage = getAttachmentStorageProvider();
  const file = await storage.get(storageKey);

  if (!file) {
    throw createNotFoundError("Attachment file content");
  }

  return {
    attachment: toAttachmentDto(record),
    data: file.data,
    contentType: record.mimeType || "application/octet-stream",
  };
}
