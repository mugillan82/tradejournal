/**
 * Trade Journal — Attachment Domain
 *
 * Public entrypoint for attachment domain operations, types, and errors.
 */

export * from "./types";
export * from "./errors";
export * from "./validation";
export * from "./service";
export {
  type AttachmentStorageProvider,
  getAttachmentStorageProvider,
  setAttachmentStorageProvider,
} from "./storage";
