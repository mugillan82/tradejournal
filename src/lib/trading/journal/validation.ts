/**
 * Journal Domain — Input Validation & Sanitization
 *
 * Centralized validation rules and XSS sanitization for:
 * - Daily Journal Entries
 * - Notebook Notes
 * - Trade Notes
 * - Structured Trade Reviews
 * - Review Templates
 * - Status Transitions
 */

import {
  ALLOWED_JOURNAL_MOODS,
  ALLOWED_REVIEW_STATUSES,
  ALLOWED_TRADE_NOTE_PHASES,
  type CreateJournalEntryInput,
  type UpdateJournalEntryInput,
  type CreateNotebookNoteInput,
  type UpdateNotebookNoteInput,
  type CreateTradeNoteInput,
  type UpdateTradeNoteInput,
  type CreateReviewTemplateInput,
  type UpdateReviewTemplateInput,
  type CreateReviewInput,
  type UpdateReviewInput,
  type JournalMoodValue,
  type ReviewStatusValue,
  type TradeNotePhaseValue,
} from "./types";
import type { FieldError } from "./errors";

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ReadonlyArray<FieldError>;
}

/**
 * Strips dangerous HTML tags and script vectors to eliminate stored XSS risks.
 */
export function sanitizeTextContent(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, "");
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
// 1. Daily Journal Entry Validation
// ---------------------------------------------------------------------------

const ALLOWED_CREATE_JOURNAL_KEYS = new Set([
  "entryDate",
  "title",
  "mood",
  "energy",
  "focus",
  "notes",
  "tagIds",
  "tradeIds",
]);

const ALLOWED_UPDATE_JOURNAL_KEYS = new Set([
  "title",
  "mood",
  "energy",
  "focus",
  "notes",
  "tagIds",
  "tradeIds",
]);

export function validateCreateJournalEntryInput(input: CreateJournalEntryInput): ValidationResult {
  const errors: FieldError[] = [];

  // Reject client-injected fields (e.g. userId)
  for (const key of Object.keys(input)) {
    if (!ALLOWED_CREATE_JOURNAL_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in creation payload` });
    }
  }

  if (!input.entryDate) {
    errors.push({ path: "entryDate", message: "entryDate is required" });
  } else {
    try {
      normalizeDateToUtcMidnight(input.entryDate);
    } catch {
      errors.push({ path: "entryDate", message: "entryDate must be a valid date" });
    }
  }

  if (input.title !== undefined && input.title !== null) {
    if (typeof input.title !== "string") {
      errors.push({ path: "title", message: "title must be a string" });
    } else if (input.title.length > 255) {
      errors.push({ path: "title", message: "title cannot exceed 255 characters" });
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
    } else if (input.notes.length > 20000) {
      errors.push({ path: "notes", message: "notes cannot exceed 20,000 characters" });
    }
  }

  if (input.tagIds !== undefined && input.tagIds !== null) {
    if (!Array.isArray(input.tagIds)) {
      errors.push({ path: "tagIds", message: "tagIds must be an array of strings" });
    } else if (input.tagIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "tagIds", message: "Each tagId must be a non-empty string" });
    }
  }

  if (input.tradeIds !== undefined && input.tradeIds !== null) {
    if (!Array.isArray(input.tradeIds)) {
      errors.push({ path: "tradeIds", message: "tradeIds must be an array of strings" });
    } else if (input.tradeIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "tradeIds", message: "Each tradeId must be a non-empty string" });
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateUpdateJournalEntryInput(input: UpdateJournalEntryInput): ValidationResult {
  const errors: FieldError[] = [];

  if (Object.keys(input).length === 0) {
    errors.push({ path: "body", message: "At least one field to update must be provided" });
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_UPDATE_JOURNAL_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in update payload` });
    }
  }

  if (input.title !== undefined && input.title !== null) {
    if (typeof input.title !== "string") {
      errors.push({ path: "title", message: "title must be a string" });
    } else if (input.title.length > 255) {
      errors.push({ path: "title", message: "title cannot exceed 255 characters" });
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
    } else if (input.notes.length > 20000) {
      errors.push({ path: "notes", message: "notes cannot exceed 20,000 characters" });
    }
  }

  if (input.tagIds !== undefined && input.tagIds !== null) {
    if (!Array.isArray(input.tagIds)) {
      errors.push({ path: "tagIds", message: "tagIds must be an array of strings" });
    } else if (input.tagIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "tagIds", message: "Each tagId must be a non-empty string" });
    }
  }

  if (input.tradeIds !== undefined && input.tradeIds !== null) {
    if (!Array.isArray(input.tradeIds)) {
      errors.push({ path: "tradeIds", message: "tradeIds must be an array of strings" });
    } else if (input.tradeIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "tradeIds", message: "Each tradeId must be a non-empty string" });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 2. Notebook Validation
