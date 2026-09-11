/**
 * Journal Domain — Public Types
 *
 * Strongly typed DTOs and contracts for Journal Entries, Trade Notes, and Trade Reviews.
 */

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

// ---------------------------------------------------------------------------
// Journal Entry Types
// ---------------------------------------------------------------------------

export interface JournalEntryDto {
  readonly id: string;
  readonly userId: string;
  readonly entryDate: Date; // UTC date (time truncated to 00:00:00Z)
  readonly mood: JournalMoodValue | null;
  readonly energy: number | null; // 1-10
  readonly focus: number | null; // 1-10
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateJournalEntryInput {
  readonly entryDate: Date | string;
  readonly mood?: JournalMoodValue | null;
  readonly energy?: number | null;
  readonly focus?: number | null;
  readonly notes?: string | null;
}

export interface UpdateJournalEntryInput {
  readonly mood?: JournalMoodValue | null;
  readonly energy?: number | null;
  readonly focus?: number | null;
  readonly notes?: string | null;
}

export interface JournalEntryListFilters {
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly mood?: JournalMoodValue;
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
// Trade Note Types
// ---------------------------------------------------------------------------

export interface TradeNoteDto {
  readonly id: string;
  readonly tradeId: string;
  readonly content: string;
  readonly createdAt: Date;
}

export interface CreateTradeNoteInput {
  readonly tradeId: string;
  readonly content: string;
}

export interface UpdateTradeNoteInput {
  readonly content: string;
}

// ---------------------------------------------------------------------------
// Review & ReviewTrade Types
// ---------------------------------------------------------------------------

export interface ReviewTradeItemDto {
  readonly id: string;
  readonly reviewId: string;
  readonly tradeId: string;
  readonly notes: string | null;
  readonly rating: number | null; // 1-5 or 1-10
}

export interface ReviewDto {
  readonly id: string;
  readonly userId: string;
  readonly title: string | null;
  readonly reviewDate: Date;
  readonly notes: string | null;
  readonly rating: number | null; // 1-5 or 1-10
  readonly trades: ReadonlyArray<ReviewTradeItemDto>;
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
  readonly notes?: string | null;
  readonly rating?: number | null;
  readonly trades?: ReadonlyArray<CreateReviewTradeInput>;
}

export interface UpdateReviewInput {
  readonly title?: string | null;
  readonly reviewDate?: Date | string;
  readonly notes?: string | null;
  readonly rating?: number | null;
  readonly trades?: ReadonlyArray<CreateReviewTradeInput>;
}

export interface ReviewListFilters {
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly search?: string;
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
