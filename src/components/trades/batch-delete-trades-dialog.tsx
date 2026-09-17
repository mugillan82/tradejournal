/**
 * Batch Delete Trades Confirmation Dialog
 *
 * Accessible confirmation dialog for deleting multiple selected trades concurrently.
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { AlertCircle, Trash2, RefreshCw } from "@/components/icons";
import { deleteTradeClient } from "@/lib/client/trades";

interface BatchDeleteTradesDialogProps {
  selectedIds: ReadonlyArray<string>;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedIds: string[]) => void;
}

export function BatchDeleteTradesDialog({
  selectedIds,
  isOpen,
  onClose,
  onSuccess,
}: BatchDeleteTradesDialogProps) {
  if (!isOpen || selectedIds.length === 0) return null;

  return (
    <BatchDeleteTradesContent
      selectedIds={selectedIds}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function BatchDeleteTradesContent({
  selectedIds,
  onClose,
  onSuccess,
}: {
  selectedIds: ReadonlyArray<string>;
  onClose: () => void;
  onSuccess: (deletedIds: string[]) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, onClose]);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    setError(null);

    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    for (const id of selectedIds) {
      try {
        await deleteTradeClient(id);
        successfulIds.push(id);
      } catch {
        failedIds.push(id);
      }
    }

    setIsDeleting(false);

    if (successfulIds.length > 0) {
      onSuccess(successfulIds);
    }

    if (failedIds.length > 0) {
      setError(`Failed to delete ${failedIds.length} trade(s). Please try again.`);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="batch-delete-dialog-title"
        aria-describedby="batch-delete-dialog-desc"
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Trash2 size={20} />
          </div>
          <div className="flex-1">
            <h2 id="batch-delete-dialog-title" className="text-lg font-bold text-slate-100">
              Delete {selectedIds.length} Selected Trades
            </h2>
            <p id="batch-delete-dialog-desc" className="text-xs text-slate-400 mt-1 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-rose-300">
                {selectedIds.length} selected {selectedIds.length === 1 ? "trade" : "trades"}
              </span>
              ? This action cannot be undone and will permanently remove all associated execution and P&amp;L records.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 flex items-start gap-2.5 text-xs text-rose-200"
          >
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-50"
            data-testid="confirm-batch-delete-btn"
          >
            {isDeleting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Deleting {selectedIds.length} trades...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete {selectedIds.length} {selectedIds.length === 1 ? "Trade" : "Trades"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
