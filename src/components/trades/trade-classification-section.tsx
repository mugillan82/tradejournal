"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Target,
  AlertTriangle,
  Plus,
  X,
  Check,
  RotateCcw,
  Loader2,
  FolderPlus,
} from "@/components/icons";
import {
  fetchTradeClassificationsClient,
  fetchTagsClient,
  fetchStrategiesClient,
  fetchSetupsClient,
  fetchMistakesClient,
  setTradeTagsClient,
  setTradeMistakesClient,
  assignTradeStrategyClient,
  assignTradeSetupClient,
  createTagClient,
  createStrategyClient,
  createSetupClient,
  createMistakeClient,
  type TagClientDto,
  type StrategyClientDto,
  type SetupClientDto,
  type MistakeClientDto,
  type TradeClassificationSummaryClientDto,
} from "@/lib/client/trades";

interface TradeClassificationSectionProps {
  readonly tradeId: string;
  readonly onClassificationUpdated?: () => void;
}

export function TradeClassificationSection({
  tradeId,
  onClassificationUpdated,
}: TradeClassificationSectionProps) {
  const [summary, setSummary] = useState<TradeClassificationSummaryClientDto | null>(null);
  const [availableTags, setAvailableTags] = useState<ReadonlyArray<TagClientDto>>([]);
  const [availableStrategies, setAvailableStrategies] = useState<ReadonlyArray<StrategyClientDto>>([]);
  const [availableSetups, setAvailableSetups] = useState<ReadonlyArray<SetupClientDto>>([]);
  const [availableMistakes, setAvailableMistakes] = useState<ReadonlyArray<MistakeClientDto>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick inline creation toggles & inputs
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState("");

  const [isCreatingSetup, setIsCreatingSetup] = useState(false);
  const [newSetupName, setNewSetupName] = useState("");

  const [isCreatingMistake, setIsCreatingMistake] = useState(false);
  const [newMistakeName, setNewMistakeName] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [sum, tags, strats, sets, mists] = await Promise.all([
        fetchTradeClassificationsClient(tradeId),
        fetchTagsClient(),
        fetchStrategiesClient(),
        fetchSetupsClient(),
        fetchMistakesClient(),
      ]);
      setSummary(sum);
      setAvailableTags(tags);
      setAvailableStrategies(strats);
      setAvailableSetups(sets);
      setAvailableMistakes(mists);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load classifications";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [sum, tags, strats, sets, mists] = await Promise.all([
          fetchTradeClassificationsClient(tradeId),
          fetchTagsClient(),
          fetchStrategiesClient(),
          fetchSetupsClient(),
          fetchMistakesClient(),
        ]);
        if (isMounted) {
          setSummary(sum);
          setAvailableTags(tags);
          setAvailableStrategies(strats);
          setAvailableSetups(sets);
          setAvailableMistakes(mists);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load classifications";
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [tradeId]);


  // Handlers for Strategy
  const handleStrategyChange = async (strategyId: string | null) => {
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const updated = await assignTradeStrategyClient(tradeId, strategyId);
      setSummary((prev) => (prev ? { ...prev, strategy: updated } : prev));
      if (onClassificationUpdated) onClassificationUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update strategy");
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateAndAssignStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStrategyName.trim()) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const strat = await createStrategyClient({ name: newStrategyName.trim() });
      setAvailableStrategies((prev) => [...prev, strat].sort((a, b) => a.name.localeCompare(b.name)));
      await assignTradeStrategyClient(tradeId, strat.id);
      setSummary((prev) => (prev ? { ...prev, strategy: strat } : prev));
      setNewStrategyName("");
      setIsCreatingStrategy(false);
      if (onClassificationUpdated) onClassificationUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create strategy");
    } finally {
      setIsMutating(false);
    }
  };

  // Handlers for Setup
  const handleSetupChange = async (setupId: string | null) => {
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const updated = await assignTradeSetupClient(tradeId, setupId);
      setSummary((prev) => (prev ? { ...prev, setup: updated } : prev));
      if (onClassificationUpdated) onClassificationUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update setup");
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateAndAssignSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetupName.trim()) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const setup = await createSetupClient({ name: newSetupName.trim() });
      setAvailableSetups((prev) => [...prev, setup].sort((a, b) => a.name.localeCompare(b.name)));
      await assignTradeSetupClient(tradeId, setup.id);
      setSummary((prev) => (prev ? { ...prev, setup: setup } : prev));
      setNewSetupName("");
      setIsCreatingSetup(false);
      if (onClassificationUpdated) onClassificationUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create setup");
    } finally {
      setIsMutating(false);
    }
  };

  // Handlers for Tags
  const handleToggleTag = async (tagId: string) => {
    if (!summary) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const currentIds = summary.tags.map((t) => t.id);
      const newIds = currentIds.includes(tagId)
        ? currentIds.filter((id) => id !== tagId)
        : [...currentIds, tagId];
      const updatedTags = await setTradeTagsClient(tradeId, newIds);
      setSummary((prev) => (prev ? { ...prev, tags: updatedTags } : prev));
      if (onClassificationUpdated) onClassificationUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update tags");
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const tag = await createTagClient({
        name: newTagName.trim(),
        color: newTagColor || null,
      });
      setAvailableTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      // Auto-assign to current trade
      const currentIds = summary ? summary.tags.map((t) => t.id) : [];
      const updatedTags = await setTradeTagsClient(tradeId, [...currentIds, tag.id]);
      setSummary((prev) => (prev ? { ...prev, tags: updatedTags } : prev));
      setNewTagName("");
      setIsCreatingTag(false);
      if (onClassificationUpdated) onClassificationUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setIsMutating(false);
    }
  };

  // Handlers for Mistakes
  const handleToggleMistake = async (mistakeId: string) => {
    if (!summary) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const currentIds = summary.mistakes.map((m) => m.id);
      const newIds = currentIds.includes(mistakeId)
        ? currentIds.filter((id) => id !== mistakeId)
        : [...currentIds, mistakeId];
      const updatedMistakes = await setTradeMistakesClient(tradeId, newIds);
      setSummary((prev) => (prev ? { ...prev, mistakes: updatedMistakes } : prev));
      if (onClassificationUpdated) onClassificationUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update mistakes");
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateMistake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMistakeName.trim()) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      const mistake = await createMistakeClient({ name: newMistakeName.trim() });
      setAvailableMistakes((prev) => [...prev, mistake].sort((a, b) => a.name.localeCompare(b.name)));
      // Auto-assign to current trade
      const currentIds = summary ? summary.mistakes.map((m) => m.id) : [];
      const updatedMistakes = await setTradeMistakesClient(tradeId, [...currentIds, mistake.id]);
      setSummary((prev) => (prev ? { ...prev, mistakes: updatedMistakes } : prev));
      setNewMistakeName("");
      setIsCreatingMistake(false);
      if (onClassificationUpdated) onClassificationUpdated();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create mistake");
    } finally {
      setIsMutating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <Loader2 size={18} className="animate-spin text-emerald-400" />
          <span>Loading trade classifications...</span>
        </div>
      </div>
    );
  }

  const assignedTagIds = new Set(summary?.tags.map((t) => t.id) ?? []);
  const assignedMistakeIds = new Set(summary?.mistakes.map((m) => m.id) ?? []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Framework &amp; Classifications
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isMutating && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Loader2 size={12} className="animate-spin" />
              Saving...
            </span>
          )}
          <button
            type="button"
            onClick={loadData}
            disabled={isMutating}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors"
            title="Refresh Classifications"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Grid: 2 cols on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ================= STRATEGY ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="trade-strategy-select"
              className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
            >
              <Target size={14} className="text-blue-400" />
              Strategy
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingStrategy(!isCreatingStrategy)}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus size={12} />
              {isCreatingStrategy ? "Cancel" : "New Strategy"}
            </button>
          </div>

          {isCreatingStrategy ? (
            <form onSubmit={handleCreateAndAssignStrategy} className="flex gap-2">
              <input
                type="text"
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                placeholder="Enter strategy name..."
                disabled={isMutating}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isMutating || !newStrategyName.trim()}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                Add &amp; Set
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <select
                id="trade-strategy-select"
                value={summary?.strategy?.id || ""}
                onChange={(e) => handleStrategyChange(e.target.value || null)}
                disabled={isMutating}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">-- No Strategy Assigned --</option>
                {availableStrategies.map((strat) => (
                  <option key={strat.id} value={strat.id}>
                    {strat.name}
                  </option>
                ))}
              </select>
              {summary?.strategy && (
                <button
                  type="button"
                  onClick={() => handleStrategyChange(null)}
                  disabled={isMutating}
                  className="text-xs text-slate-500 hover:text-rose-400 p-1.5 border border-slate-800 rounded-lg hover:border-slate-700"
                  title="Clear Strategy"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {summary?.strategy && (
            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-slate-300">Active Strategy:</span>{" "}
              {summary.strategy.name}
              {summary.strategy.description && (
                <p className="mt-1 text-slate-500 line-clamp-2">
                  {summary.strategy.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ================= SETUP ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="trade-setup-select"
              className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
            >
              <FolderPlus size={14} className="text-purple-400" />
              Setup
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingSetup(!isCreatingSetup)}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus size={12} />
              {isCreatingSetup ? "Cancel" : "New Setup"}
            </button>
          </div>

          {isCreatingSetup ? (
            <form onSubmit={handleCreateAndAssignSetup} className="flex gap-2">
              <input
                type="text"
                value={newSetupName}
                onChange={(e) => setNewSetupName(e.target.value)}
                placeholder="Enter setup name..."
                disabled={isMutating}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isMutating || !newSetupName.trim()}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                Add &amp; Set
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <select
                id="trade-setup-select"
                value={summary?.setup?.id || ""}
                onChange={(e) => handleSetupChange(e.target.value || null)}
                disabled={isMutating}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">-- No Setup Assigned --</option>
                {availableSetups.map((setup) => (
                  <option key={setup.id} value={setup.id}>
                    {setup.name}
                  </option>
                ))}
              </select>
              {summary?.setup && (
                <button
                  type="button"
                  onClick={() => handleSetupChange(null)}
                  disabled={isMutating}
                  className="text-xs text-slate-500 hover:text-rose-400 p-1.5 border border-slate-800 rounded-lg hover:border-slate-700"
                  title="Clear Setup"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {summary?.setup && (
            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-slate-300">Active Setup:</span>{" "}
              {summary.setup.name}
              {summary.setup.description && (
                <p className="mt-1 text-slate-500 line-clamp-2">
                  {summary.setup.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= TAGS SECTION ================= */}
      <div className="border-t border-slate-800/80 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Tag size={14} className="text-emerald-400" />
            <span>Tags ({summary?.tags.length || 0})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreatingTag(!isCreatingTag)}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Plus size={12} />
            {isCreatingTag ? "Cancel" : "Create Tag"}
          </button>
        </div>

        {isCreatingTag && (
          <form onSubmit={handleCreateTag} className="flex gap-2 items-center bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name (e.g. TrendFollow, Earnings)..."
              disabled={isMutating}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              title="Tag Color"
              className="w-7 h-7 rounded border border-slate-700 bg-slate-900 cursor-pointer p-0.5"
            />
            <button
              type="submit"
              disabled={isMutating || !newTagName.trim()}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </form>
        )}

        {/* Tag pills selector */}
        <div className="flex flex-wrap gap-2 pt-1">
          {availableTags.length === 0 && !isCreatingTag && (
            <p className="text-xs text-slate-500 italic">
              No tags created yet. Click &quot;Create Tag&quot; to add classification tags.
            </p>
          )}
          {availableTags.map((t) => {
            const isAssigned = assignedTagIds.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToggleTag(t.id)}
                disabled={isMutating}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${
                  isAssigned
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: t.color || "#10b981" }}
                />
                <span>{t.name}</span>
                {isAssigned ? <Check size={11} className="text-emerald-400" /> : <Plus size={11} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= MISTAKES SECTION ================= */}
      <div className="border-t border-slate-800/80 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <AlertTriangle size={14} className="text-amber-400" />
            <span>Mistakes / Lessons ({summary?.mistakes.length || 0})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreatingMistake(!isCreatingMistake)}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <Plus size={12} />
            {isCreatingMistake ? "Cancel" : "Create Mistake"}
          </button>
        </div>

        {isCreatingMistake && (
          <form onSubmit={handleCreateMistake} className="flex gap-2 items-center bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
            <input
              type="text"
              value={newMistakeName}
              onChange={(e) => setNewMistakeName(e.target.value)}
              placeholder="Mistake label (e.g. FOMO, Moved Stop)..."
              disabled={isMutating}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isMutating || !newMistakeName.trim()}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </form>
        )}

        {/* Mistake pills selector */}
        <div className="flex flex-wrap gap-2 pt-1">
          {availableMistakes.length === 0 && !isCreatingMistake && (
            <p className="text-xs text-slate-500 italic">
              No mistakes tracked yet. Click &quot;Create Mistake&quot; to log behavioral lessons.
            </p>
          )}
          {availableMistakes.map((m) => {
            const isAssigned = assignedMistakeIds.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleToggleMistake(m.id)}
                disabled={isMutating}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border ${
                  isAssigned
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span>{m.name}</span>
                {isAssigned ? <X size={11} className="text-rose-400" /> : <Plus size={11} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
