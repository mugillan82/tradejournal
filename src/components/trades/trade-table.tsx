/**
 * Trade Table Component
 *
 * Professional desktop/tablet data table consuming the Trade DTO.
 * Supports column sorting, formatted financial values, side/status badges,
 * and direct row navigation to `/trades/[id]`.
 */

"use client";

import Link from "next/link";
import type { TradeDto, TradeSortField, SortDirection } from "@/lib/trading/trade/types";
import type { TradingAccountDto } from "@/lib/trading/account/types";
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronRight } from "@/components/icons";

interface TradeTableProps {
  trades: ReadonlyArray<TradeDto>;
  accounts: ReadonlyArray<TradingAccountDto>;
  sortField: TradeSortField;
  sortDirection: SortDirection;
  onSortChange: (field: TradeSortField) => void;
}

function formatDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function formatDecimal(valStr: string | null, decimals = 2): string {
  if (valStr === null || valStr === undefined) return "—";
  const num = parseFloat(valStr);
  if (isNaN(num)) return "—";
  return num.toFixed(decimals);
}

export function TradeTable({
  trades,
  accounts,
  sortField,
  sortDirection,
  onSortChange,
}: TradeTableProps) {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const renderSortableHeader = (label: string, field: TradeSortField, alignRight = false) => {
    const isActive = sortField === field;
    return (
      <th
        scope="col"
        className={[
          "px-4 py-3 text-xs font-semibold text-slate-400 select-none cursor-pointer hover:text-slate-200 transition-colors",
          alignRight ? "text-right" : "text-left",
        ].join(" ")}
        onClick={() => onSortChange(field)}
      >
        <div
          className={[
            "inline-flex items-center gap-1.5",
            alignRight ? "flex-row-reverse" : "flex-row",
          ].join(" ")}
        >
          <span>{label}</span>
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp size={14} className="text-emerald-400" />
            ) : (
              <ArrowDown size={14} className="text-emerald-400" />
            )
          ) : (
            <ArrowUpDown size={14} className="text-slate-600 opacity-60 hover:opacity-100" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-xl">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/80">
            {renderSortableHeader("Entry Date", "entryDate")}
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-400">
              Title / Note
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-400">
              Account
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-400">
              Side
            </th>
            {renderSortableHeader("Qty", "quantity", true)}
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-400 text-right">
              Entry Price
            </th>
            {renderSortableHeader("Exit Date", "exitDate")}
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-400 text-right">
              Exit Price
            </th>
            {renderSortableHeader("Gross P&L", "grossPnl", true)}
            {renderSortableHeader("Net P&L", "netPnl", true)}
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-400 text-right">
              R
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-400">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-400 text-center">
              Detail
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
          {trades.map((trade) => {
            const accountName = accountMap.get(trade.tradingAccountId) || "Default Account";
            const gross = formatCurrency(trade.grossPnl);
            const net = formatCurrency(trade.netPnl);
            const isLong = trade.side === "LONG";
            const rMultiple = trade.actualRMultiple ? `${formatDecimal(trade.actualRMultiple, 2)}R` : "—";

            return (
              <tr
                key={trade.id}
                className="group hover:bg-slate-900/60 transition-colors duration-150"
              >
                {/* Entry Date */}
                <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-sans text-xs">
                  {formatDate(trade.entryDate)}
                </td>

                {/* Title / Notes */}
                <td className="px-4 py-3 font-sans max-w-[180px]">
                  <p className="font-medium text-slate-200 truncate" title={trade.title || trade.id}>
                    {trade.title || `Trade #${trade.id.slice(0, 8)}`}
                  </p>
                  {trade.notes && (
                    <p className="text-[11px] text-slate-500 truncate" title={trade.notes}>
                      {trade.notes}
                    </p>
                  )}
                </td>

                {/* Account */}
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-sans text-xs">
                  {accountName}
                </td>

                {/* Side */}
                <td className="px-4 py-3 whitespace-nowrap font-sans">
                  <span
                    className={[
                      "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase",
                      isLong
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                    ].join(" ")}
                  >
                    {trade.side}
                  </span>
                </td>

                {/* Quantity */}
                <td className="px-4 py-3 text-slate-200 text-right whitespace-nowrap">
                  {formatDecimal(trade.quantity, 4)}
                </td>

                {/* Entry Price */}
                <td className="px-4 py-3 text-slate-200 text-right whitespace-nowrap">
                  ${formatDecimal(trade.entryPrice, 4)}
                </td>

                {/* Exit Date */}
                <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-sans text-xs">
                  {formatDate(trade.exitDate)}
                </td>

                {/* Exit Price */}
                <td className="px-4 py-3 text-slate-400 text-right whitespace-nowrap">
                  {trade.exitPrice ? `$${formatDecimal(trade.exitPrice, 4)}` : "—"}
                </td>

                {/* Gross PnL */}
                <td
                  className={[
                    "px-4 py-3 text-right whitespace-nowrap font-semibold",
                    gross.isPos ? "text-emerald-400" : gross.isNeg ? "text-rose-400" : "text-slate-400",
                  ].join(" ")}
                >
                  {gross.formatted}
                </td>

                {/* Net PnL */}
                <td
                  className={[
                    "px-4 py-3 text-right whitespace-nowrap font-bold",
                    net.isPos ? "text-emerald-400" : net.isNeg ? "text-rose-400" : "text-slate-400",
                  ].join(" ")}
                >
                  {net.formatted}
                </td>

                {/* R Multiple */}
                <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">
                  {rMultiple}
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap font-sans">
                  <span
                    className={[
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase",
                      trade.status === "OPEN"
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : trade.status === "CLOSED"
                        ? "bg-slate-800 text-slate-300 border border-slate-700"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                    ].join(" ")}
                  >
                    {trade.status}
                  </span>
                </td>

                {/* Action Link */}
                <td className="px-4 py-3 text-center whitespace-nowrap font-sans">
                  <Link
                    href={`/trades/${trade.id}`}
                    className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                    title="View trade details"
                    aria-label={`View trade details for ${trade.title || trade.id}`}
                  >
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
