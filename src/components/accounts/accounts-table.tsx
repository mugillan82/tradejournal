"use client";

import React from "react";
import Link from "next/link";
import type { TradingAccountDto } from "@/lib/client/accounts";
import {
  ExternalLink,
  Pencil,
  Trash2,
  Power,
  TrendingUp,
  TrendingDown,
  Building2,
} from "@/components/icons";

interface AccountsTableProps {
  accounts: ReadonlyArray<TradingAccountDto>;
  onEdit: (account: TradingAccountDto) => void;
  onDelete: (account: TradingAccountDto) => void;
  onToggleStatus: (account: TradingAccountDto) => void;
}

function getTypeBadgeStyle(type: string): { bg: string; text: string; border: string; label: string } {
  switch (type.toUpperCase()) {
    case "LIVE":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/20",
        label: "Live",
      };
    case "PAPER_TRADING":
      return {
        bg: "bg-sky-500/10",
        text: "text-sky-400",
        border: "border-sky-500/20",
        label: "Paper Trading",
      };
    case "SIMULATION":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/20",
        label: "Simulation",
      };
    case "DEMO":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/20",
        label: "Demo",
      };
    default:
      return {
        bg: "bg-slate-800",
        text: "text-slate-300",
        border: "border-slate-700",
        label: type,
      };
  }
}

export function AccountsTable({
  accounts,
  onEdit,
  onDelete,
  onToggleStatus,
}: AccountsTableProps) {
  return (
    <div className="space-y-4">
      {/* Desktop Table (hidden on small screens) */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm backdrop-blur-sm">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3">Account Name</th>
              <th scope="col" className="px-3 py-3.5">Type</th>
              <th scope="col" className="px-3 py-3.5">Currency</th>
              <th scope="col" className="px-3 py-3.5 text-right">Initial Balance</th>
              <th scope="col" className="px-3 py-3.5 text-right">Current Balance</th>
              <th scope="col" className="px-3 py-3.5 text-right">Net Change</th>
              <th scope="col" className="px-3 py-3.5 text-center">Status</th>
              <th scope="col" className="px-3 py-3.5">Created</th>
              <th scope="col" className="py-3.5 pl-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-normal">
            {accounts.map((account) => {
              const typeInfo = getTypeBadgeStyle(account.type);
              const initVal = account.initialBalance ? parseFloat(account.initialBalance) : 0;
              const currVal = account.currentBalance ? parseFloat(account.currentBalance) : 0;
              const hasBalances = account.initialBalance !== null && account.currentBalance !== null;
              const delta = currVal - initVal;
              const deltaPct = initVal > 0 ? (delta / initVal) * 100 : 0;
              const isProfit = delta >= 0;

              return (
                <tr
                  key={account.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-4 pl-4 pr-3 font-medium text-slate-100">
                    <Link
                      href={`/accounts/${account.id}`}
                      className="inline-flex items-center gap-2 hover:text-emerald-400 focus:outline-none focus:underline transition-colors"
                    >
                      <Building2 size={16} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      <span>{account.name}</span>
                    </Link>
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border}`}
                    >
                      {typeInfo.label}
                    </span>
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-400 font-medium">
                      {account.currency}
                    </span>
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-right font-mono text-slate-300">
                    {account.initialBalance
                      ? parseFloat(account.initialBalance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-right font-mono font-medium text-slate-100">
                    {account.currentBalance
                      ? parseFloat(account.currentBalance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-right font-mono">
                    {hasBalances ? (
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isProfit ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isProfit ? "+" : ""}
                        {delta.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({isProfit ? "+" : ""}
                          {deltaPct.toFixed(1)}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        account.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          account.isActive ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      {account.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-3 py-4 whitespace-nowrap text-xs text-slate-400">
                    {new Date(account.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>

                  <td className="py-4 pl-3 pr-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/accounts/${account.id}`}
                        title="View Account Details"
                        className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      >
                        <ExternalLink size={15} />
                        <span className="sr-only">View {account.name}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => onEdit(account)}
                        title="Edit Account"
                        className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      >
                        <Pencil size={15} />
                        <span className="sr-only">Edit {account.name}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(account)}
                        title={account.isActive ? "Deactivate Account" : "Activate Account"}
                        className={`p-1.5 rounded transition-colors ${
                          account.isActive
                            ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                            : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        <Power size={15} />
                        <span className="sr-only">
                          {account.isActive ? "Deactivate" : "Activate"} {account.name}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(account)}
                        title="Delete Account"
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={15} />
                        <span className="sr-only">Delete {account.name}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (shown below md breakpoint) */}
      <div className="md:hidden space-y-3">
        {accounts.map((account) => {
          const typeInfo = getTypeBadgeStyle(account.type);
          const initVal = account.initialBalance ? parseFloat(account.initialBalance) : 0;
          const currVal = account.currentBalance ? parseFloat(account.currentBalance) : 0;
          const hasBalances = account.initialBalance !== null && account.currentBalance !== null;
          const delta = currVal - initVal;
          const deltaPct = initVal > 0 ? (delta / initVal) * 100 : 0;
          const isProfit = delta >= 0;

          return (
            <div
              key={account.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/accounts/${account.id}`}
                    className="font-semibold text-slate-100 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>{account.name}</span>
                    <ExternalLink size={13} className="text-slate-500" />
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeInfo.bg} ${typeInfo.text} ${typeInfo.border}`}
                    >
                      {typeInfo.label}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {account.currency}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    account.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      account.isActive ? "bg-emerald-400" : "bg-slate-500"
                    }`}
                  />
                  {account.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">
                    Initial Balance
                  </span>
                  <span className="font-mono text-slate-300 font-medium">
                    {account.initialBalance
                      ? parseFloat(account.initialBalance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">
                    Current Balance
                  </span>
                  <span className="font-mono text-slate-100 font-bold">
                    {account.currentBalance
                      ? parseFloat(account.currentBalance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Net P&L */}
              {hasBalances && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60 font-mono">
                  <span className="text-slate-400 text-[10px] uppercase">Net Change:</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      isProfit ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isProfit ? "+" : ""}
                    {delta.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ({isProfit ? "+" : ""}
                    {deltaPct.toFixed(1)}%)
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                <Link
                  href={`/accounts/${account.id}`}
                  className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  Details
                </Link>
                <button
                  type="button"
                  onClick={() => onEdit(account)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onToggleStatus(account)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  {account.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(account)}
                  className="px-2.5 py-1 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
