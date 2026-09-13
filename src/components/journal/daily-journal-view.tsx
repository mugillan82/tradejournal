/**
 * Daily Journal View Component
 *
 * Production-grade Daily Journal workspace for traders.
 *
 * Capabilities:
 * - Date navigation (prev, next, today, picker)
 * - Calendar integration: parses `?date=YYYY-MM-DD` from URL query
 * - Title, reflection notes, mood pills, energy & focus scores
 * - Tag classification integration
 * - Linked trades for the selected date with navigation to `/trades/[id]`
 * - Evidence attachments upload, list, and secure download
 * - Search & mood filtering across journal history
 * - Autosave/save/edit/delete with validation feedback
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Tag as TagIcon,
  CalendarDays,
} from "@/components/icons";
import {
  fetchJournalEntries,
  fetchJournalEntryByDate,
  createJournalEntryApi,
  updateJournalEntryApi,
  deleteJournalEntryApi,
  uploadJournalAttachmentApi,
  JournalClientApiError,
} from "@/lib/client/journal";
import { fetchFilterOptions, type FilterOptionItem } from "@/lib/client/analytics";
import type {
  JournalEntryDto,
  JournalMoodValue,
} from "@/lib/trading/journal/types";
import { ALLOWED_JOURNAL_MOODS } from "@/lib/trading/journal/types";

function formatDateDisplay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function getMoodBadge(mood: JournalMoodValue | null) {
  if (!mood) return null;
  const moodStyles: Record<JournalMoodValue, { bg: string; text: string; label: string }> = {
    VERY_GOOD: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", label: "Very Good" },
    GOOD: { bg: "bg-teal-500/10 border-teal-500/30", text: "text-teal-400", label: "Good" },
    NEUTRAL: { bg: "bg-slate-800 border-slate-700", text: "text-slate-300", label: "Neutral" },
    BAD: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", label: "Bad" },
    VERY_BAD: { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-400", label: "Very Bad" },
  };

  const style = moodStyles[mood] || moodStyles.NEUTRAL;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function shiftIsoDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split("T")[0];
}

export function DailyJournalView() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryDate = searchParams.get("date");
  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : todayIso;
  });

  const [entries, setEntries] = useState<ReadonlyArray<JournalEntryDto>>([]);
  const [activeEntry, setActiveEntry] = useState<JournalEntryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [moodFilter, setMoodFilter] = useState<JournalMoodValue | "">("");

  // Editor form state
  const [isEditing, setIsEditing] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formMood, setFormMood] = useState<JournalMoodValue | "">("GOOD");
  const [formEnergy, setFormEnergy] = useState<number>(7);
  const [formFocus, setFormFocus] = useState<number>(8);
  const [formNotes, setFormNotes] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Available tags
  const [availableTags, setAvailableTags] = useState<FilterOptionItem[]>([]);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);

  // Delete modal state
  const [deletingEntry, setDeletingEntry] = useState<JournalEntryDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load classification tags once
  useEffect(() => {
    const controller = new AbortController();
    fetchFilterOptions(controller.signal)
      .then((opts) => setAvailableTags(opts.tags || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Load entry for selected date
  const loadDateEntry = useCallback(async (dateStr: string) => {
    try {
      const entry = await fetchJournalEntryByDate(dateStr);
      setActiveEntry(entry);
      if (entry) {
        setFormTitle(entry.title || "");
        setFormMood(entry.mood || "GOOD");
        setFormEnergy(entry.energy || 7);
        setFormFocus(entry.focus || 8);
        setFormNotes(entry.notes || "");
        setSelectedTagIds(entry.tags.map((t) => t.id));
      } else {
        setFormTitle("");
        setFormMood("GOOD");
        setFormEnergy(7);
        setFormFocus(8);
        setFormNotes("");
        setSelectedTagIds([]);
      }
    } catch (err) {
      console.warn("[DailyJournalView] Failed to load date entry:", err);
    }
  }, []);

  // Load recent journal entries list
  const loadRecentEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchJournalEntries(
        {
          search: searchQuery.trim() || undefined,
          mood: (moodFilter as JournalMoodValue) || undefined,
        },
        1,
        50,
      );
      setEntries(data.items);
    } catch (err: unknown) {
      setError(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to load journal entries.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, moodFilter]);

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (isMounted) {
        void loadRecentEntries();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [loadRecentEntries]);

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (isMounted) {
        void loadDateEntry(selectedDate);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedDate, loadDateEntry]);

  // Synchronize URL date
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setIsEditing(false);
    router.replace(`/daily-journal?date=${newDate}`, { scroll: false });
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      if (activeEntry) {
        // Update existing entry
        const updated = await updateJournalEntryApi(activeEntry.id, {
          title: formTitle.trim() || null,
          mood: (formMood as JournalMoodValue) || null,
          energy: formEnergy,
          focus: formFocus,
          notes: formNotes.trim() || null,
          tagIds: selectedTagIds,
        });
        setActiveEntry(updated);
        setIsEditing(false);
      } else {
        // Create new entry
        const created = await createJournalEntryApi({
          entryDate: selectedDate,
          title: formTitle.trim() || null,
          mood: (formMood as JournalMoodValue) || null,
          energy: formEnergy,
          focus: formFocus,
          notes: formNotes.trim() || null,
          tagIds: selectedTagIds,
        });
        setActiveEntry(created);
        setIsEditing(false);
      }
      await loadRecentEntries();
    } catch (err: unknown) {
      setFormError(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to save journal entry. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deletingEntry) return;
    setIsDeleting(true);
    try {
      await deleteJournalEntryApi(deletingEntry.id);
      setDeletingEntry(null);
      if (activeEntry?.id === deletingEntry.id) {
        setActiveEntry(null);
        setIsEditing(false);
      }
      await loadRecentEntries();
    } catch (err: unknown) {
      alert(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to delete entry.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeEntry) return;

    setUploadingFile(true);
    try {
      await uploadJournalAttachmentApi(activeEntry.id, file);
      await loadDateEntry(selectedDate);
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
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Daily Trading Journal</h1>
              <p className="text-sm text-slate-400">
                Systematic daily trader reflections, psychology tracking, and execution context.
              </p>
            </div>
          </div>
        </div>

        {/* Date Navigator Bar */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => handleDateChange(shiftIsoDate(selectedDate, -1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft size={18} />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && handleDateChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs font-mono font-semibold text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <button
            type="button"
            onClick={() => handleDateChange(shiftIsoDate(selectedDate, 1))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Next Day"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            onClick={() => handleDateChange(todayIso)}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Entry Editor / Reader (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-md p-6 shadow-xl relative overflow-hidden">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 left-1/4 w-96 h-24 bg-indigo-500/5 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
              <div>
                <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-semibold">
                  Date: {selectedDate}
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {formatDateDisplay(selectedDate)}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {activeEntry && !isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingEntry(activeEntry)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
                {!activeEntry && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
                  >
                    <PlusCircle size={14} />
                    <span>Create Daily Entry</span>
                  </button>
                )}
              </div>
            </div>

            {/* Read Mode */}
            {activeEntry && !isEditing ? (
              <div className="space-y-6">
                {/* Header overview metrics: Mood, Focus, Energy, Title */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Psychology Mood</span>
                    {getMoodBadge(activeEntry.mood)}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Energy Level</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {activeEntry.energy !== null ? `${activeEntry.energy}/10` : "—"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Execution Focus</span>
                    <span className="text-sm font-bold font-mono text-indigo-400">
                      {activeEntry.focus !== null ? `${activeEntry.focus}/10` : "—"}
                    </span>
                  </div>
                </div>

                {activeEntry.title && (
                  <div>
                    <h3 className="text-base font-semibold text-white">{activeEntry.title}</h3>
                  </div>
                )}

                {/* Notes Content */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Daily Reflection Notes
                  </div>
                  {activeEntry.notes ? (
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {activeEntry.notes}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No detailed notes recorded for this date.</p>
                  )}
                </div>

                {/* Tags Section */}
                {activeEntry.tags && activeEntry.tags.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TagIcon size={12} />
                      <span>Applied Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeEntry.tags.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Trades Section */}
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Linked Trades ({activeEntry.trades?.length || 0})
                  </div>
                  {activeEntry.trades && activeEntry.trades.length > 0 ? (
                    <div className="space-y-2">
                      {activeEntry.trades.map((tr) => (
                        <Link
                          key={tr.id}
                          href={`/trades/${tr.id}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">
                              {tr.symbol}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                tr.side === "LONG"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {tr.side}
                            </span>
                            <span className="text-xs text-slate-400">{tr.status}</span>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-mono text-xs font-semibold ${
                                tr.netPnl && parseFloat(tr.netPnl) > 0
                                  ? "text-emerald-400"
                                  : tr.netPnl && parseFloat(tr.netPnl) < 0
                                    ? "text-rose-400"
                                    : "text-slate-400"
                              }`}
                            >
                              {tr.netPnl ? `$${tr.netPnl}` : "—"}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No trades linked to this journal entry.</p>
                  )}
                </div>

                {/* Evidence Attachments Section */}
                <div className="border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Evidence & Attachments ({activeEntry.attachments?.length || 0})
                    </span>

                    <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                      <span>{uploadingFile ? "Uploading..." : "+ Attach Evidence"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,application/pdf"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {activeEntry.attachments && activeEntry.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeEntry.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
                        >
                          <span className="truncate max-w-[200px]">{att.fileName}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">
                            {att.mimeType?.split("/")[1] || "FILE"}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No screenshot or PDF attachments uploaded.</p>
                  )}
                </div>
              </div>
            ) : isEditing ? (
              /* Edit / Create Form */
              <form onSubmit={handleSaveEntry} className="space-y-5">
                {formError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Journal Title / Theme (Optional)
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. CPI Volatility Session & Breakout Follow-Through"
                    maxLength={255}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Mood Pills Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Psychological State / Mood
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ALLOWED_JOURNAL_MOODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormMood(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          formMood === m
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-md scale-105"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {m.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Energy & Focus Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                      <span>Energy Level (1-10)</span>
                      <span className="font-mono text-emerald-400 font-bold">{formEnergy}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={formEnergy}
                      onChange={(e) => setFormEnergy(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                      <span>Focus / Discipline (1-10)</span>
                      <span className="font-mono text-indigo-400 font-bold">{formFocus}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={formFocus}
                      onChange={(e) => setFormFocus(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>

                {/* Reflection Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Trader Reflection & Notes
                  </label>
                  <textarea
                    rows={6}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Capture your pre-market thesis, mental discipline during trade management, mistakes avoided, or market behavior..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
                  />
                </div>

                {/* Tags Selector */}
                {availableTags.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Classify with Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              isSelected
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                            }`}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                    <span>{isSaving ? "Saving..." : activeEntry ? "Update Entry" : "Create Entry"}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Empty date state */
              <div className="text-center py-12 space-y-3">
                <div className="inline-flex p-3 rounded-full bg-slate-800/80 text-slate-400 mb-1">
                  <CalendarDays size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-200">No Journal Entry for this Date</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Keep your trading process sharp by logging your daily market observations and psychology.
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-colors"
                >
                  <PlusCircle size={14} />
                  <span>Log Journal for {selectedDate}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Journal History (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Journal History ({entries.length})
              </span>
              <button
                type="button"
                onClick={loadRecentEntries}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Refresh history"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* History Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search reflections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={moodFilter}
                onChange={(e) => setMoodFilter(e.target.value as JournalMoodValue | "")}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Moods</option>
                {ALLOWED_JOURNAL_MOODS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin" size={14} />
                <span>Loading journal history...</span>
              </div>
            ) : error ? (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            ) : entries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No entries match your search criteria.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {entries.map((item) => {
                  const itemIso = new Date(item.entryDate).toISOString().split("T")[0];
                  const isCurrent = itemIso === selectedDate;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleDateChange(itemIso)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-indigo-600/10 border-indigo-500/40 ring-1 ring-indigo-500/30"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-medium text-slate-300">
                          {formatDateDisplay(item.entryDate)}
                        </span>
                        {getMoodBadge(item.mood)}
                      </div>

                      {item.title && (
                        <p className="text-xs font-semibold text-slate-200 truncate mb-1">
                          {item.title}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {item.notes}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                        {item.energy !== null && <span>Energy: {item.energy}/10</span>}
                        {item.focus !== null && <span>Focus: {item.focus}/10</span>}
                        {item.trades && item.trades.length > 0 && (
                          <span>{item.trades.length} trade(s)</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Delete Journal Entry?</span>
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete the daily reflection for{" "}
              <strong className="text-slate-200">{formatDateDisplay(deletingEntry.entryDate)}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEntry}
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
