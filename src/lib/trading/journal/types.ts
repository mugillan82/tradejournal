/**
 * Journal Domain — Public Types
 *
 * Strongly typed DTOs and contracts for Daily Journal, Notebook, Trade Notes,
 * Structured Trade Reviews, Review Templates, and their associations.
 */

import type { AttachmentDto } from "../attachment/types";

export type JournalMoodValue =
  | "VERY_BAD"
  | "BAD"
  | "NEUTRAL"
  | "GOOD"
  | "VERY_GOOD";

export const ALLOWED_JOURNAL_MOODS: ReadonlyArray<JournalMoodValue> = [
  "VERY_BAD",
  "BAD",
  "NEUTRAL",
  "GOOD",
  "VERY_GOOD",
];

export type ReviewStatusValue = "DRAFT" | "IN_REVIEW" | "COMPLETED";

export const ALLOWED_REVIEW_STATUSES: ReadonlyArray<ReviewStatusValue> = [
  "DRAFT",
  "IN_REVIEW",
  "COMPLETED",
];

export type TradeNotePhaseValue =
  | "PRE_TRADE"
  | "ENTRY"
  | "MANAGEMENT"
  | "EXIT"
  | "POST_TRADE"
  | "GENERAL";

export const ALLOWED_TRADE_NOTE_PHASES: ReadonlyArray<TradeNotePhaseValue> = [
  "PRE_TRADE",
  "ENTRY",
  "MANAGEMENT",
  "EXIT",
  "POST_TRADE",
  "GENERAL",
];

// ---------------------------------------------------------------------------
// 1. Daily Journal Types
// ---------------------------------------------------------------------------

export interface JournalTagDto {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
}

export interface JournalTradeSummaryDto {
  readonly id: string;
  readonly symbol: string;
  readonly side: string;
  readonly status: string;
  readonly netPnl: string | null;
  readonly exitDate: string | null;
}

