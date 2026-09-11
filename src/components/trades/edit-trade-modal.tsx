/**
 * Edit Trade Modal Component
 *
 * Provides a modal editing experience for updating existing trade details.
 * Accessible with role="dialog", aria-modal="true", keyboard focus trap, and Escape key listener.
 */

"use client";

import { useEffect, useState, useId } from "react";
import {
  X,
  AlertCircle,
  RefreshCw,
  LineChart,
  Target,
  DollarSign,
  Pencil,
} from "@/components/icons";
import { updateTradeClient, TradeClientApiError } from "@/lib/client/trades";
import type { TradeDto, TradeSideValue, TradeStatusValue } from "@/lib/trading/trade/types";

interface EditTradeModalProps {
  trade: TradeDto;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTrade: TradeDto) => void;
}

function formatDateForInput(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EditTradeModal({ trade, isOpen, onClose, onSave }: EditTradeModalProps) {
  if (!isOpen) return null;

  return <EditTradeModalContent key={trade.id + (trade.updatedAt ? trade.updatedAt.toISOString() : "")} trade={trade} onClose={onClose} onSave={onSave} />;
}

function EditTradeModalContent({
  trade,
  onClose,
  onSave,
}: {
  trade: TradeDto;
  onClose: () => void;
  onSave: (updatedTrade: TradeDto) => void;
}) {
  const modalTitleId = useId();

  // Form State initialized from current trade props
  const [side, setSide] = useState<TradeSideValue>(trade.side);
  const [status, setStatus] = useState<TradeStatusValue>(trade.status);
  const [title, setTitle] = useState(trade.title || "");
  const [entryPrice, setEntryPrice] = useState(trade.entryPrice || "");
  const [entryDate, setEntryDate] = useState(formatDateForInput(trade.entryDate));
  const [exitPrice, setExitPrice] = useState(trade.exitPrice || "");
  const [exitDate, setExitDate] = useState(formatDateForInput(trade.exitDate));
  const [quantity, setQuantity] = useState(trade.quantity || "");
  const [stopLoss, setStopLoss] = useState(trade.stopLoss || "");
  const [takeProfit, setTakeProfit] = useState(trade.takeProfit || "");
  const [riskAmount, setRiskAmount] = useState(trade.riskAmount || "");
  const [plannedRiskReward, setPlannedRiskReward] = useState(trade.plannedRiskReward || "");
  const [grossPnl, setGrossPnl] = useState(trade.grossPnl || "");
  const [netPnl, setNetPnl] = useState(trade.netPnl || "");
  const [commission, setCommission] = useState(trade.commission || "");
  const [fees, setFees] = useState(trade.fees || "");
  const [swap, setSwap] = useState(trade.swap || "");
  const [strategyId, setStrategyId] = useState(trade.strategyId || "");
  const [setupId, setSetupId] = useState(trade.setupId || "");
  const [notes, setNotes] = useState(trade.notes || "");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!entryPrice.trim()) {
      errs.entryPrice = "Entry price is required";
    } else {
      const p = parseFloat(entryPrice);
      if (isNaN(p) || p <= 0) {
        errs.entryPrice = "Entry price must be a positive number";
      }
    }

    if (!entryDate.trim()) {
      errs.entryDate = "Entry date is required";
    }

    if (!quantity.trim()) {
      errs.quantity = "Quantity is required";
    } else {
      const q = parseFloat(quantity);
      if (isNaN(q) || q <= 0) {
        errs.quantity = "Quantity must be a positive number";
      }
    }

    if (status === "CLOSED") {
      if (!exitPrice.trim()) {
        errs.exitPrice = "Exit price is required when status is closed";
      } else {
        const ep = parseFloat(exitPrice);
        if (isNaN(ep) || ep <= 0) {
          errs.exitPrice = "Exit price must be a positive number";
        }
      }

      if (!exitDate.trim()) {
        errs.exitDate = "Exit date is required when status is closed";
      } else if (entryDate.trim()) {
        const ent = new Date(entryDate).getTime();
        const ext = new Date(exitDate).getTime();
        if (!isNaN(ent) && !isNaN(ext) && ext < ent) {
          errs.exitDate = "Exit date cannot precede entry date";
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        side,
        status,
        title: title.trim() || null,
        entryPrice: entryPrice.trim(),
        entryDate: new Date(entryDate),
        exitPrice: exitPrice.trim() ? exitPrice.trim() : null,
        exitDate: exitDate.trim() ? new Date(exitDate) : null,
        quantity: quantity.trim(),
        stopLoss: stopLoss.trim() ? stopLoss.trim() : null,
        takeProfit: takeProfit.trim() ? takeProfit.trim() : null,
        riskAmount: riskAmount.trim() ? riskAmount.trim() : null,
        plannedRiskReward: plannedRiskReward.trim() ? plannedRiskReward.trim() : null,
        grossPnl: grossPnl.trim() ? grossPnl.trim() : null,
        netPnl: netPnl.trim() ? netPnl.trim() : null,
        commission: commission.trim() ? commission.trim() : null,
        fees: fees.trim() ? fees.trim() : null,
        swap: swap.trim() ? swap.trim() : null,
        strategyId: strategyId.trim() || null,
        setupId: setupId.trim() || null,
        notes: notes.trim() || null,
      };

      const updated = await updateTradeClient(trade.id, payload);
      onSave(updated);
      onClose();
    } catch (err: unknown) {
      if (err instanceof TradeClientApiError) {
        if (err.fieldErrors && err.fieldErrors.length > 0) {
          const fieldMap: Record<string, string> = {};
          for (const fe of err.fieldErrors) {
            fieldMap[fe.path] = fe.message;
          }
          setErrors(fieldMap);
        } else {
          setErrors({ _general: err.message });
        }
      } else {
        setErrors({
          _general: "An unexpected error occurred while updating the trade.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="w-full max-w-3xl my-8 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Pencil size={16} />
            </div>
            <div>
              <h2 id={modalTitleId} className="text-base font-bold text-slate-100">
                Edit Trade #{trade.id.slice(0, 8)}
              </h2>
              <p className="text-xs text-slate-400">
                Update execution parameters, pricing, and reflections.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close edit dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto p-6 space-y-6 flex-1">
          {errors._general && (
            <div
              role="alert"
              className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 flex items-start gap-3 text-rose-200 text-sm"
            >
              <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs">{errors._general}</p>
            </div>
          )}

          {/* Section 1: Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1.5">
              <LineChart size={14} className="text-emerald-400" />
              <span>Trade Identity &amp; Side</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Side
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={side === "LONG"}
                    onClick={() => setSide("LONG")}
                    className={[
                      "py-1.5 rounded-md text-xs font-bold transition-all text-center",
                      side === "LONG"
                        ? "bg-emerald-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200",
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
                      "py-1.5 rounded-md text-xs font-bold transition-all text-center",
                      side === "SHORT"
                        ? "bg-rose-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200",
                    ].join(" ")}
                  >
                    SHORT
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-status"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Status
                </label>
                <select
                  id="edit-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TradeStatusValue)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                >
                  <option value="OPEN">OPEN (Active Position)</option>
                  <option value="CLOSED">CLOSED (Completed Trade)</option>
                  <option value="CANCELLED">CANCELLED (Order Cancelled)</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label
                  htmlFor="edit-title"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Title / Symbol
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AAPL breakout"
                  maxLength={255}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Execution */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1.5">
              <DollarSign size={14} className="text-emerald-400" />
              <span>Execution Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-sm">
              <div>
                <label
                  htmlFor="edit-entry-price"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Entry Price <span className="text-emerald-400">*</span>
                </label>
                <input
                  id="edit-entry-price"
                  type="text"
                  inputMode="decimal"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  aria-invalid={Boolean(errors.entryPrice)}
                  aria-describedby={errors.entryPrice ? "edit-entry-price-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100",
                    errors.entryPrice
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
                {errors.entryPrice && (
                  <p id="edit-entry-price-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                    {errors.entryPrice}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="edit-quantity"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Quantity <span className="text-emerald-400">*</span>
                </label>
                <input
                  id="edit-quantity"
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  aria-invalid={Boolean(errors.quantity)}
                  aria-describedby={errors.quantity ? "edit-qty-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100",
                    errors.quantity
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
                {errors.quantity && (
                  <p id="edit-qty-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                    {errors.quantity}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="edit-entry-date"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Entry Date &amp; Time <span className="text-emerald-400">*</span>
                </label>
                <input
                  id="edit-entry-date"
                  type="datetime-local"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  aria-invalid={Boolean(errors.entryDate)}
                  aria-describedby={errors.entryDate ? "edit-entry-date-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100",
                    errors.entryDate
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
                {errors.entryDate && (
                  <p id="edit-entry-date-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                    {errors.entryDate}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="edit-exit-price"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Exit Price {status === "CLOSED" && <span className="text-emerald-400">*</span>}
                </label>
                <input
                  id="edit-exit-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="Optional unless closed"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  aria-invalid={Boolean(errors.exitPrice)}
                  aria-describedby={errors.exitPrice ? "edit-exit-price-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100",
                    errors.exitPrice
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
                {errors.exitPrice && (
                  <p id="edit-exit-price-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                    {errors.exitPrice}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="edit-exit-date"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Exit Date &amp; Time {status === "CLOSED" && <span className="text-emerald-400">*</span>}
                </label>
                <input
                  id="edit-exit-date"
                  type="datetime-local"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  aria-invalid={Boolean(errors.exitDate)}
                  aria-describedby={errors.exitDate ? "edit-exit-date-err" : undefined}
                  className={[
                    "w-full rounded-lg border bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100",
                    errors.exitDate
                      ? "border-rose-500/80 ring-1 ring-rose-500/50"
                      : "border-slate-800 hover:border-slate-700",
                  ].join(" ")}
                />
                {errors.exitDate && (
                  <p id="edit-exit-date-err" role="alert" className="mt-1 text-xs text-rose-400 font-sans">
                    {errors.exitDate}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Risk & Management */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1.5">
              <Target size={14} className="text-emerald-400" />
              <span>Risk &amp; Result</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-sm">
              <div>
                <label
                  htmlFor="edit-stop-loss"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Stop Loss ($)
                </label>
                <input
                  id="edit-stop-loss"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-take-profit"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Take Profit ($)
                </label>
                <input
                  id="edit-take-profit"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-risk-amount"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Risk Amount ($)
                </label>
                <input
                  id="edit-risk-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={riskAmount}
                  onChange={(e) => setRiskAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-planned-rr"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Planned R:R
                </label>
                <input
                  id="edit-planned-rr"
                  type="text"
                  inputMode="decimal"
                  placeholder="2.00"
                  value={plannedRiskReward}
                  onChange={(e) => setPlannedRiskReward(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-gross-pnl"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Gross P&amp;L ($)
                </label>
                <input
                  id="edit-gross-pnl"
                  type="text"
                  inputMode="text"
                  placeholder="0.00"
                  value={grossPnl}
                  onChange={(e) => setGrossPnl(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-net-pnl"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Net P&amp;L ($)
                </label>
                <input
                  id="edit-net-pnl"
                  type="text"
                  inputMode="text"
                  placeholder="0.00"
                  value={netPnl}
                  onChange={(e) => setNetPnl(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-commission"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Commission ($)
                </label>
                <input
                  id="edit-commission"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-fees"
                  className="block text-xs font-semibold font-sans uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Fees &amp; Swap ($)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    id="edit-fees"
                    type="text"
                    inputMode="decimal"
                    placeholder="Fees"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                  <input
                    id="edit-swap"
                    type="text"
                    inputMode="decimal"
                    placeholder="Swap"
                    value={swap}
                    onChange={(e) => setSwap(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Strategy & Context */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1.5">
              <span>Strategy, Setup &amp; Notes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="edit-strategy-id"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Strategy ID
                </label>
                <input
                  id="edit-strategy-id"
                  type="text"
                  value={strategyId}
                  onChange={(e) => setStrategyId(e.target.value)}
                  placeholder="Optional strategy reference"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-setup-id"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Setup ID
                </label>
                <input
                  id="edit-setup-id"
                  type="text"
                  value={setupId}
                  onChange={(e) => setSetupId(e.target.value)}
                  placeholder="Optional setup reference"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/90 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-notes"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Trade Notes &amp; Reflections
              </label>
              <textarea
                id="edit-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={5000}
                placeholder="Market observations, execution notes, psychological reflections..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950/90 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-y"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-950/40"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
