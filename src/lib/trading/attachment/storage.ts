/**
 * Attachment Storage Provider
 *
 * Secure storage abstraction for attachment files.
 * Provides a local filesystem provider for development/self-hosting,
 * designed to be easily swappable with S3 / R2 / Cloud Object Storage later.
 */

import "server-only";

import fs from "fs/promises";
import path from "path";
import { createStorageError } from "./errors";

export interface StoredFile {
  readonly data: Buffer;
  readonly contentType: string;
  readonly contentLength: number;
}

export interface AttachmentStorageProvider {
  /**
   * Persists binary data under a unique storage key.
   */
  save(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<void>;

  /**
   * Retrieves stored binary file and metadata by key. Returns null if not found.
   */
  get(key: string): Promise<StoredFile | null>;

  /**
   * Deletes a file by key. Resolves gracefully even if the file does not exist.
   */
  delete(key: string): Promise<void>;
}

/**
 * Local Filesystem implementation of AttachmentStorageProvider.
 * Stores files in `.storage/attachments` by default (or ATTACHMENT_STORAGE_PATH).
 * Prevents directory traversal attacks via path verification.
 */
export class LocalAttachmentStorageProvider implements AttachmentStorageProvider {
  private readonly baseDir: string;

  constructor(customPath?: string) {
    this.baseDir = path.resolve(
      /* turbopackIgnore: true */
      customPath || process.env.ATTACHMENT_STORAGE_PATH || path.join(process.cwd(), ".storage", "attachments"),
    );
  }

  private resolveSafePath(key: string): string {
    // Clean key of leading/trailing slashes and normalize
    const cleanKey = key.replace(/^[/\\]+/, "");
    const resolvedPath = path.resolve(this.baseDir, cleanKey);

    // Verify resolved path stays strictly within baseDir to prevent traversal
    if (!resolvedPath.startsWith(this.baseDir)) {
      throw new Error("Invalid storage path: directory traversal detected");
    }

    return resolvedPath;
  }

  async save(key: string, data: Buffer | Uint8Array): Promise<void> {
    try {
      const filePath = this.resolveSafePath(key);
      const dir = path.dirname(filePath);

      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, data);
    } catch (err) {
      throw createStorageError(err);
    }
  }

  async get(key: string): Promise<StoredFile | null> {
    try {
      const filePath = this.resolveSafePath(key);
      const data = await fs.readFile(filePath);
      return {
        data,
        contentType: "application/octet-stream",
        contentLength: data.length,
      };
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        return null;
      }
      throw createStorageError(err);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.resolveSafePath(key);
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        return; // Already deleted
      }
      throw createStorageError(err);
    }
  }
}

/** Global default storage instance */
let defaultStorageProvider: AttachmentStorageProvider | null = null;

export function getAttachmentStorageProvider(): AttachmentStorageProvider {
  if (!defaultStorageProvider) {
    defaultStorageProvider = new LocalAttachmentStorageProvider();
  }
  return defaultStorageProvider;
}

/** Allows overriding the storage provider in tests */
export function setAttachmentStorageProvider(provider: AttachmentStorageProvider | null): void {
  defaultStorageProvider = provider;
}