// ---------------------------------------------------------------------------

const ALLOWED_CREATE_NOTEBOOK_KEYS = new Set([
  "title",
  "content",
  "strategyId",
  "setupId",
  "tagIds",
  "isArchived",
]);

const ALLOWED_UPDATE_NOTEBOOK_KEYS = new Set([
  "title",
  "content",
  "strategyId",
  "setupId",
  "tagIds",
  "isArchived",
]);

export function validateCreateNotebookNoteInput(input: CreateNotebookNoteInput): ValidationResult {
  const errors: FieldError[] = [];

  for (const key of Object.keys(input)) {
    if (!ALLOWED_CREATE_NOTEBOOK_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in creation payload` });
    }
  }

  if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
    errors.push({ path: "title", message: "Note title is required" });
  } else if (input.title.length > 255) {
    errors.push({ path: "title", message: "Title cannot exceed 255 characters" });
  }

  if (input.content === undefined || input.content === null || typeof input.content !== "string" || !input.content.trim()) {
    errors.push({ path: "content", message: "Note content is required" });
  } else if (input.content.length > 50000) {
    errors.push({ path: "content", message: "Content cannot exceed 50,000 characters" });
  }

  if (input.strategyId !== undefined && input.strategyId !== null) {
    if (typeof input.strategyId !== "string" || !input.strategyId.trim()) {
      errors.push({ path: "strategyId", message: "strategyId must be a valid string" });
    }
  }

  if (input.setupId !== undefined && input.setupId !== null) {
    if (typeof input.setupId !== "string" || !input.setupId.trim()) {
      errors.push({ path: "setupId", message: "setupId must be a valid string" });
    }
  }

  if (input.tagIds !== undefined && input.tagIds !== null) {
    if (!Array.isArray(input.tagIds)) {
      errors.push({ path: "tagIds", message: "tagIds must be an array of strings" });
    } else if (input.tagIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "tagIds", message: "Each tagId must be a non-empty string" });
    }
  }

  if (input.isArchived !== undefined && input.isArchived !== null) {
    if (typeof input.isArchived !== "boolean") {
      errors.push({ path: "isArchived", message: "isArchived must be a boolean" });
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateUpdateNotebookNoteInput(input: UpdateNotebookNoteInput): ValidationResult {
  const errors: FieldError[] = [];

  if (Object.keys(input).length === 0) {
    errors.push({ path: "body", message: "At least one field to update must be provided" });
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_UPDATE_NOTEBOOK_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in update payload` });
    }
  }

  if (input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title.trim()) {
      errors.push({ path: "title", message: "Note title cannot be empty" });
    } else if (input.title.length > 255) {
      errors.push({ path: "title", message: "Title cannot exceed 255 characters" });
    }
  }

  if (input.content !== undefined) {
    if (typeof input.content !== "string") {
      errors.push({ path: "content", message: "Note content must be a string" });
    } else if (input.content.length > 50000) {
      errors.push({ path: "content", message: "Content cannot exceed 50,000 characters" });
    }
  }

  if (input.strategyId !== undefined && input.strategyId !== null) {
    if (typeof input.strategyId !== "string" || !input.strategyId.trim()) {
      errors.push({ path: "strategyId", message: "strategyId must be a valid string" });
    }
  }

  if (input.setupId !== undefined && input.setupId !== null) {
    if (typeof input.setupId !== "string" || !input.setupId.trim()) {
      errors.push({ path: "setupId", message: "setupId must be a valid string" });
    }
  }

  if (input.tagIds !== undefined && input.tagIds !== null) {
    if (!Array.isArray(input.tagIds)) {
      errors.push({ path: "tagIds", message: "tagIds must be an array of strings" });
    } else if (input.tagIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "tagIds", message: "Each tagId must be a non-empty string" });
    }
  }

  if (input.isArchived !== undefined && input.isArchived !== null) {
    if (typeof input.isArchived !== "boolean") {
      errors.push({ path: "isArchived", message: "isArchived must be a boolean" });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 3. Trade Note Validation
// ---------------------------------------------------------------------------

const ALLOWED_CREATE_TRADE_NOTE_KEYS = new Set(["tradeId", "content", "phase"]);
const ALLOWED_UPDATE_TRADE_NOTE_KEYS = new Set(["content", "phase"]);

export function validateCreateTradeNoteInput(input: CreateTradeNoteInput): ValidationResult {
  const errors: FieldError[] = [];

  for (const key of Object.keys(input)) {
    if (!ALLOWED_CREATE_TRADE_NOTE_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in creation payload` });
    }
  }

  if (!input.tradeId || typeof input.tradeId !== "string" || !input.tradeId.trim()) {
    errors.push({ path: "tradeId", message: "tradeId is required" });
  }

  if (!input.content || typeof input.content !== "string" || !input.content.trim()) {
    errors.push({ path: "content", message: "Note content is required" });
  } else if (input.content.length > 10000) {
    errors.push({ path: "content", message: "Note content cannot exceed 10,000 characters" });
  }

  if (input.phase !== undefined && input.phase !== null) {
    if (!ALLOWED_TRADE_NOTE_PHASES.includes(input.phase as TradeNotePhaseValue)) {
      errors.push({
        path: "phase",
        message: `phase must be one of: ${ALLOWED_TRADE_NOTE_PHASES.join(", ")}`,
      });
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateUpdateTradeNoteInput(input: UpdateTradeNoteInput): ValidationResult {
  const errors: FieldError[] = [];

  if (Object.keys(input).length === 0) {
    errors.push({ path: "body", message: "At least one field to update must be provided" });
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_UPDATE_TRADE_NOTE_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in update payload` });
    }
  }

  if (input.content !== undefined) {
    if (typeof input.content !== "string" || !input.content.trim()) {
      errors.push({ path: "content", message: "Note content cannot be empty" });
    } else if (input.content.length > 10000) {
      errors.push({ path: "content", message: "Note content cannot exceed 10,000 characters" });
    }
  }

  if (input.phase !== undefined && input.phase !== null) {
    if (!ALLOWED_TRADE_NOTE_PHASES.includes(input.phase as TradeNotePhaseValue)) {
      errors.push({
        path: "phase",
        message: `phase must be one of: ${ALLOWED_TRADE_NOTE_PHASES.join(", ")}`,
      });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 4. Review Template Validation
// ---------------------------------------------------------------------------

const ALLOWED_CREATE_TEMPLATE_KEYS = new Set(["name", "description", "prompts"]);
const ALLOWED_UPDATE_TEMPLATE_KEYS = new Set(["name", "description", "prompts"]);

export function validateCreateReviewTemplateInput(input: CreateReviewTemplateInput): ValidationResult {
  const errors: FieldError[] = [];

  for (const key of Object.keys(input)) {
    if (!ALLOWED_CREATE_TEMPLATE_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in creation payload` });
    }
  }

  if (!input.name || typeof input.name !== "string" || !input.name.trim()) {
    errors.push({ path: "name", message: "Template name is required" });
  } else if (input.name.length > 100) {
    errors.push({ path: "name", message: "Template name cannot exceed 100 characters" });
  }

  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") {
      errors.push({ path: "description", message: "description must be a string" });
    } else if (input.description.length > 500) {
      errors.push({ path: "description", message: "description cannot exceed 500 characters" });
    }
  }

  if (!input.prompts || !Array.isArray(input.prompts) || input.prompts.length === 0) {
    errors.push({ path: "prompts", message: "At least one prompt is required" });
  } else {
    input.prompts.forEach((p, idx) => {
      if (typeof p !== "string" || !p.trim()) {
        errors.push({ path: `prompts[${idx}]`, message: "Prompt must be a non-empty string" });
      } else if (p.length > 500) {
        errors.push({ path: `prompts[${idx}]`, message: "Prompt cannot exceed 500 characters" });
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

export function validateUpdateReviewTemplateInput(input: UpdateReviewTemplateInput): ValidationResult {
  const errors: FieldError[] = [];

  if (Object.keys(input).length === 0) {
    errors.push({ path: "body", message: "At least one field to update must be provided" });
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_UPDATE_TEMPLATE_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in update payload` });
    }
  }

  if (input.name !== undefined) {
    if (typeof input.name !== "string" || !input.name.trim()) {
      errors.push({ path: "name", message: "Template name cannot be empty" });
    } else if (input.name.length > 100) {
      errors.push({ path: "name", message: "Template name cannot exceed 100 characters" });
    }
  }

  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") {
      errors.push({ path: "description", message: "description must be a string" });
    } else if (input.description.length > 500) {
      errors.push({ path: "description", message: "description cannot exceed 500 characters" });
    }
  }

  if (input.prompts !== undefined) {
    if (!Array.isArray(input.prompts) || input.prompts.length === 0) {
      errors.push({ path: "prompts", message: "At least one prompt is required" });
    } else {
      input.prompts.forEach((p, idx) => {
        if (typeof p !== "string" || !p.trim()) {
          errors.push({ path: `prompts[${idx}]`, message: "Prompt must be a non-empty string" });
        } else if (p.length > 500) {
          errors.push({ path: `prompts[${idx}]`, message: "Prompt cannot exceed 500 characters" });
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// 5. Review Validation & Status Transitions
// ---------------------------------------------------------------------------

const ALLOWED_CREATE_REVIEW_KEYS = new Set([
  "title",
  "reviewDate",
  "status",
  "thesis",
  "whatWentWell",
  "whatWentWrong",
  "executionQuality",
  "ruleAdherence",
  "riskManagement",
  "emotionalObservations",
  "lessonsLearned",
  "improvementActions",
  "notes",
  "rating",
  "templateId",
  "trades",
  "tagIds",
  "mistakeIds",
]);

const ALLOWED_UPDATE_REVIEW_KEYS = new Set([
  "title",
  "reviewDate",
  "status",
  "thesis",
  "whatWentWell",
  "whatWentWrong",
  "executionQuality",
  "ruleAdherence",
  "riskManagement",
  "emotionalObservations",
  "lessonsLearned",
  "improvementActions",
  "notes",
  "rating",
  "templateId",
  "trades",
  "tagIds",
  "mistakeIds",
]);

export function validateCreateReviewInput(input: CreateReviewInput): ValidationResult {
  const errors: FieldError[] = [];

  for (const key of Object.keys(input)) {
    if (!ALLOWED_CREATE_REVIEW_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in creation payload` });
    }
  }

  if (!input.reviewDate) {
    errors.push({ path: "reviewDate", message: "reviewDate is required" });
  } else {
    const d = typeof input.reviewDate === "string" ? new Date(input.reviewDate) : input.reviewDate;
    if (isNaN(d.getTime())) {
      errors.push({ path: "reviewDate", message: "reviewDate must be a valid date" });
    }
  }

  if (input.status !== undefined && input.status !== null) {
    if (!ALLOWED_REVIEW_STATUSES.includes(input.status as ReviewStatusValue)) {
      errors.push({
        path: "status",
        message: `status must be one of: ${ALLOWED_REVIEW_STATUSES.join(", ")}`,
      });
    }
  }

  if (input.title !== undefined && input.title !== null) {
    if (typeof input.title !== "string") {
      errors.push({ path: "title", message: "title must be a string" });
    } else if (input.title.length > 255) {
      errors.push({ path: "title", message: "title cannot exceed 255 characters" });
    }
  }

  const scoreFields: Array<{ name: string; val: number | null | undefined }> = [
    { name: "executionQuality", val: input.executionQuality },
    { name: "ruleAdherence", val: input.ruleAdherence },
    { name: "riskManagement", val: input.riskManagement },
    { name: "rating", val: input.rating },
  ];

  for (const sf of scoreFields) {
    if (sf.val !== undefined && sf.val !== null) {
      if (!Number.isInteger(sf.val) || sf.val < 1 || sf.val > 10) {
        errors.push({ path: sf.name, message: `${sf.name} must be an integer between 1 and 10` });
      }
    }
  }

  const textFields: Array<{ name: string; val: string | null | undefined }> = [
    { name: "thesis", val: input.thesis },
    { name: "whatWentWell", val: input.whatWentWell },
    { name: "whatWentWrong", val: input.whatWentWrong },
    { name: "emotionalObservations", val: input.emotionalObservations },
    { name: "lessonsLearned", val: input.lessonsLearned },
    { name: "improvementActions", val: input.improvementActions },
    { name: "notes", val: input.notes },
  ];

  for (const tf of textFields) {
    if (tf.val !== undefined && tf.val !== null) {
      if (typeof tf.val !== "string") {
        errors.push({ path: tf.name, message: `${tf.name} must be a string` });
      } else if (tf.val.length > 20000) {
        errors.push({ path: tf.name, message: `${tf.name} cannot exceed 20,000 characters` });
      }
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

  if (input.tagIds !== undefined && input.tagIds !== null) {
    if (!Array.isArray(input.tagIds)) {
      errors.push({ path: "tagIds", message: "tagIds must be an array of strings" });
    } else if (input.tagIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "tagIds", message: "Each tagId must be a non-empty string" });
    }
  }

  if (input.mistakeIds !== undefined && input.mistakeIds !== null) {
    if (!Array.isArray(input.mistakeIds)) {
      errors.push({ path: "mistakeIds", message: "mistakeIds must be an array of strings" });
    } else if (input.mistakeIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "mistakeIds", message: "Each mistakeId must be a non-empty string" });
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateUpdateReviewInput(input: UpdateReviewInput): ValidationResult {
  const errors: FieldError[] = [];

  if (Object.keys(input).length === 0) {
    errors.push({ path: "body", message: "At least one field to update must be provided" });
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_UPDATE_REVIEW_KEYS.has(key)) {
      errors.push({ path: key, message: `Field '${key}' is not permitted in update payload` });
    }
  }

  if (input.reviewDate !== undefined && input.reviewDate !== null) {
    const d = typeof input.reviewDate === "string" ? new Date(input.reviewDate) : input.reviewDate;
    if (isNaN(d.getTime())) {
      errors.push({ path: "reviewDate", message: "reviewDate must be a valid date" });
    }
  }

  if (input.status !== undefined && input.status !== null) {
    if (!ALLOWED_REVIEW_STATUSES.includes(input.status as ReviewStatusValue)) {
      errors.push({
        path: "status",
        message: `status must be one of: ${ALLOWED_REVIEW_STATUSES.join(", ")}`,
      });
    }
  }

  if (input.title !== undefined && input.title !== null) {
    if (typeof input.title !== "string") {
      errors.push({ path: "title", message: "title must be a string" });
    } else if (input.title.length > 255) {
      errors.push({ path: "title", message: "title cannot exceed 255 characters" });
    }
  }

  const scoreFields: Array<{ name: string; val: number | null | undefined }> = [
    { name: "executionQuality", val: input.executionQuality },
    { name: "ruleAdherence", val: input.ruleAdherence },
    { name: "riskManagement", val: input.riskManagement },
    { name: "rating", val: input.rating },
  ];

  for (const sf of scoreFields) {
    if (sf.val !== undefined && sf.val !== null) {
      if (!Number.isInteger(sf.val) || sf.val < 1 || sf.val > 10) {
        errors.push({ path: sf.name, message: `${sf.name} must be an integer between 1 and 10` });
      }
    }
  }

  const textFields: Array<{ name: string; val: string | null | undefined }> = [
    { name: "thesis", val: input.thesis },
    { name: "whatWentWell", val: input.whatWentWell },
    { name: "whatWentWrong", val: input.whatWentWrong },
    { name: "emotionalObservations", val: input.emotionalObservations },
    { name: "lessonsLearned", val: input.lessonsLearned },
    { name: "improvementActions", val: input.improvementActions },
    { name: "notes", val: input.notes },
  ];

  for (const tf of textFields) {
    if (tf.val !== undefined && tf.val !== null) {
      if (typeof tf.val !== "string") {
        errors.push({ path: tf.name, message: `${tf.name} must be a string` });
      } else if (tf.val.length > 20000) {
        errors.push({ path: tf.name, message: `${tf.name} cannot exceed 20,000 characters` });
      }
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

  if (input.tagIds !== undefined && input.tagIds !== null) {
    if (!Array.isArray(input.tagIds)) {
      errors.push({ path: "tagIds", message: "tagIds must be an array of strings" });
    } else if (input.tagIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "tagIds", message: "Each tagId must be a non-empty string" });
    }
  }

  if (input.mistakeIds !== undefined && input.mistakeIds !== null) {
    if (!Array.isArray(input.mistakeIds)) {
      errors.push({ path: "mistakeIds", message: "mistakeIds must be an array of strings" });
    } else if (input.mistakeIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push({ path: "mistakeIds", message: "Each mistakeId must be a non-empty string" });
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates state transitions between review statuses.
 * DRAFT <-> IN_REVIEW <-> COMPLETED
 */
export function validateReviewStatusTransition(
  currentStatus: ReviewStatusValue,
  nextStatus: ReviewStatusValue,
): ValidationResult {
  if (!ALLOWED_REVIEW_STATUSES.includes(nextStatus)) {
    return {
      isValid: false,
      errors: [{ path: "status", message: `Invalid status: '${nextStatus}'` }],
    };
  }

  if (currentStatus === nextStatus) {
    return { isValid: true, errors: [] };
  }

  const validTransitions: Record<ReviewStatusValue, ReadonlyArray<ReviewStatusValue>> = {
    DRAFT: ["IN_REVIEW", "COMPLETED"],
    IN_REVIEW: ["DRAFT", "COMPLETED"],
    COMPLETED: ["IN_REVIEW", "DRAFT"],
  };

  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      isValid: false,
      errors: [
        {
          path: "status",
          message: `Cannot transition review status from '${currentStatus}' to '${nextStatus}'`,
        },
      ],
    };
  }

  return { isValid: true, errors: [] };
}
