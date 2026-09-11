"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  X,
  RotateCcw,
  Loader2,
  Search,
} from "@/components/icons";

import {
  fetchStrategiesClient,
  createStrategyClient,
  updateStrategyClient,
  deleteStrategyClient,
  type StrategyClientDto,
} from "@/lib/client/trades";

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<ReadonlyArray<StrategyClientDto>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal / Inline
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Edit Modal / Inline
  const [editingStrategy, setEditingStrategy] = useState<StrategyClientDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Delete Confirmation
  const [deletingStrategy, setDeletingStrategy] = useState<StrategyClientDto | null>(null);

  const loadStrategies = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchStrategiesClient();
      setStrategies(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load strategies");
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
        const data = await fetchStrategiesClient();
        if (isMounted) setStrategies(data);
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : "Failed to load strategies");
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
      const created = await createStrategyClient({
        name: newName.trim(),
        description: newDescription.trim() || null,
      });
      setStrategies((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewDescription("");
      setIsCreating(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create strategy");
    } finally {
      setIsMutating(false);
    }
  };

  const handleStartEdit = (strat: StrategyClientDto) => {
    setEditingStrategy(strat);
    setEditName(strat.name);
    setEditDescription(strat.description || "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStrategy || !editName.trim()) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const updated = await updateStrategyClient(editingStrategy.id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setStrategies((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingStrategy(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update strategy");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStrategy) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      await deleteStrategyClient(deletingStrategy.id);
      setStrategies((prev) => prev.filter((s) => s.id !== deletingStrategy.id));
      setDeletingStrategy(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete strategy");
    } finally {
      setIsMutating(false);
    }
  };

  const filteredStrategies = strategies.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Target size={22} className="text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Trading Strategies
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Define, organize, and inspect edge playbooks and strategies applied across your trades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setEditingStrategy(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/40"
          >
            <Plus size={16} />
            <span>New Strategy</span>
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
            placeholder="Search strategies by name or description..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{filteredStrategies.length} {filteredStrategies.length === 1 ? "Strategy" : "Strategies"}</span>
          <button
            type="button"
            onClick={loadStrategies}
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
          <p className="text-sm text-slate-400">Loading trading strategies...</p>
        </div>
      ) : filteredStrategies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center space-y-3">
          <Target size={32} className="text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">
            {searchQuery ? "No strategies match your search" : "No strategies defined yet"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search terms or clearing the filter."
              : "Create your first trading strategy framework to classify and evaluate trades."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              <Plus size={14} />
              <span>Create Strategy</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStrategies.map((strategy) => (
            <div
              key={strategy.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-100">{strategy.name}</h3>
                  </div>
                  {strategy.tradeCount !== undefined && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {strategy.tradeCount} {strategy.tradeCount === 1 ? "trade" : "trades"}
                    </span>
                  )}
                </div>
                {strategy.description ? (
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {strategy.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic">No description provided</p>
                )}
              </div>

              <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Updated {strategy.updatedAt.toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(strategy)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                    title="Edit Strategy"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingStrategy(strategy)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                    title="Delete Strategy"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE STRATEGY MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Target size={18} className="text-emerald-400" />
                Create New Strategy
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
                  Strategy Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Breakout Momentum, Mean Reversion..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description / Playbook Rules
                </label>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Outline entry criteria, indicators, timeframe, and risk guidelines..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {isMutating && <Loader2 size={12} className="animate-spin" />}
                  <span>Save Strategy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STRATEGY MODAL */}
      {editingStrategy && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Pencil size={18} className="text-emerald-400" />
                Edit Strategy
              </h2>
              <button
                type="button"
                onClick={() => setEditingStrategy(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Strategy Name *
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
                  Description / Playbook Rules
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStrategy(null)}
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
      {deletingStrategy && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Trash2 size={18} />
              Delete Strategy
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete strategy{" "}
              <strong className="text-white">&quot;{deletingStrategy.name}&quot;</strong>?
              Associated trades will have their strategy unassigned safely.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStrategy(null)}
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
