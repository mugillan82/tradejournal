"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Loader2, Plus, Wallet } from "@/components/icons";
import type { CreateTradingAccountInput, TradingAccountDto } from "@/lib/client/accounts";
import { createTradingAccountClient, TradingAccountClientApiError } from "@/lib/client/accounts";

interface AccountCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: TradingAccountDto) => void;
}

const ACCOUNT_TYPES = [
  { value: "PAPER_TRADING", label: "Paper Trading" },
  { value: "LIVE", label: "Live Trading (Self-Tracked)" },
  { value: "SIMULATION", label: "Simulation / Prop Firm" },
  { value: "DEMO", label: "Demo" },
];

const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "INR", "NZD", "SGD"];

function AccountCreateForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (account: TradingAccountDto) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("PAPER_TRADING");
  const [currency, setCurrency] = useState("USD");
  const [initialBalance, setInitialBalance] = useState("10000.00");
  const [currentBalance, setCurrentBalance] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorSummary(null);
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = "Account name is required";
    }
    if (!currency.trim() || !/^[A-Z]{3}$/.test(currency.toUpperCase())) {
      errors.currency = "Currency must be a 3-letter ISO code (e.g. USD)";
    }
    if (initialBalance && (isNaN(Number(initialBalance)) || Number(initialBalance) < 0)) {
      errors.initialBalance = "Initial balance must be a non-negative number";
    }
    if (currentBalance && (isNaN(Number(currentBalance)) || Number(currentBalance) < 0)) {
      errors.currentBalance = "Current balance must be a non-negative number";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateTradingAccountInput = {
        name: name.trim(),
        type,
        currency: currency.toUpperCase().trim(),
        initialBalance: initialBalance.trim() || null,
        currentBalance: currentBalance.trim() ? currentBalance.trim() : null,
        isActive,
      };

      const newAccount = await createTradingAccountClient(payload);
      onSuccess(newAccount);
      onClose();
    } catch (err: unknown) {
      if (err instanceof TradingAccountClientApiError) {
        setErrorSummary(err.message);
        if (err.fieldErrors && err.fieldErrors.length > 0) {
          const mapped: Record<string, string> = {};
          for (const fe of err.fieldErrors) {
            mapped[fe.path] = fe.message;
          }
          setFieldErrors(mapped);
        }
      } else {
        setErrorSummary("Failed to create trading account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Wallet size={18} />
          </div>
          <h2 id="create-account-title" className="text-lg font-bold text-slate-100">
            Add Trading Account
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

      {errorSummary && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {errorSummary}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Account Name */}
        <div>
          <label htmlFor="create-account-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Account Name <span className="text-rose-400">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="create-account-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apex 50k Prop, Interactive Brokers Live"
            className={`w-full px-3.5 py-2 rounded-lg bg-slate-950 border ${
              fieldErrors.name ? "border-rose-500 focus:ring-rose-500/30" : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20"
            } text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2`}
            disabled={isSubmitting}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-rose-400">{fieldErrors.name}</p>
          )}
        </div>

        {/* Account Type & Currency Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-account-type" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Account Type
            </label>
            <select
              id="create-account-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              disabled={isSubmitting}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="create-account-currency" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Currency (ISO) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="create-account-currency"
                type="text"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                list="currency-suggestions"
                placeholder="USD"
                className={`w-full px-3.5 py-2 font-mono uppercase rounded-lg bg-slate-950 border ${
                  fieldErrors.currency ? "border-rose-500 focus:ring-rose-500/30" : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20"
                } text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2`}
                disabled={isSubmitting}
              />
              <datalist id="currency-suggestions">
                {COMMON_CURRENCIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            {fieldErrors.currency && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.currency}</p>
            )}
          </div>
        </div>

        {/* Initial & Current Balance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-account-initial-balance" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Initial Balance ({currency || "USD"})
            </label>
            <input
              id="create-account-initial-balance"
              type="number"
              step="0.01"
              min="0"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="10000.00"
              className={`w-full px-3.5 py-2 font-mono rounded-lg bg-slate-950 border ${
                fieldErrors.initialBalance ? "border-rose-500 focus:ring-rose-500/30" : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20"
              } text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2`}
              disabled={isSubmitting}
            />
            {fieldErrors.initialBalance && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.initialBalance}</p>
            )}
          </div>

          <div>
            <label htmlFor="create-account-current-balance" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Current Balance <span className="text-slate-500 text-[10px] font-normal">(optional)</span>
            </label>
            <input
              id="create-account-current-balance"
              type="number"
              step="0.01"
              min="0"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
              placeholder={initialBalance || "10000.00"}
              className={`w-full px-3.5 py-2 font-mono rounded-lg bg-slate-950 border ${
                fieldErrors.currentBalance ? "border-rose-500 focus:ring-rose-500/30" : "border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/20"
              } text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2`}
              disabled={isSubmitting}
            />
            {fieldErrors.currentBalance && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.currentBalance}</p>
            )}
          </div>
        </div>

        {/* Active Status Checkbox */}
        <div className="pt-2 flex items-center gap-2">
          <input
            id="create-account-active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/40"
            disabled={isSubmitting}
          />
          <label htmlFor="create-account-active" className="text-xs text-slate-300 select-none cursor-pointer">
            Set as active account for current trading activity
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Create Account</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AccountCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: AccountCreateModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <AccountCreateForm onClose={onClose} onSuccess={onSuccess} />
    </div>
  );
}
