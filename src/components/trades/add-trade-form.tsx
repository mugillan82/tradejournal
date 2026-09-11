/**
 * Add Trade Form Component
 *
 * Production-grade form for creating new trades at `/trades/new`.
 *
 * Interacts exclusively with authoritative client/API layers:
 * - Loads accounts via `/api/trading-accounts`
 * - Creates trade via POST `/api/trades`
 * - Validates inputs using domain rules
 * - Preserves precision by maintaining exact Decimal strings
 * - Redirects to `/trades/${id}` upon successful creation
 */

"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { TradingAccountDto } from "@/lib/trading/account/types";
import type { TradeSideValue, TradeStatusValue } from "@/lib/trading/trade/types";
import {
  fetchTradingAccounts,
  createTradeClient,
  TradeClientApiError,
  type CreateTradeClientInput,
} from "@/lib/client/trades";
import {
  ChevronLeft,
  PlusCircle,
  AlertCircle,
  Wallet,
  Target,
  LineChart,
} from "@/components/icons";

interface FormErrors {
  tradingAccountId?: string;
  side?: string;
  status?: string;
  title?: string;
  entryDate?: string;
  exitDate?: string;
  entryPrice?: string;
  exitPrice?: string;
  quantity?: string;
  stopLoss?: string;
  takeProfit?: string;
  riskAmount?: string;
  plannedRiskReward?: string;
  commission?: string;
  fees?: string;
  swap?: string;
  grossPnl?: string;
  netPnl?: string;
  strategyId?: string;
  setupId?: string;
  notes?: string;
  _general?: string;
}

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

function isValidDecimal(val: string): boolean {
  return DECIMAL_RE.test(val.trim());
}

function isPositiveDecimal(val: string): boolean {
  return isValidDecimal(val) && !val.trim().startsWith("-") && parseFloat(val) > 0;
}

function isNonNegativeDecimal(val: string): boolean {
  return isValidDecimal(val) && !val.trim().startsWith("-");
}

