"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Trash2, AlertCircle, AlertTriangle, ShieldCheck } from "@/components/icons";
import type { TradingAccountDto } from "@/lib/client/accounts";
import {
  deleteTradingAccountClient,
  deactivateTradingAccountClient,
  TradingAccountClientApiError,
} from "@/lib/client/accounts";

interface AccountDeleteModalProps {
  account: TradingAccountDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
}

export function AccountDeleteModal({
  account,
  isOpen,
  onClose,
  onSuccess,
}: AccountDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasTradeBlock, setHasTradeBlock] = useState(false);
  const [confirmCascade, setConfirmCascade] = useState(false);

  // Reset state when modal opens or target account changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setHasTradeBlock(false);
      setConfirmCascade(false);
      setIsDeleting(false);
      setIsDeactivating(false);
    }
  }, [isOpen, account?.id]);

  if (!isOpen || !account) return null;

  const handleDelete = async (cascade = false) => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteTradingAccountClient(account.id, { cascade });
      onSuccess(account.id);
      onClose();
    } catch (err: unknown) {
      if (err instanceof TradingAccountClientApiError) {
        const msg = err.message || "";
        const isTradeRelated =
          msg.toLowerCase().includes("trade") ||
          msg.toLowerCase().includes("associated");

        if (isTradeRelated && !cascade) {
          setHasTradeBlock(true);
        }
        setErrorMessage(msg || "Unable to delete account. Please try again.");
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    setErrorMessage(null);

    try {
      await deactivateTradingAccountClient(account.id);
      onSuccess(account.id);
      onClose();
    } catch (err: unknown) {
      if (err instanceof TradingAccountClientApiError) {
        setErrorMessage(err.message || "Unable to deactivate account. Please try again.");
      } else {
        setErrorMessage("An unexpected error occurred while deactivating account.");
      }
    } finally {
      setIsDeactivating(false);
    }
  };

  const isBusy = isDeleting || isDeactivating;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Trash2 size={18} />
            </div>
            <h2 id="delete-account-title" className="text-lg font-bold text-slate-100">
              Delete Trading Account
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X size={18} />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Cannot Delete Account</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setHasTradeBlock(false);
              }}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded"
              title="Dismiss error"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {!hasTradeBlock ? (
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>
              Are you sure you want to delete <strong className="text-slate-100">{account.name}</strong>?
            </p>
            <p className="text-xs text-slate-400">
              Accounts with recorded trade history cannot be deleted directly to protect your journal analytics integrity. If this account has trades, you can deactivate it instead.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold text-amber-200">Account Has Recorded Trades</p>
                <p className="mt-0.5 text-amber-300/90">
                  Select an action below to resolve this safely:
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Recommended: Deactivate Account
                </div>
                <p className="text-slate-400">
                  Hides the account from active selectors while preserving all your trade entries, calendar logs, and historical analytics.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 space-y-2">
                <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <Trash2 size={14} className="text-rose-400" />
                  Permanent: Force Delete (Cascade Trades)
                </div>
                <p className="text-slate-400">
                  Permanently deletes this account and all associated trades, executions, and notes. This action cannot be undone.
                </p>
                <label className="flex items-center gap-2 pt-1 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmCascade}
                    onChange={(e) => setConfirmCascade(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-900 h-3.5 w-3.5"
                  />
                  <span>I confirm permanent deletion of all trades in this account</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isBusy}
          >
            Cancel
          </button>

          {hasTradeBlock ? (
            <>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isBusy}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-emerald-100 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeactivating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deactivating...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    <span>Deactivate Account</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDelete(true)}
                disabled={isBusy || !confirmCascade}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting All...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete All Trades</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleDelete(false)}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Delete Account</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
