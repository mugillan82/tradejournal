/**
 * Trade Card List Component
 *
 * Mobile-first responsive card layout for small viewports.
 * Avoids browser overflow of dense desktop tables while preserving full trade data usability.
 */

"use client";

import Link from "next/link";
import type { TradeDto } from "@/lib/trading/trade/types";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import { ChevronRight } from "@/components/icons";

interface TradeCardListProps {
  trades: ReadonlyArray<TradeDto>;
  accounts: ReadonlyArray<TradingAccountDto>;
}

function formatDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatCurrency(valStr: string | null): { formatted: string; isPos: boolean; isNeg: boolean } {
  if (valStr === null || valStr === undefined) return { formatted: "—", isPos: false, isNeg: false };
  const num = parseFloat(valStr);
  if (isNaN(num)) return { formatted: "—", isPos: false, isNeg: false };
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return { formatted, isPos: num > 0, isNeg: num < 0 };
}

export function TradeCardList({ trades, accounts }: TradeCardListProps) {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <div className="space-y-3 md:hidden">
      {trades.map((trade) => {
        const accountName = accountMap.get(trade.tradingAccountId) || "Default Account";
        const net = formatCurrency(trade.netPnl);
        const isLong = trade.side === "LONG";

        return (
          <Link
            key={trade.id}
            href={`/trades/${trade.id}`}
            className="block rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-all duration-150"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase",
                      isLong
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                    ].join(" ")}
                  >
                    {trade.side}
                  </span>
                  <span
                    className={[
                      "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase",
                      trade.status === "OPEN"
                        ? "bg-cyan-500/10 text-cyan-400"
                        : trade.status === "CLOSED"
                        ? "bg-slate-800 text-slate-400"
                        : "bg-amber-500/10 text-amber-400",
                    ].join(" ")}
                  >
                    {trade.status}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">
                    {accountName}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 truncate">
                  {trade.title || `Trade #${trade.id.slice(0, 8)}`}
                </h3>
              </div>

              <div className="text-right flex-shrink-0">
                <p
                  className={[
                    "text-sm font-bold",
                    net.isPos ? "text-emerald-400" : net.isNeg ? "text-rose-400" : "text-slate-300",
                  ].join(" ")}
                >
                  {net.formatted}
                </p>
                <p className="text-[11px] text-slate-500">{formatDate(trade.entryDate)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono text-slate-400">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Qty</span>
                <span>{trade.quantity}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Entry</span>
                <span>${trade.entryPrice}</span>
              </div>
              <div className="text-right flex items-center justify-end gap-1">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Exit</span>
                  <span>{trade.exitPrice ? `$${trade.exitPrice}` : "—"}</span>
                </div>
                <ChevronRight size={14} className="text-slate-600 ml-1" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
