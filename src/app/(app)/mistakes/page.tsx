"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  X,
  RotateCcw,
  Loader2,
  Search,
} from "@/components/icons";
import {
  fetchMistakesClient,
  createMistakeClient,
  updateMistakeClient,
  deleteMistakeClient,
  type MistakeClientDto,
} from "@/lib/client/trades";

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<ReadonlyArray<MistakeClientDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal / Inline
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit Modal / Inline
  const [editingMistake, setEditingMistake] = useState<MistakeClientDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Delete Confirmation
  const [deletingMistake, setDeletingMistake] = useState<MistakeClientDto | null>(null);

  const loadMistakes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchMistakesClient();
      setMistakes(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load mistakes");
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
        const data = await fetchMistakesClient();
        if (isMounted) setMistakes(data);
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to load mistakes");
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
      const created = await createMistakeClient({
        name: newName.trim(),
        description: newDescription.trim() || null,
      });
      setMistakes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewDescription("");
      setIsCreating(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create mistake");
    } finally {
      setIsMutating(false);
    }
  };

  const handleStartEdit = (m: MistakeClientDto) => {
    setEditingMistake(m);
    setEditName(m.name);
    setEditDescription(m.description || "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMistake || !editName.trim()) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const updated = await updateMistakeClient(editingMistake.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setMistakes((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)).sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingMistake(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update mistake");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMistake) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      await deleteMistakeClient(deletingMistake.id);
      setMistakes((prev) => prev.filter((m) => m.id !== deletingMistake.id));
      setDeletingMistake(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete mistake");
    } finally {
      setIsMutating(false);
    }
  };

  const filteredMistakes = mistakes.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={22} className="text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Trading Mistakes &amp; Behavioral Rules
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Track execution errors, psychological traps, and discipline breakdowns to build systematic consistency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setEditingMistake(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors shadow-lg shadow-amber-950/40"
          >
            <Plus size={16} />
            <span>New Mistake</span>
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
            placeholder="Search mistakes by name or notes..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{filteredMistakes.length} {filteredMistakes.length === 1 ? "Item" : "Items"}</span>
          <button
            type="button"
            onClick={loadMistakes}
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
          <Loader2 size={24} className="animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading trading mistakes...</p>
        </div>
      ) : filteredMistakes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center space-y-3">
          <AlertTriangle size={32} className="text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">
            {searchQuery ? "No mistakes match your search" : "No mistakes recorded yet"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search terms or clearing the filter."
              : "Catalog common trading errors (e.g. FOMO, Revenge Trading, Chasing) to identify leaks."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
            >
              <Plus size={14} />
              <span>Create Mistake Item</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMistakes.map((mistake) => (
            <div
              key={mistake.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <h3 className="text-sm font-bold text-slate-100">{mistake.name}</h3>
                  </div>
                  {mistake.tradeCount !== undefined && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-rose-300 border border-slate-700">
                      {mistake.tradeCount} {mistake.tradeCount === 1 ? "occurrence" : "occurrences"}
                    </span>
                  )}
                </div>
                {mistake.description ? (
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {mistake.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic">No description provided</p>
                )}
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Created {mistake.createdAt.toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(mistake)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                    title="Edit Mistake"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingMistake(mistake)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                    title="Delete Mistake"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MISTAKE MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-400" />
                Add Behavioral Mistake / Rule
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
                  Mistake / Pattern Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. FOMO Entry, Chased Breakdown, Moved Stop Loss..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Rule &amp; Corrective Action
                </label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explain why this happens and what rule to follow next time..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
                >
                  {isMutating && <Loader2 size={12} className="animate-spin" />}
                  <span>Save Mistake</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MISTAKE MODAL */}
      {editingMistake && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Pencil size={18} className="text-amber-400" />
                Edit Mistake
              </h2>
              <button
                type="button"
                onClick={() => setEditingMistake(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Mistake / Pattern Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Rule &amp; Corrective Action
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMistake(null)}
                  disabled={isMutating}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMutating || !editName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
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
      {deletingMistake && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Trash2 size={18} />
              Delete Mistake
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete mistake{" "}
              <strong className="text-white">&quot;{deletingMistake.name}&quot;</strong>?
              This will safely unlink it from all trade logs.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMistake(null)}
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
