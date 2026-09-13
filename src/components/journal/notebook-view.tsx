/**
 * Notebook View Component
 *
 * Production-grade general trading notebook for research, playbooks, market thoughts,
 * and mental models. Distinct from Daily Journal entries.
 *
 * Features:
 * - Search by title & content
 * - Filter by Strategy, Setup, Tags, and Archived status
 * - Create & edit note with title, rich content, strategy/setup reference, tags
 * - File attachments upload & download
 * - Archive / Unarchive toggle
 * - Delete with confirmation
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
  Search,
} from "@/components/icons";
import {
  fetchNotebookNotes,
  createNotebookNoteApi,
  updateNotebookNoteApi,
  deleteNotebookNoteApi,
  uploadNotebookAttachmentApi,
  JournalClientApiError,
} from "@/lib/client/journal";
import { fetchFilterOptions, type FilterOptionItem } from "@/lib/client/analytics";
import type { NotebookNoteDto } from "@/lib/trading/journal/types";

function formatDateDisplay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function NotebookView() {
  const [notes, setNotes] = useState<ReadonlyArray<NotebookNoteDto>>([]);
  const [selectedNote, setSelectedNote] = useState<NotebookNoteDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [setupFilter, setSetupFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Classification Options
  const [strategies, setStrategies] = useState<FilterOptionItem[]>([]);
  const [setups, setSetups] = useState<FilterOptionItem[]>([]);
  const [availableTags, setAvailableTags] = useState<FilterOptionItem[]>([]);

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formStrategyId, setFormStrategyId] = useState("");
  const [formSetupId, setFormSetupId] = useState("");
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Attachment upload state
  const [uploadingFile, setUploadingFile] = useState(false);

  // Delete modal state
  const [deletingNote, setDeletingNote] = useState<NotebookNoteDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load classification filter options
  useEffect(() => {
    const controller = new AbortController();
    fetchFilterOptions(controller.signal)
      .then((opts) => {
        setStrategies(opts.strategies || []);
        setSetups(opts.setups || []);
        setAvailableTags(opts.tags || []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchNotebookNotes(
        {
          search: searchQuery.trim() || undefined,
          strategyId: strategyFilter || undefined,
          setupId: setupFilter || undefined,
          tagId: tagFilter || undefined,
          isArchived: showArchived,
        },
        1,
        100,
      );
      setNotes(data.items);
      if (data.items.length > 0 && !selectedNote) {
        setSelectedNote(data.items[0]);
      } else if (data.items.length === 0) {
        setSelectedNote(null);
      }
    } catch (err: unknown) {
      setError(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to load notebook notes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, strategyFilter, setupFilter, tagFilter, showArchived, selectedNote]);

  useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (isMounted) {
        void loadNotes();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [loadNotes]);

  const openCreateNote = () => {
    setFormTitle("");
    setFormContent("");
    setFormStrategyId("");
    setFormSetupId("");
    setFormTagIds([]);
    setIsEditing(true);
    setFormError(null);
  };

  const openEditNote = (note: NotebookNoteDto) => {
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormStrategyId(note.strategyId || "");
    setFormSetupId(note.setupId || "");
    setFormTagIds(note.tags.map((t) => t.id));
    setIsEditing(true);
    setFormError(null);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Note title is required");
      return;
    }
    if (!formContent.trim()) {
      setFormError("Note content is required");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (selectedNote && isEditing && selectedNote.id) {
        const updated = await updateNotebookNoteApi(selectedNote.id, {
          title: formTitle.trim(),
          content: formContent.trim(),
          strategyId: formStrategyId || null,
          setupId: formSetupId || null,
          tagIds: formTagIds,
        });
        setSelectedNote(updated);
        setIsEditing(false);
      } else {
        const created = await createNotebookNoteApi({
          title: formTitle.trim(),
          content: formContent.trim(),
          strategyId: formStrategyId || null,
          setupId: formSetupId || null,
          tagIds: formTagIds,
        });
        setSelectedNote(created);
        setIsEditing(false);
      }
      await loadNotes();
    } catch (err: unknown) {
      setFormError(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to save note.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleArchive = async (note: NotebookNoteDto) => {
    try {
      const updated = await updateNotebookNoteApi(note.id, {
        isArchived: !note.isArchived,
      });
      setSelectedNote(updated);
      await loadNotes();
    } catch (err: unknown) {
      alert(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to update archive status.",
      );
    }
  };

  const handleDeleteNote = async () => {
    if (!deletingNote) return;
    setIsDeleting(true);
    try {
      await deleteNotebookNoteApi(deletingNote.id);
      setDeletingNote(null);
      if (selectedNote?.id === deletingNote.id) {
        setSelectedNote(null);
        setIsEditing(false);
      }
      await loadNotes();
    } catch (err: unknown) {
      alert(
        err instanceof JournalClientApiError
          ? err.message
          : "Failed to delete note.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNote) return;

    setUploadingFile(true);
    try {
      await uploadNotebookAttachmentApi(selectedNote.id, file);
      // Reload current note
      await loadNotes();
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Trading Notebook</h1>
            <p className="text-sm text-slate-400">
              Personal research workspace, playbooks, setups, and trading ideas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateNote}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <PlusCircle size={15} />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Notes List (4 cols) & Editor/Viewer (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Filter & Notes List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search notes & content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={strategyFilter}
                onChange={(e) => setStrategyFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
              >
                <option value="">All Strategies</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={setupFilter}
                onChange={(e) => setSetupFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
              >
                <option value="">All Setups</option>
                {setups.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags & Archived Toggle */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[150px] truncate"
              >
                <option value="">All Tags</option>
                {availableTags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Archived</span>
              </label>
            </div>

            {/* Notes List */}
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="animate-spin" size={14} />
                <span>Loading notes...</span>
              </div>
            ) : error ? (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            ) : notes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No notebook notes found.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {notes.map((n) => {
                  const isCurrent = selectedNote?.id === n.id;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setSelectedNote(n);
                        setIsEditing(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-indigo-600/10 border-indigo-500/40 ring-1 ring-indigo-500/30"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDateDisplay(n.updatedAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                        {n.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {n.strategyName && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {n.strategyName}
                          </span>
                        )}
                        {n.setupName && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                            {n.setupName}
                          </span>
                        )}
                        {n.tags.map((t) => (
                          <span
                            key={t.id}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400"
                          >
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Note Viewer / Editor (8 cols) */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl relative min-h-[500px]">
            {isEditing ? (
              /* Editor Form */
              <form onSubmit={handleSaveNote} className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-bold text-white">
                    {selectedNote ? "Edit Note" : "Create New Note"}
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

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Volume Profile High Volume Node Liquidity Playbook"
                    maxLength={255}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Associated Strategy (Optional)
                    </label>
                    <select
                      value={formStrategyId}
                      onChange={(e) => setFormStrategyId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">None</option>
                      {strategies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Associated Setup (Optional)
                    </label>
                    <select
                      value={formSetupId}
                      onChange={(e) => setFormSetupId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">None</option>
                      {setups.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Note Content *
                  </label>
                  <textarea
                    rows={12}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Write detailed observations, entry rules, execution guidelines, mental frameworks..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
                  />
                </div>

                {availableTags.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableTags.map((tag) => {
                        const isSelected = formTagIds.includes(tag.id);
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
                    <span>{isSaving ? "Saving..." : "Save Note"}</span>
                  </button>
                </div>
              </form>
            ) : selectedNote ? (
              /* Viewer Mode */
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedNote.title}</h2>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>Updated: {formatDateDisplay(selectedNote.updatedAt)}</span>
                      {selectedNote.isArchived && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditNote(selectedNote)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(selectedNote)}
                      className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      <span>{selectedNote.isArchived ? "Unarchive" : "Archive"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingNote(selectedNote)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Classifications */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedNote.strategyName && (
                    <div className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      Strategy: <strong>{selectedNote.strategyName}</strong>
                    </div>
                  )}
                  {selectedNote.setupName && (
                    <div className="text-xs px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      Setup: <strong>{selectedNote.setupName}</strong>
                    </div>
                  )}
                  {selectedNote.tags.map((t) => (
                    <span
                      key={t.id}
                      className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      #{t.name}
                    </span>
                  ))}
                </div>

                {/* Content Body */}
                <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedNote.content}
                </div>

                {/* Attachments */}
                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Attachments ({selectedNote.attachments?.length || 0})
                    </span>

                    <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300">
                      <span>{uploadingFile ? "Uploading..." : "+ Add Attachment"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,application/pdf"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {selectedNote.attachments && selectedNote.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedNote.attachments.map((att) => (
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
                    <p className="text-xs text-slate-500 italic">No files attached to this note.</p>
                  )}
                </div>
              </div>
            ) : (
              /* No Note Selected Empty State */
              <div className="py-24 text-center space-y-3">
                <BookOpen size={36} className="mx-auto text-slate-600" />
                <h3 className="text-base font-semibold text-slate-300">Select a note or create a new one</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Organize your market playbooks, setup criteria, and trading insights in one place.
                </p>
                <button
                  type="button"
                  onClick={openCreateNote}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  <PlusCircle size={14} />
                  <span>Create Note</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Delete Notebook Note?</span>
              <button
                type="button"
                onClick={() => setDeletingNote(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-200">&ldquo;{deletingNote.title}&rdquo;</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingNote(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteNote}
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
