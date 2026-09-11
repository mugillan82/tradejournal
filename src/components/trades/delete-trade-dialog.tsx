/**
 * Delete Trade Confirmation Dialog
 *
 * Accessible confirmation modal before executing a destructive trade deletion.
 * Accessible with role="alertdialog", aria-modal="true", and Escape key listener.
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Trash2, RefreshCw } from "@/components/icons";
import { deleteTradeClient, TradeClientApiError } from "@/lib/client/trades";
import type { TradeDto } from "@/lib/trading/trade/types";

interface DeleteTradeDialogProps {
  trade: TradeDto;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteTradeDialog({ trade, isOpen, onClose }: DeleteTradeDialogProps) {
  if (!isOpen) return null;

  return <DeleteTradeDialogContent trade={trade} onClose={onClose} />;
}

function DeleteTradeDialogContent({
  trade,
  onClose,
}: {
  trade: TradeDto;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus cancel button on open
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, onClose]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await deleteTradeClient(trade.id);
      onClose();
      router.push("/trades");
    } catch (err: unknown) {
      setIsDeleting(false);
      setError(
        err instanceof TradeClientApiError
          ? err.message
          : "An unexpected error occurred while deleting the trade.",
      );
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
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Trash2 size={20} />
          </div>
          <div className="flex-1">
            <h2 id="delete-dialog-title" className="text-lg font-bold text-slate-100">
              Delete Trade Record
            </h2>
            <p id="delete-dialog-desc" className="text-xs text-slate-400 mt-1 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-slate-200">
                {trade.title || `Trade #${trade.id.slice(0, 8)}`}
              </span>
              ? This action cannot be undone and will remove all associated execution and P&amp;L records.
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
            className="rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50 shadow-lg shadow-rose-900/20"
          >
            {isDeleting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>Delete Trade</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
