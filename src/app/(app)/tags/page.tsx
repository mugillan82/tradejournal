"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  RotateCcw,
  Loader2,
  Search,
} from "@/components/icons";
import {
  fetchTagsClient,
  createTagClient,
  updateTagClient,
  deleteTagClient,
  type TagClientDto,
} from "@/lib/client/trades";

const PRESET_COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

export default function TagsPage() {
  const [tags, setTags] = useState<ReadonlyArray<TagClientDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal / Inline
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#10b981");

  // Edit Modal / Inline
  const [editingTag, setEditingTag] = useState<TagClientDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#10b981");

  // Delete Confirmation
  const [deletingTag, setDeletingTag] = useState<TagClientDto | null>(null);

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchTagsClient();
      setTags(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load tags");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchTagsClient();
        if (isMounted) setTags(data);
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to load tags");
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


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const created = await createTagClient({
        name: newName.trim(),
        color: newColor || null,
      });
      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewColor("#10b981");
      setIsCreating(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setIsMutating(false);
    }
  };

  const handleStartEdit = (tag: TagClientDto) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color || "#10b981");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editName.trim()) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const updated = await updateTagClient(editingTag.id, {
        name: editName.trim(),
        color: editColor || null,
      });
      setTags((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingTag(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update tag");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTag) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      await deleteTagClient(deletingTag.id);
      setTags((prev) => prev.filter((t) => t.id !== deletingTag.id));
      setDeletingTag(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete tag");
    } finally {
      setIsMutating(false);
    }
  };

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag size={22} className="text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Trade Tags
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Create custom categorization tags to filter, slice, and cross-reference your trades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setEditingTag(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/40"
          >
            <Plus size={16} />
            <span>New Tag</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Controls / Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags by name..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{filteredTags.length} {filteredTags.length === 1 ? "Tag" : "Tags"}</span>
          <button
            type="button"
            onClick={loadTags}
            disabled={isLoading || isMutating}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Refresh"
          >
            <RotateCcw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <Loader2 size={24} className="animate-spin text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading tags...</p>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center space-y-3">
          <Tag size={32} className="text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">
            {searchQuery ? "No tags match your search" : "No tags defined yet"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search terms or clearing the filter."
              : "Create custom tags to label instruments, market conditions, sessions, or strategies."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              <Plus size={14} />
              <span>Create Tag</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color || "#10b981" }}
                  />
                  <h3 className="text-sm font-bold text-slate-100 truncate">{tag.name}</h3>
                </div>
                {tag.tradeCount !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/80 flex-shrink-0">
                    {tag.tradeCount} {tag.tradeCount === 1 ? "trade" : "trades"}
                  </span>
                )}
              </div>

              <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>{tag.createdAt.toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(tag)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                    title="Edit Tag"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingTag(tag)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                    title="Delete Tag"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TAG MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Tag size={18} className="text-emerald-400" />
                Create Tag
              </h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tag Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. TrendFollow, Earnings, VWAP..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Color Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-700 bg-slate-950 cursor-pointer p-0.5"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-5 h-5 rounded-full border ${
                          newColor === c ? "border-white scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  disabled={isMutating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMutating || !newName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {isMutating && <Loader2 size={12} className="animate-spin" />}
                  <span>Save Tag</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TAG MODAL */}
      {editingTag && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Pencil size={18} className="text-emerald-400" />
                Edit Tag
              </h2>
              <button
                type="button"
                onClick={() => setEditingTag(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tag Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Color Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-700 bg-slate-950 cursor-pointer p-0.5"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full border ${
                          editColor === c ? "border-white scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTag(null)}
                  disabled={isMutating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMutating || !editName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {isMutating && <Loader2 size={12} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTag && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Trash2 size={18} />
              Delete Tag
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete tag{" "}
              <strong className="text-white">&quot;{deletingTag.name}&quot;</strong>?
              This will safely remove it from all associated trades.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTag(null)}
                disabled={isMutating}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isMutating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
              >
                {isMutating && <Loader2 size={12} className="animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
