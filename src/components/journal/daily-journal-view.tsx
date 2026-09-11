/**
 * Daily Journal View Component
 *
 * Production-grade Daily Journaling experience for traders.
 * Features:
 * - List of daily journal entries with mood, focus, energy, and reflection notes
 * - Create new journal entry with date selector, mood pills, and numeric ratings
 * - Edit existing daily reflection
 * - Delete entry with confirmation
 * - Loading, empty, and responsive design down to 375px
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  X,
  Check,
} from "@/components/icons";
import {
  fetchJournalEntries,
  createJournalEntryClient,
  updateJournalEntryClient,
  deleteJournalEntryClient,
  TradeClientApiError,
  type JournalEntryDto,
  type JournalMoodValue,
} from "@/lib/client/trades";
import { ALLOWED_JOURNAL_MOODS } from "@/lib/trading/journal/types";

function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

export function DailyJournalView() {
  const [entries, setEntries] = useState<ReadonlyArray<JournalEntryDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [mood, setMood] = useState<JournalMoodValue | "">("GOOD");
  const [energy, setEnergy] = useState<number>(7);
  const [focus, setFocus] = useState<number>(8);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit state
  const [editingEntry, setEditingEntry] = useState<JournalEntryDto | null>(null);

  // Delete state
  const [deletingEntry, setDeletingEntry] = useState<JournalEntryDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchJournalEntries();
      setEntries(data.items);
    } catch (err: unknown) {
      setError(
        err instanceof TradeClientApiError
          ? err.message
          : "Failed to load journal entries.",
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
        const data = await fetchJournalEntries();
        if (isMounted) setEntries(data.items);
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof TradeClientApiError
              ? err.message
              : "Failed to load journal entries.",
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
    setEditingEntry(null);
    setEntryDate(new Date().toISOString().split("T")[0]);
    setMood("GOOD");
    setEnergy(7);
    setFocus(8);
    setNotes("");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEdit = (entry: JournalEntryDto) => {
    setEditingEntry(entry);
    setEntryDate(new Date(entry.entryDate).toISOString().split("T")[0]);
    setMood(entry.mood || "");
    setEnergy(entry.energy ?? 7);
    setFocus(entry.focus ?? 8);
    setNotes(entry.notes || "");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      if (editingEntry) {
        const updated = await updateJournalEntryClient(editingEntry.id, {
          mood: mood ? (mood as JournalMoodValue) : null,
          energy,
          focus,
          notes,
        });
        setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await createJournalEntryClient({
          entryDate,
          mood: mood ? (mood as JournalMoodValue) : null,
          energy,
          focus,
          notes,
        });
        setEntries((prev) => [created, ...prev]);
      }
      setIsCreateOpen(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof TradeClientApiError
          ? err.message
          : "Failed to save journal entry.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingEntry) return;
    setIsDeleting(true);
    try {
      await deleteJournalEntryClient(deletingEntry.id);
      setEntries((prev) => prev.filter((item) => item.id !== deletingEntry.id));
      setDeletingEntry(null);
    } catch (err: unknown) {
      alert(err instanceof TradeClientApiError ? err.message : "Failed to delete entry");
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
            <BookOpen size={24} className="text-emerald-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Daily Journal
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Record psychological context, market conditions, and daily reflections.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/30"
        >
          <PlusCircle size={16} />
          <span>New Daily Entry</span>
        </button>
      </div>

      {/* Error alert */}
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
            onClick={loadEntries}
            className="inline-flex items-center gap-1 rounded bg-rose-900/50 hover:bg-rose-900 px-2.5 py-1 text-xs font-medium text-rose-200"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Entry List */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/40 border border-slate-800" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-3">
          <BookOpen size={36} className="mx-auto text-slate-600" />
          <h3 className="text-sm font-bold text-slate-200">No Journal Entries Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Log your daily mindset, focus levels, and post-session observations to track psychological discipline.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <PlusCircle size={14} />
              <span>Create First Entry</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 space-y-4 shadow-xl hover:border-slate-700/80 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-slate-100 font-mono">
                    {formatDate(entry.entryDate)}
                  </span>
                  {getMoodBadge(entry.mood)}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(entry)}
                    aria-label={`Edit journal entry for ${formatDate(entry.entryDate)}`}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingEntry(entry)}
                    aria-label={`Delete journal entry for ${formatDate(entry.entryDate)}`}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Metrics Pills */}
              <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-300">
                <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-sans uppercase text-slate-500 block">Energy</span>
                  <span className="font-bold text-slate-200">{entry.energy !== null ? `${entry.energy}/10` : "—"}</span>
                </div>
                <div className="bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-sans uppercase text-slate-500 block">Focus</span>
                  <span className="font-bold text-slate-200">{entry.focus !== null ? `${entry.focus}/10` : "—"}</span>
                </div>
              </div>

              {/* Reflection Notes */}
              {entry.notes ? (
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {entry.notes}
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">No notes recorded for this day.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="journal-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 id="journal-modal-title" className="text-base font-bold text-slate-100">
                {editingEntry ? "Edit Daily Reflection" : "New Daily Reflection"}
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
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
              {/* Entry Date */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Journal Date (UTC)
                </label>
                <input
                  type="date"
                  value={entryDate}
                  disabled={!!editingEntry}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                  required
                />
              </div>

              {/* Mood Selection */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Mindset / Mood
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALLOWED_JOURNAL_MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(m)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors text-center ${
                        mood === m
                          ? "border-emerald-500 bg-emerald-950/40 text-emerald-300"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {m.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy & Focus Sliders / Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Energy Level ({energy}/10)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={energy}
                    onChange={(e) => setEnergy(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Focus Level ({focus}/10)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={focus}
                    onChange={(e) => setFocus(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Daily Reflections &amp; Lessons
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reflect on your emotional discipline, market setups taken, and rules followed..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
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
                  <span>{isSaving ? "Saving..." : "Save Reflection"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-entry-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 id="delete-entry-title" className="text-sm font-bold text-slate-100">
              Delete Daily Reflection
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the journal entry for{" "}
              <strong className="text-slate-100">{formatDate(deletingEntry.entryDate)}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
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
