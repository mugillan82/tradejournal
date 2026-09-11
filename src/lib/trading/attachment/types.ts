/**
 * Trade Journal — Attachment Domain Types
 *
 * Types and constants for trade evidence and journal attachments.
 */

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
] as const;

export type AllowedAttachmentMimeType = (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

/** Maximum upload size per file (10 Megabytes) */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

/** Human-readable max size string for error messages and UI */
export const MAX_ATTACHMENT_SIZE_LABEL = "10 MB";

/**
 * Public Attachment DTO returned across domain boundaries.
 */
export interface AttachmentDto {
  readonly id: string;
  readonly tradeId: string | null;
  readonly journalEntryId: string | null;
  readonly fileName: string;
  readonly fileUrl: string;
  readonly fileSize: number | null;
  readonly mimeType: string | null;
  readonly uploadedAt: Date;
}

/**
 * Input contract for creating an attachment record in the service.
 */
export interface CreateAttachmentInput {
  readonly tradeId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly buffer: Buffer;
}
