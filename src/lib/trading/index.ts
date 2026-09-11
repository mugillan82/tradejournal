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

export type {
  JournalMoodValue,
  JournalEntryDto,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  JournalEntryListFilters,
  JournalEntryListPagination,
  JournalEntryListResult,
  TradeNoteDto,
  CreateTradeNoteInput,
  UpdateTradeNoteInput,
  ReviewTradeItemDto,
  ReviewDto,
  CreateReviewTradeInput,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListFilters,
  ReviewListPagination,
  ReviewListResult,
  JournalServiceErrorCode,
} from "./journal";

export {
  ALLOWED_JOURNAL_MOODS,
  JournalServiceError,
  validateCreateJournalEntryInput,
  validateUpdateJournalEntryInput,
  validateCreateTradeNoteInput,
  validateUpdateTradeNoteInput,
  validateCreateReviewInput,
  validateUpdateReviewInput,
  normalizeDateToUtcMidnight,
  createJournalEntry,
  getJournalEntryById,
  listJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  listTradeNotes,
  createTradeNote,
  updateTradeNote,
  deleteTradeNote,
  createReview,
  getReviewById,
  listReviews,
  updateReview,
  deleteReview,
  listReviewsForTrade,
} from "./journal";



