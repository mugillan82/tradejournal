/**
 * Journal Domain — Input Validation
 *
 * Centralized validation rules for Journal Entries, Trade Notes, and Trade Reviews.
 */

import {
  ALLOWED_JOURNAL_MOODS,
  type CreateJournalEntryInput,
  type UpdateJournalEntryInput,
  type CreateTradeNoteInput,
  type UpdateTradeNoteInput,
  type CreateReviewInput,
  type UpdateReviewInput,
  type JournalMoodValue,
} from "./types";
import type { FieldError } from "./errors";

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<FieldError>;
}

/**
 * Truncates a Date object to UTC midnight (00:00:00.000Z).
 */
export function normalizeDateToUtcMidnight(dateInput: Date | string): Date {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// ---------------------------------------------------------------------------
// Journal Entry Validation
// ---------------------------------------------------------------------------

export function validateCreateJournalEntryInput(input: CreateJournalEntryInput): ValidationResult {
  const errors: FieldError[] = [];

  if (!input.entryDate) {
    errors.push({ path: "entryDate", message: "entryDate is required" });
  } else {
    try {
      normalizeDateToUtcMidnight(input.entryDate);
    } catch {
      errors.push({ path: "entryDate", message: "entryDate must be a valid date" });
    }
  }

  if (input.mood !== undefined && input.mood !== null) {
    if (!ALLOWED_JOURNAL_MOODS.includes(input.mood as JournalMoodValue)) {
      errors.push({
        path: "mood",
        message: `mood must be one of: ${ALLOWED_JOURNAL_MOODS.join(", ")}`,
      });
    }
  }

  if (input.energy !== undefined && input.energy !== null) {
    if (!Number.isInteger(input.energy) || input.energy < 1 || input.energy > 10) {
      errors.push({ path: "energy", message: "energy must be an integer between 1 and 10" });
    }
  }

  if (input.focus !== undefined && input.focus !== null) {
    if (!Number.isInteger(input.focus) || input.focus < 1 || input.focus > 10) {
      errors.push({ path: "focus", message: "focus must be an integer between 1 and 10" });
    }
  }

  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== "string") {
      errors.push({ path: "notes", message: "notes must be a string" });
    } else if (input.notes.length > 10000) {
      errors.push({ path: "notes", message: "notes cannot exceed 10,000 characters" });
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateUpdateJournalEntryInput(input: UpdateJournalEntryInput): ValidationResult {
  const errors: FieldError[] = [];

  if (Object.keys(input).length === 0) {
    errors.push({ path: "body", message: "At least one field to update must be provided" });
  }

  if (input.mood !== undefined && input.mood !== null) {
    if (!ALLOWED_JOURNAL_MOODS.includes(input.mood as JournalMoodValue)) {
      errors.push({
        path: "mood",
        message: `mood must be one of: ${ALLOWED_JOURNAL_MOODS.join(", ")}`,
      });
    }
  }

  if (input.energy !== undefined && input.energy !== null) {
    if (!Number.isInteger(input.energy) || input.energy < 1 || input.energy > 10) {
      errors.push({ path: "energy", message: "energy must be an integer between 1 and 10" });
    }
  }

  if (input.focus !== undefined && input.focus !== null) {
    if (!Number.isInteger(input.focus) || input.focus < 1 || input.focus > 10) {
      errors.push({ path: "focus", message: "focus must be an integer between 1 and 10" });
    }
  }

  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== "string") {
      errors.push({ path: "notes", message: "notes must be a string" });
    } else if (input.notes.length > 10000) {
      errors.push({ path: "notes", message: "notes cannot exceed 10,000 characters" });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Trade Note Validation
// ---------------------------------------------------------------------------

export function validateCreateTradeNoteInput(input: CreateTradeNoteInput): ValidationResult {
  const errors: FieldError[] = [];

  if (!input.tradeId || typeof input.tradeId !== "string" || !input.tradeId.trim()) {
    errors.push({ path: "tradeId", message: "tradeId is required" });
  }

  if (!input.content || typeof input.content !== "string" || !input.content.trim()) {
    errors.push({ path: "content", message: "Note content is required" });
  } else if (input.content.length > 5000) {
    errors.push({ path: "content", message: "Note content cannot exceed 5,000 characters" });
  }

  return { isValid: errors.length === 0, errors };
}

export function validateUpdateTradeNoteInput(input: UpdateTradeNoteInput): ValidationResult {
  const errors: FieldError[] = [];

  if (!input.content || typeof input.content !== "string" || !input.content.trim()) {
    errors.push({ path: "content", message: "Note content is required" });
  } else if (input.content.length > 5000) {
    errors.push({ path: "content", message: "Note content cannot exceed 5,000 characters" });
  }

  return { isValid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Review Validation
// ---------------------------------------------------------------------------

export function validateCreateReviewInput(input: CreateReviewInput): ValidationResult {
  const errors: FieldError[] = [];

  if (!input.reviewDate) {
    errors.push({ path: "reviewDate", message: "reviewDate is required" });
  } else {
    const d = typeof input.reviewDate === "string" ? new Date(input.reviewDate) : input.reviewDate;
    if (isNaN(d.getTime())) {
      errors.push({ path: "reviewDate", message: "reviewDate must be a valid date" });
    }
  }

  if (input.title !== undefined && input.title !== null) {
    if (typeof input.title !== "string") {
      errors.push({ path: "title", message: "title must be a string" });
    } else if (input.title.length > 255) {
      errors.push({ path: "title", message: "title cannot exceed 255 characters" });
    }
  }

  if (input.rating !== undefined && input.rating !== null) {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) {
      errors.push({ path: "rating", message: "rating must be an integer between 1 and 10" });
    }
  }

  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== "string") {
      errors.push({ path: "notes", message: "notes must be a string" });
    } else if (input.notes.length > 10000) {
      errors.push({ path: "notes", message: "notes cannot exceed 10,000 characters" });
    }
  }

  if (input.trades !== undefined && input.trades !== null) {
    if (!Array.isArray(input.trades)) {
      errors.push({ path: "trades", message: "trades must be an array" });
    } else {
      input.trades.forEach((t, idx) => {
        if (!t.tradeId || typeof t.tradeId !== "string" || !t.tradeId.trim()) {
          errors.push({ path: `trades[${idx}].tradeId`, message: "tradeId is required" });
        }
        if (t.rating !== undefined && t.rating !== null) {
          if (!Number.isInteger(t.rating) || t.rating < 1 || t.rating > 10) {
            errors.push({
              path: `trades[${idx}].rating`,
              message: "rating must be an integer between 1 and 10",
            });
          }
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateUpdateReviewInput(input: UpdateReviewInput): ValidationResult {
  const errors: FieldError[] = [];

  if (Object.keys(input).length === 0) {
    errors.push({ path: "body", message: "At least one field to update must be provided" });
  }

  if (input.reviewDate !== undefined && input.reviewDate !== null) {
    const d = typeof input.reviewDate === "string" ? new Date(input.reviewDate) : input.reviewDate;
    if (isNaN(d.getTime())) {
      errors.push({ path: "reviewDate", message: "reviewDate must be a valid date" });
    }
  }

  if (input.title !== undefined && input.title !== null) {
    if (typeof input.title !== "string") {
      errors.push({ path: "title", message: "title must be a string" });
    } else if (input.title.length > 255) {
      errors.push({ path: "title", message: "title cannot exceed 255 characters" });
    }
  }

  if (input.rating !== undefined && input.rating !== null) {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) {
      errors.push({ path: "rating", message: "rating must be an integer between 1 and 10" });
    }
  }

  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== "string") {
      errors.push({ path: "notes", message: "notes must be a string" });
    } else if (input.notes.length > 10000) {
      errors.push({ path: "notes", message: "notes cannot exceed 10,000 characters" });
    }
  }

  if (input.trades !== undefined && input.trades !== null) {
    if (!Array.isArray(input.trades)) {
      errors.push({ path: "trades", message: "trades must be an array" });
    } else {
      input.trades.forEach((t, idx) => {
        if (!t.tradeId || typeof t.tradeId !== "string" || !t.tradeId.trim()) {
          errors.push({ path: `trades[${idx}].tradeId`, message: "tradeId is required" });
        }
        if (t.rating !== undefined && t.rating !== null) {
          if (!Number.isInteger(t.rating) || t.rating < 1 || t.rating > 10) {
            errors.push({
              path: `trades[${idx}].rating`,
              message: "rating must be an integer between 1 and 10",
            });
          }
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors };
}
