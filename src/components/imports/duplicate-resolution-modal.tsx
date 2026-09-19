"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Sparkles, X, PlusCircle } from "lucide-react";
import type { NormalizedTradeCandidate } from "@/lib/trading/import/types";

interface DuplicateResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: NormalizedTradeCandidate[];
  onConfirmOnlyNew: (newCandidates: NormalizedTradeCandidate[]) => void;
  onConfirmAll: (allCandidates: NormalizedTradeCandidate[]) => void;
  isConfirming?: boolean;
}

export function DuplicateResolutionModal({
  isOpen,
  onClose,
  candidates,
  onConfirmOnlyNew,
  onConfirmAll,
  isConfirming = false,
}: DuplicateResolutionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isConfirming) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isConfirming, onClose]);

  if (!isOpen) return null;

  const isDuplicate = (c: NormalizedTradeCandidate) =>
    c.duplicateMatch && c.duplicateMatch.classification !== "NONE";

  const duplicateCandidates = candidates.filter(isDuplicate);
  const newCandidates = candidates.filter((c) => !isDuplicate(c));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isConfirming) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl rounded-2xl bg-[#0d0a17] border border-purple-500/25 shadow-2xl shadow-purple-950/40 p-6 flex flex-col gap-5 text-slate-200 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="duplicate-modal-title"
                className="text-lg font-bold text-slate-100 tracking-tight"
              >
                Duplicate Trades Detected
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Some trades in this screenshot are already recorded in your journal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Breakdown Stats Badges */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                New Trades
              </div>
              <div className="text-xl font-extrabold text-purple-200 mt-0.5">
                {newCandidates.length}
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Already in Journal
              </div>
              <div className="text-xl font-extrabold text-amber-300 mt-0.5">
                {duplicateCandidates.length}
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Trade Items Preview */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold text-slate-400">
            Trades in this screenshot ({candidates.length} total):
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-white/[0.08] bg-slate-900/60 p-2 space-y-1.5">
            {candidates.map((cand, idx) => {
              const isDup = isDuplicate(cand);
              const pnlNum = Number(cand.grossPnl ?? 0);
              return (
                <div
                  key={cand.candidateId || idx}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                    isDup
                      ? "bg-amber-500/5 border-amber-500/20 text-slate-300"
                      : "bg-purple-500/5 border-purple-500/20 text-slate-100 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-200 uppercase w-16 truncate">
                      {cand.title || "UNKNOWN"}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        cand.side === "LONG"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {cand.side || "LONG"}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {cand.quantity || "0.01"} lot
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-xs font-bold ${
                        pnlNum >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {pnlNum >= 0 ? `+$${pnlNum.toFixed(2)}` : `-$${Math.abs(pnlNum).toFixed(2)}`}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDup
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/35"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/35"
                      }`}
                    >
                      {isDup ? "Duplicate" : "New"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Decision Buttons */}
        <div className="flex flex-col gap-2.5 pt-2">
          {/* Option A: Only New Trades */}
          <button
            type="button"
            disabled={isConfirming || newCandidates.length === 0}
            onClick={() => onConfirmOnlyNew(newCandidates)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_20px_-3px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-200" />
              <span>Add Only New Trades</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-white/20 text-white font-bold">
              {newCandidates.length} trade{newCandidates.length === 1 ? "" : "s"}
            </span>
          </button>

          {/* Option B: Add Already Added Trades Too */}
          <button
            type="button"
            disabled={isConfirming}
            onClick={() => onConfirmAll(candidates)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-white/[0.08] hover:border-amber-500/40 transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-slate-400" />
              <span>Add Already Added Trades Too (Include Duplicates)</span>
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
              All {candidates.length}
            </span>
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            disabled={isConfirming}
            onClick={onClose}
            className="w-full text-center py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Review Trades in Table
          </button>
        </div>
      </div>
    </div>
  );
}
