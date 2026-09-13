/**
 * Trade Notes Section Component
 *
 * Dedicated interactive trade notes manager on Trade Detail (/trades/[id]).
 * Features:
 * - List of chronological trade notes
 * - Add new note inline
 * - Edit existing note
 * - Delete note with confirmation
 * - Loading, empty, and error states
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  Check,
} from "@/components/icons";
import {
  fetchTradeNotes,
  createTradeNoteClient,
  updateTradeNoteClient,
  deleteTradeNoteClient,
  TradeClientApiError,
  type TradeNoteDto,
} from "@/lib/client/trades";

interface TradeNotesSectionProps {
  readonly tradeId: string;
}

function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}const PHASE_LABELS: Record<string, { label: string; style: string }> = {
  PRE_TRADE: { label: "Pre-Trade", style: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  ENTRY: { label: "Entry", style: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  MANAGEMENT: { label: "Management", style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  EXIT: { label: "Exit", style: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  POST_TRADE: { label: "Reflection", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  GENERAL: { label: "General", style: "bg-slate-800 text-slate-400 border-slate-700" },
};

export function TradeNotesSection({ tradeId }: TradeNotesSectionProps) {
  const [notes, setNotes] = useState<ReadonlyArray<TradeNoteDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Note State
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNotePhase, setNewNotePhase] = useState<string>("GENERAL");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Editing Note State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingPhase, setEditingPhase] = useState<string>("GENERAL");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Note State
  const [deletingNote, setDeletingNote] = useState<TradeNoteDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTradeNotes(tradeId);
      setNotes(data);
    } catch (err: unknown) {
      setError(
        err instanceof TradeClientApiError
          ? err.message
          : "Failed to load trade notes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchTradeNotes(tradeId);
        if (isMounted) setNotes(data);
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof TradeClientApiError
              ? err.message
              : "Failed to load trade notes.",
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
  }, [tradeId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    setIsAdding(true);
    setAddError(null);

    try {
      const created = await createTradeNoteClient(tradeId, newNoteContent.trim(), newNotePhase);
      setNotes((prev) => [created, ...prev]);
      setNewNoteContent("");
    } catch (err: unknown) {
      setAddError(
        err instanceof TradeClientApiError
          ? err.message
          : "Failed to add trade note.",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const startEdit = (note: TradeNoteDto) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
    setEditingPhase(note.phase || "GENERAL");
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingContent.trim()) return;

    setIsSavingEdit(true);
    try {
      const updated = await updateTradeNoteClient(tradeId, noteId, editingContent.trim(), editingPhase);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingNoteId(null);
    } catch (err: unknown) {
      alert(err instanceof TradeClientApiError ? err.message : "Failed to update note");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingNote) return;
    setIsDeleting(true);
    try {
      await deleteTradeNoteClient(tradeId, deletingNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== deletingNote.id));
      setDeletingNote(null);
    } catch (err: unknown) {
      alert(err instanceof TradeClientApiError ? err.message : "Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Execution Notes &amp; Observations
          </h2>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {notes.length}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center justify-between gap-2"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadNotes}
            className="inline-flex items-center gap-1 rounded bg-rose-900/50 hover:bg-rose-900 px-2 py-1 text-[11px] font-medium text-rose-200"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Add note input form */}
      <form onSubmit={handleAddNote} className="space-y-3">
        {/* Phase selector pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 mr-1">Phase:</span>
          {Object.entries(PHASE_LABELS).map(([p, info]) => (
            <button
              key={p}
              type="button"
              onClick={() => setNewNotePhase(p)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                newNotePhase === p
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {info.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Add an execution observation, entry thesis, management note, or reflection..."
            rows={2}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        {addError && (
          <p className="text-xs text-rose-400">{addError}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isAdding || !newNoteContent.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isAdding ? <RefreshCw size={12} className="animate-spin" /> : <PlusCircle size={14} />}
            <span>{isAdding ? "Saving..." : "Add Note"}</span>
          </button>
        </div>
      </form>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-950/40 border border-slate-800/60" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-6 rounded-xl border border-slate-800/60 bg-slate-950/20">
          <p className="text-xs text-slate-500">
            No specific execution notes logged for this trade yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isEditing = editingNoteId === note.id;

            return (
              <div
                key={note.id}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2 hover:border-slate-700/80 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{formatDate(note.createdAt)}</span>
                    {note.phase && PHASE_LABELS[note.phase] && (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${PHASE_LABELS[note.phase].style}`}
                      >
                        {PHASE_LABELS[note.phase].label}
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(note)}
                        aria-label="Edit note"
                        className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingNote(note)}
                        aria-label="Delete note"
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isSavingEdit}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={isSavingEdit || !editingContent.trim()}
                        className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        {isSavingEdit ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Note Confirmation Dialog */}
      {deletingNote && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-note-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 id="delete-note-title" className="text-sm font-bold text-slate-100">
              Delete Trade Note
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this note?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingNote(null)}
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
                {isDeleting ? "Deleting..." : "Delete Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
