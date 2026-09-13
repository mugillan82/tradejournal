/**
 * Journal Domain — Client Data Layer
 *
 * Typed client API functions for:
 * - Daily Journal entries
 * - Notebook notes
 * - Structured Trade Reviews & Status Workflow
 * - Review Templates
 * - Journal/Review/Notebook Attachments
 */

import type {
  JournalEntryDto,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  JournalEntryListFilters,
  JournalEntryListResult,
  NotebookNoteDto,
  CreateNotebookNoteInput,
  UpdateNotebookNoteInput,
  NotebookNoteListFilters,
  NotebookNoteListResult,
  ReviewDto,
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListFilters,
  ReviewListResult,
  ReviewTemplateDto,
  CreateReviewTemplateInput,
  UpdateReviewTemplateInput,
  ReviewStatusValue,
} from "../trading/journal/types";
import type { AttachmentDto } from "../trading/attachment/types";

export class JournalClientApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: ReadonlyArray<{ path: string; message: string }>;

  constructor(
    message: string,
    status: number,
    code: string = "INTERNAL_ERROR",
    fieldErrors?: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "JournalClientApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data.error || {};
    throw new JournalClientApiError(
      err.message || `Request failed with status ${res.status}`,
      res.status,
      err.code || "REQUEST_FAILED",
      err.fieldErrors,
    );
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// 1. Daily Journal
// ---------------------------------------------------------------------------

export async function fetchJournalEntries(
  filters: JournalEntryListFilters = {},
  page = 1,
  pageSize = 50,
  signal?: AbortSignal,
): Promise<JournalEntryListResult> {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set("fromDate", filters.fromDate.toISOString());
  if (filters.toDate) params.set("toDate", filters.toDate.toISOString());
  if (filters.mood) params.set("mood", filters.mood);
  if (filters.search) params.set("search", filters.search);
  if (filters.tagId) params.set("tagId", filters.tagId);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  const res = await fetch(`/api/journal?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  return handleResponse<JournalEntryListResult>(res);
}

export async function fetchJournalEntryById(
  id: string,
  signal?: AbortSignal,
): Promise<JournalEntryDto> {
  const res = await fetch(`/api/journal/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
  });
  return handleResponse<JournalEntryDto>(res);
}

export async function fetchJournalEntryByDate(
  dateStr: string,
  signal?: AbortSignal,
): Promise<JournalEntryDto | null> {
  const res = await fetch(`/api/journal/by-date?date=${encodeURIComponent(dateStr)}`, {
    cache: "no-store",
    signal,
  });
  if (res.status === 404) return null;
  return handleResponse<JournalEntryDto | null>(res);
}

