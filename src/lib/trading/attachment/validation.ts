/**
 * Attachment Domain — Input Validation
 *
 * Enforces file size, MIME type whitelist, filename safety, and non-emptiness.
 */

import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENT_SIZE_LABEL,
  type AllowedAttachmentMimeType,
} from "./types";
import type { FieldError } from "./errors";

export interface AttachmentValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<FieldError>;
  readonly sanitizedFileName?: string;
  readonly normalizedMimeType?: AllowedAttachmentMimeType;
}

/**
 * Sanitizes a client-provided filename:
 * - Strips directory traversal characters (`/`, `\`, `..`)
 * - Strips control characters and null bytes
 * - Truncates basename if excessively long while preserving valid extension
 */
export function sanitizeFileName(rawFileName: string): string {
  if (!rawFileName || typeof rawFileName !== "string") {
    return "attachment";
  }

  // Extract base filename without any path segments
  const basename = rawFileName.split(/[/\\]/).pop() || "attachment";

  // Strip null bytes and non-printable control characters
  let clean = basename.replace(/[\x00-\x1f\x7f]/g, "").trim();

  // Strip leading dots to avoid hidden files or relative path confusion
  clean = clean.replace(/^\.+/, "");

  if (!clean) {
    clean = "attachment";
  }

  // Limit max length to 255 characters
  if (clean.length > 255) {
    const extIdx = clean.lastIndexOf(".");
    if (extIdx > 0 && clean.length - extIdx <= 10) {
      const ext = clean.substring(extIdx);
      const namePart = clean.substring(0, 255 - ext.length);
      clean = `${namePart}${ext}`;
    } else {
      clean = clean.substring(0, 255);
    }
  }

  return clean;
}

/**
 * Validates an upload attempt.
 */
export function validateAttachmentUpload(input: {
  readonly fileName?: unknown;
  readonly mimeType?: unknown;
  readonly size?: unknown;
  readonly buffer?: unknown;
}): AttachmentValidationResult {
  const errors: FieldError[] = [];

  // 1. Filename validation
  if (!input.fileName || typeof input.fileName !== "string" || !input.fileName.trim()) {
    errors.push({ path: "fileName", message: "Filename is required" });
  }

  const cleanName = typeof input.fileName === "string" ? sanitizeFileName(input.fileName) : "attachment";

  // 2. MIME Type validation
  if (!input.mimeType || typeof input.mimeType !== "string" || !input.mimeType.trim()) {
    errors.push({ path: "mimeType", message: "File type is required" });
  } else {
    const normalized = input.mimeType.toLowerCase().trim();
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(normalized as AllowedAttachmentMimeType)) {
      errors.push({
        path: "mimeType",
        message: `Unsupported file type: ${input.mimeType}. Allowed types: PNG, JPEG, WebP, PDF`,
      });
    }
  }

  // 3. Size validation
  if (input.size === undefined || input.size === null || typeof input.size !== "number" || isNaN(input.size)) {
    errors.push({ path: "fileSize", message: "File size must be a valid number" });
  } else if (input.size <= 0) {
    errors.push({ path: "fileSize", message: "File cannot be empty" });
  } else if (input.size > MAX_ATTACHMENT_SIZE_BYTES) {
    errors.push({
      path: "fileSize",
      message: `File size exceeds the maximum limit of ${MAX_ATTACHMENT_SIZE_LABEL}`,
    });
  }

  // 4. Buffer verification
  if (!input.buffer || !(input.buffer instanceof Buffer || input.buffer instanceof Uint8Array)) {
    errors.push({ path: "file", message: "File data buffer is missing or invalid" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedFileName: cleanName,
    normalizedMimeType:
      typeof input.mimeType === "string"
        ? (input.mimeType.toLowerCase().trim() as AllowedAttachmentMimeType)
        : undefined,
  };
}
