/**
 * Trade Reviews View Component
 *
 * Production-grade Post-Trade Reviews workspace for traders.
 *
 * Features:
 * - Structured retrospective workflow with status: DRAFT -> IN_REVIEW -> COMPLETED
 * - Review Templates (Pre-Trade Checklist, Post-Trade Reflection, Weekly Performance Review, custom)
 * - Quantitative metrics: Execution Quality, Rule Adherence, Risk Management, Rating (1-10)
 * - Qualitative reflection: Thesis, What Went Well, What Went Wrong, Emotional observations, Lessons, Actions
 * - Multi-trade linking with calculated analytics metrics (win rate, net P&L, profit factor, average R)
 * - Navigation between review <-> trades
 * - Evidence attachments upload & download
 * - Classification tags & recurring mistakes linking
 * - Search & multi-dimensional filtering
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
  Search,
} from "@/components/icons";
import {
  fetchReviews,
  createReviewApi,
  updateReviewApi,
  updateReviewStatusApi,
  deleteReviewApi,
  uploadReviewAttachmentApi,
  fetchReviewTemplates,
  JournalClientApiError,
} from "@/lib/client/journal";
import { fetchFilterOptions, type FilterOptionItem } from "@/lib/client/analytics";
import type {
  ReviewDto,
  ReviewStatusValue,
  ReviewTemplateDto,
} from "@/lib/trading/journal/types";
import { ALLOWED_REVIEW_STATUSES } from "@/lib/trading/journal/types";

function formatDateDisplay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function getStatusBadge(status: ReviewStatusValue) {
  const styles: Record<ReviewStatusValue, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: "bg-slate-800 border-slate-700", text: "text-slate-300", label: "Draft" },
    IN_REVIEW: { bg: "bg-indigo-500/10 border-indigo-500/30", text: "text-indigo-400", label: "In Review" },
    COMPLETED: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", label: "Completed" },
  };
  const s = styles[status] || styles.DRAFT;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export function TradeReviewsView() {
  const searchParams = useSearchParams();
  const queryDate = searchParams.get("date");
  const queryTradeId = searchParams.get("tradeId");

  const [reviews, setReviews] = useState<ReadonlyArray<ReviewDto>>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewDto | null>(null);
  const [templates, setTemplates] = useState<ReadonlyArray<ReviewTemplateDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatusValue | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [mistakeFilter, setMistakeFilter] = useState("");

  // Classification Options
  const [availableTags, setAvailableTags] = useState<FilterOptionItem[]>([]);
  const [availableMistakes, setAvailableMistakes] = useState<FilterOptionItem[]>([]);

  // Editor Modal / Pane State
  const [isEditing, setIsEditing] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formReviewDate, setFormReviewDate] = useState(() => queryDate || new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState<ReviewStatusValue>("DRAFT");
  const [formThesis, setFormThesis] = useState("");
  const [formWhatWentWell, setFormWhatWentWell] = useState("");
  const [formWhatWentWrong, setFormWhatWentWrong] = useState("");
  const [formExecutionQuality, setFormExecutionQuality] = useState<number>(8);
  const [formRuleAdherence, setFormRuleAdherence] = useState<number>(8);
  const [formRiskManagement, setFormRiskManagement] = useState<number>(8);
  const [formRating, setFormRating] = useState<number>(8);
  const [formEmotional, setFormEmotional] = useState("");
  const [formLessons, setFormLessons] = useState("");
  const [formActions, setFormActions] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formMistakeIds, setFormMistakeIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Attachment upload
  const [uploadingFile, setUploadingFile] = useState(false);

  // Delete state
  const [deletingReview, setDeletingReview] = useState<ReviewDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load classification filter options & templates
  useEffect(() => {
    const controller = new AbortController();
    fetchFilterOptions(controller.signal)
      .then((opts) => {
        setAvailableTags(opts.tags || []);
        setAvailableMistakes(opts.mistakes || []);
      })
      .catch(() => {});

    fetchReviewTemplates(controller.signal)
      .then((tpls) => setTemplates(tpls))
      .catch(() => {});

    return () => controller.abort();
  }, []);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchReviews(
        {
          search: searchQuery.trim() || undefined,
          status: (statusFilter as ReviewStatusValue) || undefined,
          tagId: tagFilter || undefined,
          mistakeId: mistakeFilter || undefined,
          tradeId: queryTradeId || undefined,
        },
        1,
        50,
      );
      setReviews(data.items);
      if (data.items.length > 0 && !selectedReview) {
        setSelectedReview(data.items[0]);
      } else if (data.items.length === 0) {
        setSelectedReview(null);
      }
    } catch (err: unknown) {
      setError(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to load trade reviews.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, tagFilter, mistakeFilter, queryTradeId, selectedReview]);

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (isMounted) {
        void loadReviews();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [loadReviews]);

  const openCreateReview = () => {
    setFormTitle("");
    setFormReviewDate(queryDate || new Date().toISOString().split("T")[0]);
    setFormStatus("DRAFT");
    setFormThesis("");
    setFormWhatWentWell("");
    setFormWhatWentWrong("");
    setFormExecutionQuality(8);
    setFormRuleAdherence(8);
    setFormRiskManagement(8);
    setFormRating(8);
    setFormEmotional("");
    setFormLessons("");
    setFormActions("");
    setFormNotes("");
    setFormTemplateId("");
    setFormTagIds([]);
    setFormMistakeIds([]);
    setIsEditing(true);
    setFormError(null);
  };

  const openEditReview = (r: ReviewDto) => {
    setFormTitle(r.title || "");
    setFormReviewDate(new Date(r.reviewDate).toISOString().split("T")[0]);
    setFormStatus(r.status);
    setFormThesis(r.thesis || "");
    setFormWhatWentWell(r.whatWentWell || "");
    setFormWhatWentWrong(r.whatWentWrong || "");
    setFormExecutionQuality(r.executionQuality || 8);
    setFormRuleAdherence(r.ruleAdherence || 8);
    setFormRiskManagement(r.riskManagement || 8);
    setFormRating(r.rating || 8);
    setFormEmotional(r.emotionalObservations || "");
    setFormLessons(r.lessonsLearned || "");
    setFormActions(r.improvementActions || "");
    setFormNotes(r.notes || "");
    setFormTemplateId(r.templateId || "");
    setFormTagIds(r.tags.map((t) => t.id));
    setFormMistakeIds(r.mistakes.map((m) => m.id));
    setIsEditing(true);
    setFormError(null);
  };

  const applyTemplatePrompts = (tplId: string) => {
    setFormTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl || tpl.prompts.length === 0) return;

    const formattedPrompts = tpl.prompts
      .map((p) => `### ${p}\n\n`)
      .join("\n");

    if (!formNotes.trim()) {
      setFormNotes(formattedPrompts);
    } else {
      setFormNotes((prev) => `${prev}\n\n${formattedPrompts}`);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      if (selectedReview && isEditing && selectedReview.id) {
        const updated = await updateReviewApi(selectedReview.id, {
          title: formTitle.trim() || null,
          reviewDate: formReviewDate,
          status: formStatus,
          thesis: formThesis.trim() || null,
          whatWentWell: formWhatWentWell.trim() || null,
          whatWentWrong: formWhatWentWrong.trim() || null,
          executionQuality: formExecutionQuality,
          ruleAdherence: formRuleAdherence,
          riskManagement: formRiskManagement,
          rating: formRating,
          emotionalObservations: formEmotional.trim() || null,
          lessonsLearned: formLessons.trim() || null,
          improvementActions: formActions.trim() || null,
          notes: formNotes.trim() || null,
          templateId: formTemplateId || null,
          tagIds: formTagIds,
          mistakeIds: formMistakeIds,
        });
        setSelectedReview(updated);
        setIsEditing(false);
      } else {
        const created = await createReviewApi({
          title: formTitle.trim() || null,
          reviewDate: formReviewDate,
          status: formStatus,
          thesis: formThesis.trim() || null,
          whatWentWell: formWhatWentWell.trim() || null,
          whatWentWrong: formWhatWentWrong.trim() || null,
          executionQuality: formExecutionQuality,
          ruleAdherence: formRuleAdherence,
          riskManagement: formRiskManagement,
          rating: formRating,
          emotionalObservations: formEmotional.trim() || null,
          lessonsLearned: formLessons.trim() || null,
          improvementActions: formActions.trim() || null,
          notes: formNotes.trim() || null,
          templateId: formTemplateId || null,
          tagIds: formTagIds,
          mistakeIds: formMistakeIds,
        });
        setSelectedReview(created);
        setIsEditing(false);
      }
      await loadReviews();
    } catch (err: unknown) {
      setFormError(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to save review.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (r: ReviewDto, newStatus: ReviewStatusValue) => {
    try {
      const updated = await updateReviewStatusApi(r.id, newStatus);
      setSelectedReview(updated);
      await loadReviews();
    } catch (err: unknown) {
      alert(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to update review status.",
      );
    }
  };

  const handleDeleteReview = async () => {
    if (!deletingReview) return;
    setIsDeleting(true);
    try {
      await deleteReviewApi(deletingReview.id);
      setDeletingReview(null);
      if (selectedReview?.id === deletingReview.id) {
        setSelectedReview(null);
        setIsEditing(false);
      }
      await loadReviews();
    } catch (err: unknown) {
      alert(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to delete review.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedReview) return;

    setUploadingFile(true);
    try {
      await uploadReviewAttachmentApi(selectedReview.id, file);
      await loadReviews();
    } catch (err: unknown) {
      alert(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to upload attachment.",
      );
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const toggleTag = (tagId: string) => {
    setFormTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const toggleMistake = (mistakeId: string) => {
    setFormMistakeIds((prev) =>
      prev.includes(mistakeId)
        ? prev.filter((id) => id !== mistakeId)
        : [...prev, mistakeId],
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Trade Reviews</h1>
            <p className="text-sm text-slate-400">
              Structured retrospective analysis, execution ratings, and rules adherence.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateReview}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <PlusCircle size={15} />
          <span>New Review</span>
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Reviews List & Search (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Filter by Status, Tag & Mistake */}
            <div className="grid grid-cols-3 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReviewStatusValue | "")}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
              >
                <option value="">Status</option>
                {ALLOWED_REVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>

              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
              >
                <option value="">Tags</option>
                {availableTags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={mistakeFilter}
                onChange={(e) => setMistakeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
              >
                <option value="">Mistakes</option>
                {availableMistakes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reviews List */}
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin" size={14} />
                <span>Loading reviews...</span>
              </div>
            ) : error ? (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No reviews found.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {reviews.map((r) => {
                  const isCurrent = selectedReview?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedReview(r);
                        setIsEditing(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-indigo-600/10 border-indigo-500/40 ring-1 ring-indigo-500/30"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                          {r.title || formatDateDisplay(r.reviewDate)}
                        </span>
                        {getStatusBadge(r.status)}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1.5">
                        <span>{formatDateDisplay(r.reviewDate)}</span>
                        {r.rating !== null && (
                          <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                            <Star size={10} className="fill-amber-400" />
                            <span>{r.rating}/10</span>
                          </span>
                        )}
                        {r.trades && r.trades.length > 0 && (
                          <span>• {r.trades.length} trade(s)</span>
                        )}
                      </div>

                      {r.thesis && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {r.thesis}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Review Viewer / Editor (8 cols) */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl relative min-h-[500px]">
            {isEditing ? (
              /* Editor Form */
              <form onSubmit={handleSaveReview} className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-white">
                    {selectedReview ? "Edit Structured Review" : "Create Structured Review"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Template Selector Bar */}
                {templates.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400 font-medium">Use Structured Template:</span>
                    <select
                      value={formTemplateId}
                      onChange={(e) => e.target.value && applyTemplatePrompts(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select a Template...</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} {tpl.isDefault ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title & Review Date & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Review Title / Session Theme
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. FOMC Post-Market Execution Analysis"
                      maxLength={255}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Review Date *
                    </label>
                    <input
                      type="date"
                      value={formReviewDate}
                      onChange={(e) => setFormReviewDate(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Workflow Status
                  </label>
                  <div className="flex gap-2">
                    {ALLOWED_REVIEW_STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          formStatus === st
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {st.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantitative Scores Grid */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Quantitative Scores (1-10)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">
                        Execution: <strong className="text-indigo-400 font-mono">{formExecutionQuality}</strong>
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={formExecutionQuality}
                        onChange={(e) => setFormExecutionQuality(parseInt(e.target.value, 10))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">
                        Rule Adherence: <strong className="text-teal-400 font-mono">{formRuleAdherence}</strong>
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={formRuleAdherence}
                        onChange={(e) => setFormRuleAdherence(parseInt(e.target.value, 10))}
                        className="w-full accent-teal-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">
                        Risk Mgmt: <strong className="text-emerald-400 font-mono">{formRiskManagement}</strong>
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={formRiskManagement}
                        onChange={(e) => setFormRiskManagement(parseInt(e.target.value, 10))}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">
                        Overall Rating: <strong className="text-amber-400 font-mono">{formRating}</strong>
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={formRating}
                        onChange={(e) => setFormRating(parseInt(e.target.value, 10))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Structured Text Sections */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Thesis & Pre-Trade Plan
                    </label>
                    <textarea
                      rows={2}
                      value={formThesis}
                      onChange={(e) => setFormThesis(e.target.value)}
                      placeholder="What was the original market narrative or setup rationale?"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-emerald-400 mb-1">
                        What Went Well
                      </label>
                      <textarea
                        rows={3}
                        value={formWhatWentWell}
                        onChange={(e) => setFormWhatWentWell(e.target.value)}
                        placeholder="Disciplined execution, patience, respecting stop loss..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-rose-400 mb-1">
                        What Went Wrong
                      </label>
                      <textarea
                        rows={3}
                        value={formWhatWentWrong}
                        onChange={(e) => setFormWhatWentWrong(e.target.value)}
                        placeholder="Chasing entries, moving stop loss prematurely, oversized risk..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-indigo-300 mb-1">
                        Key Lessons Learned
                      </label>
                      <textarea
                        rows={3}
                        value={formLessons}
                        onChange={(e) => setFormLessons(e.target.value)}
                        placeholder="Key takeaway for your playbook..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-teal-300 mb-1">
                        Actionable Next Steps
                      </label>
                      <textarea
                        rows={3}
                        value={formActions}
                        onChange={(e) => setFormActions(e.target.value)}
                        placeholder="Concrete operational adjustments for upcoming sessions..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Comprehensive Review Notes & Template Prompts
                    </label>
                    <textarea
                      rows={5}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Detailed session reflection..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                    />
                  </div>
                </div>

                {/* Classifications: Tags & Mistakes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {availableTags.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {availableTags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${
                              formTagIds.includes(tag.id)
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                : "bg-slate-950 border-slate-800 text-slate-400"
                            }`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableMistakes.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-rose-400 mb-1.5">
                        Identified Mistakes
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {availableMistakes.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleMistake(m.id)}
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${
                              formMistakeIds.includes(m.id)
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                : "bg-slate-950 border-slate-800 text-slate-400"
                            }`}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                    <span>{isSaving ? "Saving..." : "Save Review"}</span>
                  </button>
                </div>
              </form>
            ) : selectedReview ? (
              /* Viewer Mode */
              <div className="space-y-6">
                {/* Review Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">
                        {selectedReview.title || "Retrospective Review"}
                      </h2>
                      {getStatusBadge(selectedReview.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>Date: {formatDateDisplay(selectedReview.reviewDate)}</span>
                      {selectedReview.templateName && (
                        <span>• Template: {selectedReview.templateName}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Workflow Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Status Transitions */}
                    {selectedReview.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(selectedReview, "IN_REVIEW")}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20"
                      >
                        Start Review →
                      </button>
                    )}
                    {selectedReview.status === "IN_REVIEW" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(selectedReview, "COMPLETED")}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                      >
                        Complete Review ✓
                      </button>
                    )}
                    {selectedReview.status === "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(selectedReview, "IN_REVIEW")}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                      >
                        Re-open
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditReview(selectedReview)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      title="Edit review"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingReview(selectedReview)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                      title="Delete review"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Quantitative Score Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                      Execution Quality
                    </span>
                    <span className="text-base font-bold font-mono text-indigo-400">
                      {selectedReview.executionQuality !== null ? `${selectedReview.executionQuality}/10` : "—"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                      Rule Adherence
                    </span>
                    <span className="text-base font-bold font-mono text-teal-400">
                      {selectedReview.ruleAdherence !== null ? `${selectedReview.ruleAdherence}/10` : "—"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                      Risk Management
                    </span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {selectedReview.riskManagement !== null ? `${selectedReview.riskManagement}/10` : "—"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                      Overall Rating
                    </span>
                    <span className="text-base font-bold font-mono text-amber-400">
                      {selectedReview.rating !== null ? `${selectedReview.rating}/10` : "—"}
                    </span>
                  </div>
                </div>

                {/* Calculated Linked Trade Metrics (Reusing Domain Engine) */}
                {selectedReview.computedMetrics && selectedReview.computedMetrics.tradeCount > 0 && (
                  <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                    <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                      Aggregated Trade Performance ({selectedReview.computedMetrics.tradeCount} Trades)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Win Rate</span>
                        <span className="text-sm font-bold font-mono text-slate-200">
                          {selectedReview.computedMetrics.winRate}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Net P&L</span>
                        <span
                          className={`text-sm font-bold font-mono ${
                            parseFloat(selectedReview.computedMetrics.netPnl) > 0
                              ? "text-emerald-400"
                              : parseFloat(selectedReview.computedMetrics.netPnl) < 0
                                ? "text-rose-400"
                                : "text-slate-400"
                          }`}
                        >
                          ${selectedReview.computedMetrics.netPnl}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Profit Factor</span>
                        <span className="text-sm font-bold font-mono text-slate-200">
                          {selectedReview.computedMetrics.profitFactor !== null
                            ? selectedReview.computedMetrics.profitFactor
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Average R</span>
                        <span className="text-sm font-bold font-mono text-slate-200">
                          {selectedReview.computedMetrics.averageR !== null
                            ? `${selectedReview.computedMetrics.averageR}R`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Structured Retrospective Content */}
                <div className="space-y-4">
                  {selectedReview.thesis && (
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Pre-Trade Thesis & Plan
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                        {selectedReview.thesis}
                      </p>
                    </div>
                  )}

                  {(selectedReview.whatWentWell || selectedReview.whatWentWrong) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedReview.whatWentWell && (
                        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                            What Went Well
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {selectedReview.whatWentWell}
                          </p>
                        </div>
                      )}
                      {selectedReview.whatWentWrong && (
                        <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20">
                          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                            What Went Wrong
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {selectedReview.whatWentWrong}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(selectedReview.lessonsLearned || selectedReview.improvementActions) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedReview.lessonsLearned && (
                        <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20">
                          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block mb-1">
                            Key Lessons Learned
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {selectedReview.lessonsLearned}
                          </p>
                        </div>
                      )}
                      {selectedReview.improvementActions && (
                        <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-500/20">
                          <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider block mb-1">
                            Actionable Improvements
                          </span>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {selectedReview.improvementActions}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedReview.notes && (
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Review Notes
                      </span>
                      <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                        {selectedReview.notes}
                      </div>
                    </div>
                  )}
                </div>

                {/* Linked Trades List */}
                {selectedReview.trades && selectedReview.trades.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Linked Trades ({selectedReview.trades.length})
                    </span>
                    <div className="space-y-2">
                      {selectedReview.trades.map((item) => (
                        <Link
                          key={item.id}
                          href={`/trades/${item.tradeId}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                              {item.trade?.symbol || item.tradeId}
                            </span>
                            {item.trade?.side && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  item.trade.side === "LONG"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                {item.trade.side}
                              </span>
                            )}
                            {item.notes && (
                              <span className="text-xs text-slate-400 italic">
                                &ldquo;{item.notes}&rdquo;
                              </span>
                            )}
                          </div>
                          {item.trade?.netPnl && (
                            <span
                              className={`font-mono text-xs font-bold ${
                                parseFloat(item.trade.netPnl) > 0
                                  ? "text-emerald-400"
                                  : parseFloat(item.trade.netPnl) < 0
                                    ? "text-rose-400"
                                    : "text-slate-400"
                              }`}
                            >
                              ${item.trade.netPnl}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Classifications & Mistakes */}
                {(selectedReview.tags.length > 0 || selectedReview.mistakes.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                    {selectedReview.tags.map((t) => (
                      <span
                        key={t.id}
                        className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        #{t.name}
                      </span>
                    ))}
                    {selectedReview.mistakes.map((m) => (
                      <span
                        key={m.id}
                        className="text-xs px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      >
                        Mistake: {m.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Evidence Attachments */}
                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Review Attachments ({selectedReview.attachments?.length || 0})
                    </span>

                    <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300">
                      <span>{uploadingFile ? "Uploading..." : "+ Add Evidence Chart"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,application/pdf"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {selectedReview.attachments && selectedReview.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedReview.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-300"
                        >
                          <span className="truncate max-w-[200px]">{att.fileName}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">
                            {att.mimeType?.split("/")[1] || "FILE"}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No attachments added to this review.</p>
                  )}
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="py-24 text-center space-y-3">
                <ClipboardList size={36} className="mx-auto text-slate-600" />
                <h3 className="text-base font-semibold text-slate-300">Select a review or create a new one</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Perform systematic retrospectives, track execution adherence, and identify recurring mistakes.
                </p>
                <button
                  type="button"
                  onClick={openCreateReview}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  <PlusCircle size={14} />
                  <span>Create Review</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Delete Review?</span>
              <button
                type="button"
                onClick={() => setDeletingReview(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete this review? Linked trades will remain intact.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingReview(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReview}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium disabled:opacity-50"
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
