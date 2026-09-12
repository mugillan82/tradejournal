"use client";

import React, { useState } from "react";
import { X, Loader2, Power, AlertCircle } from "@/components/icons";
import type { TradingAccountDto } from "@/lib/client/accounts";
import { updateTradingAccountClient } from "@/lib/client/accounts";

interface AccountStatusModalProps {
  account: TradingAccountDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: TradingAccountDto) => void;
}

export function AccountStatusModal({
  account,
  isOpen,
  onClose,
  onSuccess,
}: AccountStatusModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !account) return null;

  const willActivate = !account.isActive;

  const handleToggle = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await updateTradingAccountClient(account.id, {
        isActive: willActivate,
      });
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : `Failed to ${willActivate ? "activate" : "deactivate"} account.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="toggle-status-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                willActivate
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              <Power size={18} />
            </div>
            <h2 id="toggle-status-title" className="text-lg font-bold text-slate-100">
              {willActivate ? "Activate" : "Deactivate"} Account
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

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p>
            Are you sure you want to {willActivate ? "activate" : "deactivate"}{" "}
            <strong className="text-slate-100">{account.name}</strong>?
          </p>
          <p className="text-xs text-slate-400">
            {willActivate
              ? "Activating this account makes it available for logging new trades and active portfolio tracking."
              : "Deactivating an account archives it and hides it from new trade dropdowns. All historical trades and analytics will remain fully intact."}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isSubmitting}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 ${
              willActivate
                ? "text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500"
                : "text-slate-900 bg-amber-400 hover:bg-amber-300 active:bg-amber-500"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Power size={16} />
                <span>{willActivate ? "Activate Account" : "Deactivate Account"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