export interface JournalEntryDto {
  readonly id: string;
  readonly userId: string;
  readonly entryDate: Date; // UTC date (time truncated to 00:00:00Z)
  readonly title: string | null;
  readonly mood: JournalMoodValue | null;
  readonly energy: number | null; // 1-10
  readonly focus: number | null; // 1-10
  readonly notes: string | null;
  readonly tags: ReadonlyArray<JournalTagDto>;
  readonly trades: ReadonlyArray<JournalTradeSummaryDto>;
  readonly attachments?: ReadonlyArray<AttachmentDto>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateJournalEntryInput {
  readonly entryDate: Date | string;
  readonly title?: string | null;
  readonly mood?: JournalMoodValue | null;
  readonly energy?: number | null;
  readonly focus?: number | null;
  readonly notes?: string | null;
  readonly tagIds?: ReadonlyArray<string>;
  readonly tradeIds?: ReadonlyArray<string>;
}

export interface UpdateJournalEntryInput {
  readonly title?: string | null;
  readonly mood?: JournalMoodValue | null;
  readonly energy?: number | null;
  readonly focus?: number | null;
  readonly notes?: string | null;
  readonly tagIds?: ReadonlyArray<string>;
  readonly tradeIds?: ReadonlyArray<string>;
}

export interface JournalEntryListFilters {
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly mood?: JournalMoodValue;
  readonly search?: string;
  readonly tagId?: string;
}

export interface JournalEntryListPagination {
  readonly page: number;
  readonly pageSize: number;
}

export interface JournalEntryListResult {
  readonly items: ReadonlyArray<JournalEntryDto>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

// ---------------------------------------------------------------------------
// 2. Notebook Types
// ---------------------------------------------------------------------------

export interface NotebookNoteDto {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly content: string;
  readonly strategyId: string | null;
  readonly strategyName: string | null;
  readonly setupId: string | null;
  readonly setupName: string | null;
  readonly isArchived: boolean;
  readonly tags: ReadonlyArray<JournalTagDto>;
  readonly attachments?: ReadonlyArray<AttachmentDto>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateNotebookNoteInput {
  readonly title: string;
  readonly content: string;
  readonly strategyId?: string | null;
  readonly setupId?: string | null;
  readonly tagIds?: ReadonlyArray<string>;
  readonly isArchived?: boolean;
}

export interface UpdateNotebookNoteInput {
  readonly title?: string;
  readonly content?: string;
  readonly strategyId?: string | null;
  readonly setupId?: string | null;
  readonly tagIds?: ReadonlyArray<string>;
  readonly isArchived?: boolean;
}

export interface NotebookNoteListFilters {
  readonly search?: string;
  readonly strategyId?: string;
  readonly setupId?: string;
  readonly tagId?: string;
  readonly isArchived?: boolean;
}

export interface NotebookNoteListPagination {
  readonly page: number;
  readonly pageSize: number;
}

export interface NotebookNoteListResult {
  readonly items: ReadonlyArray<NotebookNoteDto>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

// ---------------------------------------------------------------------------
// 3. Trade Note Types
// ---------------------------------------------------------------------------

export interface TradeNoteDto {
  readonly id: string;
  readonly tradeId: string;
  readonly content: string;
  readonly phase: TradeNotePhaseValue | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateTradeNoteInput {
  readonly tradeId: string;
  readonly content: string;
  readonly phase?: TradeNotePhaseValue | null;
}

export interface UpdateTradeNoteInput {
  readonly content?: string;
  readonly phase?: TradeNotePhaseValue | null;
}

// ---------------------------------------------------------------------------
// 4. Review Template Types
// ---------------------------------------------------------------------------

export interface ReviewTemplateDto {
  readonly id: string;
  readonly userId: string | null; // null for system defaults
  readonly name: string;
  readonly description: string | null;
  readonly prompts: ReadonlyArray<string>;
  readonly isDefault: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateReviewTemplateInput {
  readonly name: string;
  readonly description?: string | null;
  readonly prompts: ReadonlyArray<string>;
}

export interface UpdateReviewTemplateInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly prompts?: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// 5. Review & ReviewTrade Types
// ---------------------------------------------------------------------------

export interface ReviewTradeItemDto {
  readonly id: string;
  readonly reviewId: string;
  readonly tradeId: string;
  readonly notes: string | null;
  readonly rating: number | null; // 1-10
  readonly trade?: JournalTradeSummaryDto;
}

export interface ReviewMistakeDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

export interface ReviewMetricsDto {
  readonly tradeCount: number;
  readonly winCount: number;
  readonly lossCount: number;
  readonly winRate: number;
  readonly netPnl: string;
  readonly profitFactor: number | null;
  readonly expectancy: string | null;
  readonly averageR: string | null;
}

export interface ReviewDto {
  readonly id: string;
  readonly userId: string;
  readonly title: string | null;
  readonly reviewDate: Date;
  readonly status: ReviewStatusValue;
  readonly thesis: string | null;
  readonly whatWentWell: string | null;
  readonly whatWentWrong: string | null;
  readonly executionQuality: number | null; // 1-10
  readonly ruleAdherence: number | null; // 1-10
  readonly riskManagement: number | null; // 1-10
  readonly emotionalObservations: string | null;
  readonly lessonsLearned: string | null;
  readonly improvementActions: string | null;
  readonly notes: string | null;
  readonly rating: number | null; // 1-10
  readonly templateId: string | null;
  readonly templateName: string | null;
  readonly trades: ReadonlyArray<ReviewTradeItemDto>;
  readonly tags: ReadonlyArray<JournalTagDto>;
  readonly mistakes: ReadonlyArray<ReviewMistakeDto>;
  readonly attachments?: ReadonlyArray<AttachmentDto>;
  readonly computedMetrics?: ReviewMetricsDto;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateReviewTradeInput {
  readonly tradeId: string;
  readonly notes?: string | null;
  readonly rating?: number | null;
}

export interface CreateReviewInput {
  readonly title?: string | null;
  readonly reviewDate: Date | string;
  readonly status?: ReviewStatusValue;
  readonly thesis?: string | null;
  readonly whatWentWell?: string | null;
  readonly whatWentWrong?: string | null;
  readonly executionQuality?: number | null;
  readonly ruleAdherence?: number | null;
  readonly riskManagement?: number | null;
  readonly emotionalObservations?: string | null;
  readonly lessonsLearned?: string | null;
  readonly improvementActions?: string | null;
  readonly notes?: string | null;
  readonly rating?: number | null;
  readonly templateId?: string | null;
  readonly trades?: ReadonlyArray<CreateReviewTradeInput>;
  readonly tagIds?: ReadonlyArray<string>;
  readonly mistakeIds?: ReadonlyArray<string>;
}

export interface UpdateReviewInput {
  readonly title?: string | null;
  readonly reviewDate?: Date | string;
  readonly status?: ReviewStatusValue;
  readonly thesis?: string | null;
  readonly whatWentWell?: string | null;
  readonly whatWentWrong?: string | null;
  readonly executionQuality?: number | null;
  readonly ruleAdherence?: number | null;
  readonly riskManagement?: number | null;
  readonly emotionalObservations?: string | null;
  readonly lessonsLearned?: string | null;
  readonly improvementActions?: string | null;
  readonly notes?: string | null;
  readonly rating?: number | null;
  readonly templateId?: string | null;
  readonly trades?: ReadonlyArray<CreateReviewTradeInput>;
  readonly tagIds?: ReadonlyArray<string>;
  readonly mistakeIds?: ReadonlyArray<string>;
}

export interface ReviewListFilters {
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly status?: ReviewStatusValue;
  readonly search?: string;
  readonly rating?: number;
  readonly tagId?: string;
  readonly mistakeId?: string;
  readonly tradeId?: string;
}

export interface ReviewListPagination {
  readonly page: number;
  readonly pageSize: number;
}

export interface ReviewListResult {
  readonly items: ReadonlyArray<ReviewDto>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