function decimalPlacesCount(val: string): number {
  const idx = val.indexOf(".");
  return idx === -1 ? 0 : val.length - idx - 1;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function AddTradeForm() {
  const router = useRouter();

  // Accounts state
  const [accounts, setAccounts] = useState<ReadonlyArray<TradingAccountDto>>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // Form Field States
  // 1. Identity
  const [tradingAccountId, setTradingAccountId] = useState("");
  const [title, setTitle] = useState("");
  const [side, setSide] = useState<TradeSideValue>("LONG");
  const [status, setStatus] = useState<TradeStatusValue>("OPEN");

  // 2. Execution
  const [entryDate, setEntryDate] = useState(() => toLocalDatetimeString(new Date()));
  const [exitDate, setExitDate] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  // 3. Risk & Management
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [riskAmount, setRiskAmount] = useState("");
  const [plannedRiskReward, setPlannedRiskReward] = useState("");

  // 4. Result & Costs
  const [grossPnl, setGrossPnl] = useState("");
  const [netPnl, setNetPnl] = useState("");
  const [commission, setCommission] = useState("");
  const [fees, setFees] = useState("");
  const [swap, setSwap] = useState("");

  // 5. Journal & Context
  const [strategyId, setStrategyId] = useState("");
  const [setupId, setSetupId] = useState("");
  const [notes, setNotes] = useState("");

  // UI / Submit state
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch active trading accounts
  useEffect(() => {
    let isMounted = true;

    async function loadAccounts() {
      setIsAccountsLoading(true);
      setAccountsError(null);
      try {
        const accs = await fetchTradingAccounts();
        if (isMounted) {
          setAccounts(accs);
          if (accs.length > 0) {
            // Default to first active account
            const firstActive = accs.find((a) => a.isActive) ?? accs[0];
            setTradingAccountId(firstActive.id);
          }
        }
      } catch {
        if (isMounted) {
          setAccountsError("Unable to load trading accounts. Please refresh the page.");
        }
      } finally {
        if (isMounted) {
          setIsAccountsLoading(false);
        }
      }
    }

    loadAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Client-side domain validation
  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    // 1. Account
    if (!tradingAccountId.trim()) {
      nextErrors.tradingAccountId = "Please select a trading account";
    }

    // 2. Title
    if (title.length > 255) {
      nextErrors.title = "Title must be at most 255 characters";
    }

    // 3. Entry Date
    if (!entryDate) {
      nextErrors.entryDate = "Entry date and time is required";
    } else {
      const parsedEntry = new Date(entryDate);
      if (isNaN(parsedEntry.getTime())) {
        nextErrors.entryDate = "Please enter a valid entry date";
      }
    }

    // 4. Entry Price
    if (!entryPrice.trim()) {
      nextErrors.entryPrice = "Entry price is required";
    } else if (!isPositiveDecimal(entryPrice)) {
      nextErrors.entryPrice = "Entry price must be a positive number";
    } else if (decimalPlacesCount(entryPrice) > 8) {
      nextErrors.entryPrice = "Entry price can have at most 8 decimal places";
    }

    // 5. Quantity
    if (!quantity.trim()) {
      nextErrors.quantity = "Quantity is required";
    } else if (!isPositiveDecimal(quantity)) {
      nextErrors.quantity = "Quantity must be a positive number";
    } else if (decimalPlacesCount(quantity) > 8) {
      nextErrors.quantity = "Quantity can have at most 8 decimal places";
    }

    // 6. Exit Fields (required when status === "CLOSED")
    if (status === "CLOSED") {
      if (!exitPrice.trim()) {
        nextErrors.exitPrice = "Exit price is required when status is CLOSED";
      } else if (!isPositiveDecimal(exitPrice)) {
        nextErrors.exitPrice = "Exit price must be a positive number";
      } else if (decimalPlacesCount(exitPrice) > 8) {
        nextErrors.exitPrice = "Exit price can have at most 8 decimal places";
      }

      if (!exitDate.trim()) {
        nextErrors.exitDate = "Exit date is required when status is CLOSED";
      } else {
        const parsedExit = new Date(exitDate);
        if (isNaN(parsedExit.getTime())) {
          nextErrors.exitDate = "Please enter a valid exit date";
        } else if (entryDate) {
          const parsedEntry = new Date(entryDate);
          if (!isNaN(parsedEntry.getTime()) && parsedExit < parsedEntry) {
            nextErrors.exitDate = "Exit date cannot be before entry date";
          }
        }
      }
    } else if (exitDate.trim()) {
      const parsedExit = new Date(exitDate);
      if (isNaN(parsedExit.getTime())) {
        nextErrors.exitDate = "Please enter a valid exit date";
      } else if (entryDate) {
        const parsedEntry = new Date(entryDate);
        if (!isNaN(parsedEntry.getTime()) && parsedExit < parsedEntry) {
          nextErrors.exitDate = "Exit date cannot be before entry date";
        }
      }
    }

    if (exitPrice.trim() && status !== "CLOSED") {
      if (!isPositiveDecimal(exitPrice)) {
        nextErrors.exitPrice = "Exit price must be a positive number";
      } else if (decimalPlacesCount(exitPrice) > 8) {
        nextErrors.exitPrice = "Exit price can have at most 8 decimal places";
      }
    }

    // 7. Stop Loss & Take Profit
    if (stopLoss.trim()) {
      if (!isPositiveDecimal(stopLoss)) {
        nextErrors.stopLoss = "Stop loss must be a positive number";
      } else if (decimalPlacesCount(stopLoss) > 8) {
        nextErrors.stopLoss = "Stop loss can have at most 8 decimal places";
      }
    }

    if (takeProfit.trim()) {
      if (!isPositiveDecimal(takeProfit)) {
        nextErrors.takeProfit = "Take profit must be a positive number";
      } else if (decimalPlacesCount(takeProfit) > 8) {
        nextErrors.takeProfit = "Take profit can have at most 8 decimal places";
      }
    }

    // 8. Risk Amount & Planned R:R
    if (riskAmount.trim()) {
      if (!isNonNegativeDecimal(riskAmount)) {
        nextErrors.riskAmount = "Risk amount cannot be negative";
      } else if (decimalPlacesCount(riskAmount) > 2) {
        nextErrors.riskAmount = "Risk amount can have at most 2 decimal places";
      }
    }

    if (plannedRiskReward.trim()) {
      if (!isPositiveDecimal(plannedRiskReward)) {
        nextErrors.plannedRiskReward = "Planned R:R must be a positive number";
      } else if (decimalPlacesCount(plannedRiskReward) > 2) {
        nextErrors.plannedRiskReward = "Planned R:R can have at most 2 decimal places";
      }
    }

    // 9. Costs (Commission, Fees, Swap)
    if (commission.trim()) {
      if (!isNonNegativeDecimal(commission)) {
        nextErrors.commission = "Commission cannot be negative";
      } else if (decimalPlacesCount(commission) > 2) {
        nextErrors.commission = "Commission can have at most 2 decimal places";
      }
    }

    if (fees.trim()) {
      if (!isNonNegativeDecimal(fees)) {
        nextErrors.fees = "Fees cannot be negative";
      } else if (decimalPlacesCount(fees) > 2) {
        nextErrors.fees = "Fees can have at most 2 decimal places";
      }
    }

    if (swap.trim()) {
      if (!isValidDecimal(swap)) {
        nextErrors.swap = "Swap must be a valid decimal number";
      } else if (decimalPlacesCount(swap) > 2) {
        nextErrors.swap = "Swap can have at most 2 decimal places";
      }
    }

    // 10. P&L (Signed monetary values)
    if (grossPnl.trim()) {
      if (!isValidDecimal(grossPnl)) {
        nextErrors.grossPnl = "Gross P&L must be a valid decimal number";
      } else if (decimalPlacesCount(grossPnl) > 2) {
        nextErrors.grossPnl = "Gross P&L can have at most 2 decimal places";
      }
    }

    if (netPnl.trim()) {
      if (!isValidDecimal(netPnl)) {
        nextErrors.netPnl = "Net P&L must be a valid decimal number";
      } else if (decimalPlacesCount(netPnl) > 2) {
        nextErrors.netPnl = "Net P&L can have at most 2 decimal places";
      }
    }

    // 11. Notes
    if (notes.length > 5000) {
      nextErrors.notes = "Notes must be at most 5000 characters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const payload: CreateTradeClientInput = {
      tradingAccountId: tradingAccountId.trim(),
      side,
      status,
      title: title.trim() || null,
      entryDate: new Date(entryDate),
      entryPrice: entryPrice.trim(),
      quantity: quantity.trim(),
      exitDate: exitDate.trim() ? new Date(exitDate) : null,
      exitPrice: exitPrice.trim() || null,
      stopLoss: stopLoss.trim() || null,
      takeProfit: takeProfit.trim() || null,
      riskAmount: riskAmount.trim() || null,
      plannedRiskReward: plannedRiskReward.trim() || null,
      grossPnl: grossPnl.trim() || null,
      netPnl: netPnl.trim() || null,
      commission: commission.trim() || null,
      fees: fees.trim() || null,
      swap: swap.trim() || null,
      strategyId: strategyId.trim() || null,
      setupId: setupId.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      const createdTrade = await createTradeClient(payload);
      router.push(`/trades/${createdTrade.id}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof TradeClientApiError) {
        const fieldErrorMap: FormErrors = {};
        if (err.fieldErrors && err.fieldErrors.length > 0) {
          for (const fe of err.fieldErrors) {
            fieldErrorMap[fe.path as keyof FormErrors] = fe.message;
          }
        }
        fieldErrorMap._general = err.message;
        setErrors(fieldErrorMap);
      } else {
        setErrors({
          _general: "An unexpected error occurred while saving the trade. Please try again.",
        });
      }
    }
  };

  if (isAccountsLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-800 rounded" />
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 space-y-6">
          <div className="h-24 bg-slate-800/40 rounded" />
          <div className="h-48 bg-slate-800/40 rounded" />
        </div>
      </div>
    );
  }

  // If no trading accounts exist, guide user to canonical Accounts route
  if (!accounts || accounts.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-2xl mx-auto">
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Wallet size={24} />
          </div>
          <h2 className="text-lg font-semibold text-amber-200">No Trading Account Found</h2>
          <p className="text-sm text-amber-300/80 max-w-sm mx-auto">
            You must configure at least one trading account before logging trade executions.
          </p>
          <div className="pt-3 flex items-center justify-center gap-3">
            <Link
              href="/accounts"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              <span>Go to Accounts</span>
            </Link>
            <Link
              href="/trades"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span>Back to Trades</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="space-y-2">
        <Link
          href="/trades"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back to Trades</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
              Add New Trade
            </h1>
            <p className="text-sm text-slate-400">
              Log a new trade execution with exact financial accuracy.
            </p>
          </div>
        </div>
      </div>

      {/* Global / Top Server Error Alert */}
      {errors._general && (
        <div
          role="alert"
          className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 flex items-start gap-3 text-rose-200 text-sm"
        >
          <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-rose-100">Unable to save trade</p>
            <p className="text-xs text-rose-300/90 mt-0.5">{errors._general}</p>
          </div>
        </div>
      )}

      {accountsError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-900/60 bg-amber-950/40 p-4 flex items-start gap-3 text-amber-200 text-sm"
        >
          <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90">{accountsError}</p>
        </div>
      )}

      {/* Primary Trade Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* SECTION 1: TRADE IDENTITY */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <LineChart size={18} className="text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-100">Trade Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Selection */}
            <div className="sm:col-span-2">
              <label
                htmlFor="trade-account"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Trading Account <span className="text-emerald-400">*</span>
              </label>
              <select
                id="trade-account"
                value={tradingAccountId}
                onChange={(e) => setTradingAccountId(e.target.value)}
                aria-invalid={Boolean(errors.tradingAccountId)}
                aria-describedby={errors.tradingAccountId ? "trade-account-err" : undefined}
                className={[
                  "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                  errors.tradingAccountId
                    ? "border-rose-500/80 ring-1 ring-rose-500/50"
                    : "border-slate-800 hover:border-slate-700",
                ].join(" ")}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency}) {!acc.isActive ? "— Inactive" : ""}
                  </option>
                ))}
              </select>
              {errors.tradingAccountId && (
                <p id="trade-account-err" role="alert" className="mt-1 text-xs text-rose-400">
                  {errors.tradingAccountId}
                </p>
              )}
            </div>

            {/* Title / Symbol / Instrument */}
            <div className="sm:col-span-2">
              <label
                htmlFor="trade-title"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Trade Title / Symbol
              </label>
              <input
                id="trade-title"
                type="text"
                placeholder="e.g. AAPL breakout, EURUSD London open"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "trade-title-err" : undefined}
                className={[
                  "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                  errors.title
                    ? "border-rose-500/80 ring-1 ring-rose-500/50"
                    : "border-slate-800 hover:border-slate-700",
                ].join(" ")}
              />
              {errors.title && (
                <p id="trade-title-err" role="alert" className="mt-1 text-xs text-rose-400">
                  {errors.title}
                </p>
              )}
            </div>

            {/* Side: Visual Toggle */}
            <div className="sm:col-span-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Side <span className="text-emerald-400">*</span>
              </span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Trade Side">
                <button
                  type="button"
                  role="radio"
                  aria-checked={side === "LONG"}
                  onClick={() => setSide("LONG")}
                  className={[
                    "flex items-center justify-center py-2.5 px-3 rounded-lg text-sm font-bold tracking-wide uppercase transition-all duration-150 border",
                    side === "LONG"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-950/50"
                      : "bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200",
                  ].join(" ")}
                >
                  LONG
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={side === "SHORT"}
                  onClick={() => setSide("SHORT")}
                  className={[
                    "flex items-center justify-center py-2.5 px-3 rounded-lg text-sm font-bold tracking-wide uppercase transition-all duration-150 border",
                    side === "SHORT"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm shadow-rose-950/50"
                      : "bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200",
                  ].join(" ")}
                >
                  SHORT
                </button>
              </div>
            </div>

            {/* Status Select */}
            <div className="sm:col-span-2">
              <label
                htmlFor="trade-status"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Status <span className="text-emerald-400">*</span>
              </label>
              <select
                id="trade-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TradeStatusValue)}
                aria-invalid={Boolean(errors.status)}
                aria-describedby={errors.status ? "trade-status-err" : undefined}
                className={[
                  "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                  errors.status
                    ? "border-rose-500/80 ring-1 ring-rose-500/50"
                    : "border-slate-800 hover:border-slate-700",
                ].join(" ")}
              >
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              {errors.status && (
                <p id="trade-status-err" role="alert" className="mt-1 text-xs text-rose-400">
                  {errors.status}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: EXECUTION */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PlusCircle size={18} className="text-emerald-400" />
              <h2 className="text-base font-semibold text-slate-100">Execution Parameters</h2>
            </div>
            {status === "CLOSED" && (
              <span className="text-[11px] font-medium text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                Exit details required for CLOSED trades
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-sm">
            {/* Entry Date */}
            <div className="font-sans">
              <label
                htmlFor="entry-date"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Entry Date & Time <span className="text-emerald-400">*</span>
              </label>
              <input
                id="entry-date"
                type="datetime-local"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                aria-invalid={Boolean(errors.entryDate)}
                aria-describedby={errors.entryDate ? "entry-date-err" : undefined}
                className={[
                  "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                  errors.entryDate
                    ? "border-rose-500/80 ring-1 ring-rose-500/50"
                    : "border-slate-800 hover:border-slate-700",
                ].join(" ")}
              />
              {errors.entryDate && (
                <p id="entry-date-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.entryDate}
                </p>
              )}
            </div>

            {/* Entry Price */}
            <div>
              <label
                htmlFor="entry-price"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Entry Price <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="entry-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0000"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  aria-invalid={Boolean(errors.entryPrice)}
                  aria-describedby={errors.entryPrice ? "entry-price-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.entryPrice
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.entryPrice && (
                <p id="entry-price-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.entryPrice}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label
                htmlFor="trade-quantity"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Quantity / Size <span className="text-emerald-400">*</span>
              </label>
              <input
                id="trade-quantity"
                type="text"
                inputMode="decimal"
                placeholder="1.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                aria-invalid={Boolean(errors.quantity)}
                aria-describedby={errors.quantity ? "trade-qty-err" : undefined}
                className={[
                  "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                  errors.quantity
                    ? "border-rose-500/80 ring-1 ring-rose-500/50"
                    : "border-slate-800 hover:border-slate-700",
                ].join(" ")}
              />
              {errors.quantity && (
                <p id="trade-qty-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.quantity}
                </p>
              )}
            </div>

            {/* Exit Date */}
            <div className="font-sans">
              <label
                htmlFor="exit-date"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Exit Date & Time {status === "CLOSED" && <span className="text-emerald-400">*</span>}
              </label>
              <input
                id="exit-date"
                type="datetime-local"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                aria-invalid={Boolean(errors.exitDate)}
                aria-describedby={errors.exitDate ? "exit-date-err" : undefined}
                className={[
                  "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                  errors.exitDate
                    ? "border-rose-500/80 ring-1 ring-rose-500/50"
                    : "border-slate-800 hover:border-slate-700",
                ].join(" ")}
              />
              {errors.exitDate && (
                <p id="exit-date-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.exitDate}
                </p>
              )}
            </div>

            {/* Exit Price */}
            <div>
              <label
                htmlFor="exit-price"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Exit Price {status === "CLOSED" && <span className="text-emerald-400">*</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="exit-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0000"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  aria-invalid={Boolean(errors.exitPrice)}
                  aria-describedby={errors.exitPrice ? "exit-price-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.exitPrice
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.exitPrice && (
                <p id="exit-price-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.exitPrice}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: RISK & MANAGEMENT */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Target size={18} className="text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-100">Risk & Management</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-sm">
            {/* Stop Loss */}
            <div>
              <label
                htmlFor="stop-loss"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Stop Loss
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="stop-loss"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  aria-invalid={Boolean(errors.stopLoss)}
                  aria-describedby={errors.stopLoss ? "stop-loss-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.stopLoss
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.stopLoss && (
                <p id="stop-loss-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.stopLoss}
                </p>
              )}
            </div>

            {/* Take Profit */}
            <div>
              <label
                htmlFor="take-profit"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Take Profit
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="take-profit"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  aria-invalid={Boolean(errors.takeProfit)}
                  aria-describedby={errors.takeProfit ? "take-profit-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.takeProfit
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.takeProfit && (
                <p id="take-profit-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.takeProfit}
                </p>
              )}
            </div>

            {/* Risk Amount ($ risked) */}
            <div>
              <label
                htmlFor="risk-amount"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Risk Amount ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="risk-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={riskAmount}
                  onChange={(e) => setRiskAmount(e.target.value)}
                  aria-invalid={Boolean(errors.riskAmount)}
                  aria-describedby={errors.riskAmount ? "risk-amount-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.riskAmount
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.riskAmount && (
                <p id="risk-amount-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.riskAmount}
                </p>
              )}
            </div>

            {/* Planned Risk:Reward Ratio */}
            <div>
              <label
                htmlFor="planned-rr"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Planned R:R
              </label>
              <div className="relative">
                <input
                  id="planned-rr"
                  type="text"
                  inputMode="decimal"
                  placeholder="2.00"
                  value={plannedRiskReward}
                  onChange={(e) => setPlannedRiskReward(e.target.value)}
                  aria-invalid={Boolean(errors.plannedRiskReward)}
                  aria-describedby={errors.plannedRiskReward ? "planned-rr-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.plannedRiskReward
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.plannedRiskReward && (
                <p id="planned-rr-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.plannedRiskReward}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: RESULT & COSTS */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Wallet size={18} className="text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-100">Financial Result & Costs</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-sm">
            {/* Gross PnL */}
            <div>
              <label
                htmlFor="gross-pnl"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Gross P&L ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="gross-pnl"
                  type="text"
                  inputMode="text"
                  placeholder="0.00 (or -0.00)"
                  value={grossPnl}
                  onChange={(e) => setGrossPnl(e.target.value)}
                  aria-invalid={Boolean(errors.grossPnl)}
                  aria-describedby={errors.grossPnl ? "gross-pnl-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.grossPnl
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.grossPnl && (
                <p id="gross-pnl-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.grossPnl}
                </p>
              )}
            </div>

            {/* Net PnL */}
            <div>
              <label
                htmlFor="net-pnl"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Net P&L ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="net-pnl"
                  type="text"
                  inputMode="text"
                  placeholder="0.00 (or -0.00)"
                  value={netPnl}
                  onChange={(e) => setNetPnl(e.target.value)}
                  aria-invalid={Boolean(errors.netPnl)}
                  aria-describedby={errors.netPnl ? "net-pnl-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.netPnl
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.netPnl && (
                <p id="net-pnl-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.netPnl}
                </p>
              )}
            </div>

            {/* Commission */}
            <div>
              <label
                htmlFor="trade-commission"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Commission ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="trade-commission"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  aria-invalid={Boolean(errors.commission)}
                  aria-describedby={errors.commission ? "commission-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.commission
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.commission && (
                <p id="commission-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.commission}
                </p>
              )}
            </div>

            {/* Fees */}
            <div>
              <label
                htmlFor="trade-fees"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Exchange / Broker Fees ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="trade-fees"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  aria-invalid={Boolean(errors.fees)}
                  aria-describedby={errors.fees ? "fees-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.fees
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.fees && (
                <p id="fees-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.fees}
                </p>
              )}
            </div>

            {/* Swap */}
            <div>
              <label
                htmlFor="trade-swap"
                className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Swap / Financing ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="trade-swap"
                  type="text"
                  inputMode="text"
                  placeholder="0.00 (or -0.00)"
                  value={swap}
                  onChange={(e) => setSwap(e.target.value)}
                  aria-invalid={Boolean(errors.swap)}
                  aria-describedby={errors.swap ? "swap-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 pl-8 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors",
                    errors.swap
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
              </div>
              {errors.swap && (
                <p id="swap-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                  {errors.swap}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: JOURNAL & CONTEXT */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-slate-100">Journal & Notes</h2>
            <span className="text-xs text-slate-500">
              {notes.length} / 5000 characters
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="strategy-id"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Strategy ID
                </label>
                <input
                  id="strategy-id"
                  type="text"
                  placeholder="Optional strategy reference"
                  value={strategyId}
                  onChange={(e) => setStrategyId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="setup-id"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Setup ID
                </label>
                <input
                  id="setup-id"
                  type="text"
                  placeholder="Optional setup reference"
                  value={setupId}
                  onChange={(e) => setSetupId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="trade-notes"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Trade Notes & Review
              </label>
              <textarea
                id="trade-notes"
                rows={4}
                placeholder="Market context, mindset, execution observations, why you entered or exited..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={5000}
                aria-invalid={Boolean(errors.notes)}
                aria-describedby={errors.notes ? "trade-notes-err" : undefined}
                className={[
                  "w-full rounded-lg border bg-slate-950/90 p-3.5 text-sm text-slate-100 placeholder-slate-600 leading-relaxed",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors resize-y min-h-[100px]",
                  errors.notes
                    ? "border-rose-500/80 ring-1 ring-rose-500/50"
                    : "border-slate-800 hover:border-slate-700",
                ].join(" ")}
              />
              {errors.notes && (
                <p id="trade-notes-err" role="alert" className="mt-1 text-xs text-rose-400">
                  {errors.notes}
                </p>
              )}
            </div>

            {/* Note regarding Tags and Mistakes */}
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 text-xs text-slate-400 flex items-start gap-2">
              <span className="text-slate-500 mt-0.5" aria-hidden="true">•</span>
              <p>
                Tags and Mistakes taggings will be managed through dedicated tag assignment tools in upcoming updates.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 6: ACTIONS */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
          <Link
            href="/trades"
            className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className={[
              "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white",
              "hover:bg-emerald-500 active:bg-emerald-700 transition-all duration-150 shadow-lg shadow-emerald-950/40 select-none",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950",
              isSubmitting ? "opacity-60 cursor-not-allowed" : "",
            ].join(" ")}
          >
            {isSubmitting && (
              <svg
                className="animate-spin h-4 w-4 shrink-0 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>{isSubmitting ? "Saving Trade..." : "Save Trade"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