export async function createJournalEntryApi(
  input: CreateJournalEntryInput,
): Promise<JournalEntryDto> {
  const res = await fetch("/api/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<JournalEntryDto>(res);
}

export async function updateJournalEntryApi(
  id: string,
  input: UpdateJournalEntryInput,
): Promise<JournalEntryDto> {
  const res = await fetch(`/api/journal/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<JournalEntryDto>(res);
}

export async function deleteJournalEntryApi(id: string): Promise<void> {
  const res = await fetch(`/api/journal/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
}

export async function uploadJournalAttachmentApi(
  journalEntryId: string,
  file: File,
): Promise<AttachmentDto> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/journal/${encodeURIComponent(journalEntryId)}/attachments`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<AttachmentDto>(res);
}

// ---------------------------------------------------------------------------
// 2. Notebook
// ---------------------------------------------------------------------------

export async function fetchNotebookNotes(
  filters: NotebookNoteListFilters = {},
  page = 1,
  pageSize = 50,
  signal?: AbortSignal,
): Promise<NotebookNoteListResult> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.strategyId) params.set("strategyId", filters.strategyId);
  if (filters.setupId) params.set("setupId", filters.setupId);
  if (filters.tagId) params.set("tagId", filters.tagId);
  if (filters.isArchived !== undefined) params.set("isArchived", String(filters.isArchived));
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  const res = await fetch(`/api/notebook?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  return handleResponse<NotebookNoteListResult>(res);
}

export async function fetchNotebookNoteById(
  id: string,
  signal?: AbortSignal,
): Promise<NotebookNoteDto> {
  const res = await fetch(`/api/notebook/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
  });
  return handleResponse<NotebookNoteDto>(res);
}

export async function createNotebookNoteApi(
  input: CreateNotebookNoteInput,
): Promise<NotebookNoteDto> {
  const res = await fetch("/api/notebook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<NotebookNoteDto>(res);
}

export async function updateNotebookNoteApi(
  id: string,
  input: UpdateNotebookNoteInput,
): Promise<NotebookNoteDto> {
  const res = await fetch(`/api/notebook/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<NotebookNoteDto>(res);
}

export async function deleteNotebookNoteApi(id: string): Promise<void> {
  const res = await fetch(`/api/notebook/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
}

export async function uploadNotebookAttachmentApi(
  noteId: string,
  file: File,
): Promise<AttachmentDto> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/notebook/${encodeURIComponent(noteId)}/attachments`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<AttachmentDto>(res);
}

// ---------------------------------------------------------------------------
// 3. Structured Reviews & Workflow
// ---------------------------------------------------------------------------

export async function fetchReviews(
  filters: ReviewListFilters = {},
  page = 1,
  pageSize = 50,
  signal?: AbortSignal,
): Promise<ReviewListResult> {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set("fromDate", filters.fromDate.toISOString());
  if (filters.toDate) params.set("toDate", filters.toDate.toISOString());
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.rating !== undefined) params.set("rating", filters.rating.toString());
  if (filters.tagId) params.set("tagId", filters.tagId);
  if (filters.mistakeId) params.set("mistakeId", filters.mistakeId);
  if (filters.tradeId) params.set("tradeId", filters.tradeId);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  const res = await fetch(`/api/reviews?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  return handleResponse<ReviewListResult>(res);
}

export async function fetchReviewById(
  id: string,
  signal?: AbortSignal,
): Promise<ReviewDto> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
    cache: "no-store",
    signal,
  });
  return handleResponse<ReviewDto>(res);
}

export async function createReviewApi(
  input: CreateReviewInput,
): Promise<ReviewDto> {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<ReviewDto>(res);
}

export async function updateReviewApi(
  id: string,
  input: UpdateReviewInput,
): Promise<ReviewDto> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<ReviewDto>(res);
}

export async function updateReviewStatusApi(
  id: string,
  status: ReviewStatusValue,
): Promise<ReviewDto> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return handleResponse<ReviewDto>(res);
}

export async function deleteReviewApi(id: string): Promise<void> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
}

export async function uploadReviewAttachmentApi(
  reviewId: string,
  file: File,
): Promise<AttachmentDto> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/attachments`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<AttachmentDto>(res);
}

// ---------------------------------------------------------------------------
// 4. Review Templates
// ---------------------------------------------------------------------------

export async function fetchReviewTemplates(
  signal?: AbortSignal,
): Promise<ReadonlyArray<ReviewTemplateDto>> {
  const res = await fetch("/api/review-templates", {
    cache: "no-store",
    signal,
  });
  return handleResponse<ReadonlyArray<ReviewTemplateDto>>(res);
}

export async function createReviewTemplateApi(
  input: CreateReviewTemplateInput,
): Promise<ReviewTemplateDto> {
  const res = await fetch("/api/review-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<ReviewTemplateDto>(res);
}

export async function updateReviewTemplateApi(
  id: string,
  input: UpdateReviewTemplateInput,
): Promise<ReviewTemplateDto> {
  const res = await fetch(`/api/review-templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<ReviewTemplateDto>(res);
}

export async function deleteReviewTemplateApi(id: string): Promise<void> {
  const res = await fetch(`/api/review-templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return handleResponse<void>(res);
}
