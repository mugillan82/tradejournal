/**
 * Trading Domain Module — Public API
 *
 * Top-level barrel for all trading domain types and services.
 *
 * Current sub-domains:
 * - trade/
 * - account/
 */

export * from "./trade";

export type {
  AllowedAttachmentMimeType,
  AttachmentDto,
  CreateAttachmentInput,
  AttachmentServiceErrorCode,
  AttachmentValidationResult,
  AttachmentStorageProvider,
} from "./attachment";

export {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENT_SIZE_LABEL,
  AttachmentServiceError,
  validateAttachmentUpload,
  sanitizeFileName,
  listTradeAttachments,
  uploadTradeAttachment,
  deleteTradeAttachment,
  getTradeAttachmentContent,
  getAttachmentStorageProvider,
  setAttachmentStorageProvider,
} from "./attachment";

export type {
  TradingAccountTypeValue,
  TradingAccountSortField,
  TradingAccountListFilters,
  TradingAccountListSort,
  TradingAccountListPagination,
  TradingAccountDto,
  CreateTradingAccountInput,
  UpdateTradingAccountInput,
  TradingAccountListResult,
} from "./account";

export {
  createTradingAccount,
  getTradingAccountById,
  listTradingAccounts,
  updateTradingAccount,
  deleteTradingAccount,
} from "./account";


