/**
 * Trade Reviews View Component
 *
 * Production-grade Post-Trade Reviews manager.
 * Features:
 * - List of structured reviews with ratings, dates, and associated trade count
 * - Create new review with title, date, rating, and notes
 * - Edit existing review
 * - Delete review with confirmation
 * - Loading, empty, and error states
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  Check,
  Star,
} from "@/components/icons";
import {
  fetchReviews,
  createReviewClient,
  updateReviewClient,
  deleteReviewClient,
  TradeClientApiError,
  type ReviewDto,
} from "@/lib/client/trades";

function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function TradeReviewsView() {
  const [reviews, setReviews] = useState<ReadonlyArray<ReviewDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create/Edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewDto | null>(null);
  const [title, setTitle] = useState("");
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rating, setRating] = useState<number>(8);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deletingReview, setDeletingReview] = useState<ReviewDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchReviews();
      setReviews(data.items);
    } catch (err: unknown) {
      setError(
        err instanceof TradeClientApiError
          ? err.message
          : "Failed to load trade reviews.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchReviews();
        if (isMounted) setReviews(data.items);
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof TradeClientApiError
              ? err.message
              : "Failed to load trade reviews.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const openCreate = () => {
    setEditingReview(null);
    setTitle("");
    setReviewDate(new Date().toISOString().split("T")[0]);
    setRating(8);
    setNotes("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (rev: ReviewDto) => {
    setEditingReview(rev);
    setTitle(rev.title || "");
    setReviewDate(new Date(rev.reviewDate).toISOString().split("T")[0]);
    setRating(rev.rating ?? 8);
    setNotes(rev.notes || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      if (editingReview) {
        const updated = await updateReviewClient(editingReview.id, {
          title,
          reviewDate,
          rating,
          notes,
        });
        setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createReviewClient({
          title,
          reviewDate,
          rating,
          notes,
        });
        setReviews((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof TradeClientApiError
          ? err.message
          : "Failed to save review.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingReview) return;
    setIsDeleting(true);
    try {
      await deleteReviewClient(deletingReview.id);
      setReviews((prev) => prev.filter((r) => r.id !== deletingReview.id));
      setDeletingReview(null);
    } catch (err: unknown) {
      alert(err instanceof TradeClientApiError ? err.message : "Failed to delete review");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList size={24} className="text-emerald-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Trade Reviews
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Conduct post-trade evaluations, analyze execution quality, and track session performance.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/30"
        >
          <PlusCircle size={16} />
          <span>New Trade Review</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-4 text-xs text-rose-300 flex items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadReviews}
            className="inline-flex items-center gap-1 rounded bg-rose-900/50 hover:bg-rose-900 px-2.5 py-1 text-xs font-medium text-rose-200"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Review List */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/40 border border-slate-800" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-3">
          <ClipboardList size={36} className="mx-auto text-slate-600" />
          <h3 className="text-sm font-bold text-slate-200">No Post-Trade Reviews Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Evaluate your weekly sessions, flag recurring execution flaws, and grade your discipline.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <PlusCircle size={14} />
              <span>Create First Review</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4 shadow-xl hover:border-slate-700/80 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-slate-100">
                    {rev.title || `Review for ${formatDate(rev.reviewDate)}`}
                  </h3>
                  <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {formatDate(rev.reviewDate)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(rev)}
                    aria-label={`Edit review ${rev.title || rev.id}`}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingReview(rev)}
                    aria-label={`Delete review ${rev.title || rev.id}`}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Rating & Trades Count */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                {rev.rating !== null && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-400 font-semibold font-mono">
                    <Star size={14} />
                    <span>Grade: {rev.rating}/10</span>
                  </div>
                )}
                <span className="text-slate-400">
                  Associated Trades: <strong className="text-slate-200">{rev.trades.length}</strong>
                </span>
              </div>

              {/* Review Notes */}
              {rev.notes ? (
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {rev.notes}
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">No notes recorded for this review.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="review-modal-title" className="text-base font-bold text-slate-100">
                {editingReview ? "Edit Trade Review" : "New Post-Trade Review"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Review Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekly Execution Audit - Week 12"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Review Date
                </label>
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Execution Discipline Rating ({rating}/10)
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Evaluation &amp; Action Items
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Summarize adherence to risk parameters, timing of exits, and key improvements..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{isSaving ? "Saving..." : "Save Review"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingReview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-review-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 id="delete-review-title" className="text-sm font-bold text-slate-100">
              Delete Trade Review
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this review?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingReview(null)}
                disabled={isDeleting}
                className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
