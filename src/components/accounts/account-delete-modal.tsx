"use client";

import React, { useState } from "react";
import { X, Loader2, Trash2, AlertCircle } from "@/components/icons";
import type { TradingAccountDto } from "@/lib/client/accounts";
import { deleteTradingAccountClient, TradingAccountClientApiError } from "@/lib/client/accounts";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !account) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteTradingAccountClient(account.id);
      onSuccess(account.id);
      onClose();
    } catch (err: unknown) {
      if (err instanceof TradingAccountClientApiError) {
        setErrorMessage(
          err.message ||
            "Unable to delete account. If it has associated trades, please deactivate the account instead.",
        );
      } else {
        setErrorMessage(
          "Unable to delete account. If it has associated trades, please deactivate the account instead.",
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Cannot Delete Account</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>
              Are you sure you want to delete <strong className="text-slate-100">{account.name}</strong>?
            </p>
            <p className="text-xs text-slate-400">
              Accounts with recorded trade history cannot be deleted to protect your journal analytics integrity. If you no longer use this account, we recommend deactivating it instead.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
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
        </div>
      </div>
    </div>
  );
}
