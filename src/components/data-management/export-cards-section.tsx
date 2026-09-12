"use client";

import React, { useState } from "react";
import type { ExportDataset, ExportFormat } from "@/lib/client/data-management";
import { Download, Loader2, LineChart, Wallet, BookOpen, Database, ShieldCheck } from "@/components/icons";

interface ExportCardsSectionProps {
  onExport: (dataset: ExportDataset, format: ExportFormat) => Promise<void>;
  isExporting: boolean;
  activeDataset: ExportDataset | null;
}

interface ExportConfig {
  id: ExportDataset;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  supportedFormats: ExportFormat[];
  defaultFormat: ExportFormat;
  badge?: string;
}

export function ExportCardsSection({
  onExport,
  isExporting,
  activeDataset,
}: ExportCardsSectionProps) {
  const [formats, setFormats] = useState<Record<ExportDataset, ExportFormat>>({
    trades: "csv",
    accounts: "csv",
    journal: "csv",
    full: "json",
  });

  const handleFormatChange = (dataset: ExportDataset, format: ExportFormat) => {
    setFormats((prev) => ({ ...prev, [dataset]: format }));
  };

  const cards: ExportConfig[] = [
    {
      id: "trades",
      title: "Trades Export",
      description: "Export full trade history with entry/exit prices, exact Decimal P&L, fees, strategies, setups, mistakes, and tags.",
      icon: LineChart,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      supportedFormats: ["csv", "json"],
      defaultFormat: "csv",
    },
    {
      id: "accounts",
      title: "Trading Accounts",
      description: "Export all trading accounts, account types, native currencies, initial balances, current balances, and trade counts.",
      icon: Wallet,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      supportedFormats: ["csv", "json"],
      defaultFormat: "csv",
    },
    {
      id: "journal",
      title: "Journal & Reflections",
      description: "Export daily journal entries, psychological mood logs, energy/focus ratings, notes, and attachment references.",
      icon: BookOpen,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      supportedFormats: ["csv", "json"],
      defaultFormat: "csv",
    },
    {
      id: "full",
      title: "Complete System Backup",
      description: "Comprehensive structured JSON backup containing all user-owned accounts, trades, executions, classifications, reviews, and attachment metadata.",
      icon: Database,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      supportedFormats: ["json"],
      defaultFormat: "json",
      badge: "Recommended for Backup",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-zinc-200">
            Export Center
          </h2>
          <p className="text-xs text-zinc-400">
            Generate sanitized, verifiable exports in CSV or JSON format
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => {
          const IconComp = card.icon;
          const currentFormat = formats[card.id] || card.defaultFormat;
          const isThisExporting = isExporting && activeDataset === card.id;

          return (
            <div
              key={card.id}
              data-testid={`export-card-${card.id}`}
              className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg border ${card.color}`}>
                      <IconComp size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        {card.title}
                        {card.badge && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                            {card.badge}
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-zinc-400 font-mono">
                        {currentFormat.toUpperCase()} Format
                      </span>
                    </div>
                  </div>

                  {card.supportedFormats.length > 1 && (
                    <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                      {card.supportedFormats.map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          disabled={isExporting}
                          onClick={() => handleFormatChange(card.id, fmt)}
                          className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                            currentFormat === fmt
                              ? "bg-zinc-800 text-emerald-400 font-medium shadow-sm"
                              : "text-zinc-400 hover:text-zinc-200"
                          } disabled:opacity-50`}
                          aria-label={`Select ${fmt.toUpperCase()} for ${card.title}`}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Verified User Isolated</span>
                </div>

                <button
                  type="button"
                  data-testid={`export-btn-${card.id}`}
                  disabled={isExporting}
                  onClick={() => onExport(card.id, currentFormat)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-zinc-950 font-medium text-xs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isThisExporting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Download {currentFormat.toUpperCase()}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
