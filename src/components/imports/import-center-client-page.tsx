"use client";

import React from "react";
import Link from "next/link";
import {
  Wand2,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImportCenterClientPage() {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Batch E Unified Import Pipeline
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Trade Import Center</h1>
          <p className="text-slate-400 mt-1.5 max-w-2xl text-sm leading-relaxed">
            Import your historical and ongoing trading activity into TradeJournal. Choose between AI vision
            screenshot recognition, structured CSV exports, or multi-sheet Excel workbooks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/trades">
            <Button variant="secondary" size="md">
              View Trades
            </Button>
          </Link>
          <Link href="/trades/new">
            <Button variant="ghost" size="md">
              Manual Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Import Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Smart Import */}
        <div className="relative group rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-6 flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/20 transition-all duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform duration-200">
                <Wand2 className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <Sparkles className="w-3 h-3" /> AI Vision
              </span>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                Smart Screenshot Import
              </h2>
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                Extract trades automatically from broker order logs, charts, and mobile terminal screenshots.
                Preserves source image as permanent trade evidence.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Supported Formats</span>
                <span className="font-mono text-slate-300">PNG, JPG, WEBP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Max File Size</span>
                <span className="font-mono text-slate-300">10 MB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Broker Support</span>
                <span className="text-slate-300">MT4/5, cTrader, TradingView</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/import/smart" className="block w-full">
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-between group-hover:border-purple-500/30 group-hover:bg-purple-950/20 group-hover:text-white"
              >
                <span>Launch Smart Agent</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Card 2: CSV Import */}
        <div className="relative group rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-6 flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/20 transition-all duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform duration-200">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Zap className="w-3 h-3" /> High Performance
              </span>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                CSV Spreadsheet Import
              </h2>
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                Streamlined tabular import for CSV exports. Auto-detects delimiters (comma, semicolon, tab),
                cleans UTF-8 BOM, maps columns dynamically, and validates records.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Supported Formats</span>
                <span className="font-mono text-slate-300">.csv (UTF-8)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Delimiters</span>
                <span className="font-mono text-slate-300">Auto (, ; \t)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Capacity</span>
                <span className="text-slate-300">Up to 50,000+ trades</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/import/csv" className="block w-full">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-between"
              >
                <span>Import CSV File</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Card 3: Excel XLSX Import */}
        <div className="relative group rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-6 flex flex-col justify-between hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-950/20 transition-all duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform duration-200">
                <Layers className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <ShieldCheck className="w-3 h-3" /> Multi-Sheet Safe
              </span>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
                Excel (.xlsx) Import
              </h2>
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                Production-grade OpenXML workbook parser. Allows worksheet selection, detects headers,
                preserves exact financial decimals, and guarantees zero macro execution.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Supported Formats</span>
                <span className="font-mono text-slate-300">.xlsx</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sheet Switching</span>
                <span className="text-slate-300">Interactive Selector</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Security</span>
                <span className="text-slate-300">ZIP Magic Bytes Check</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/import/csv?format=xlsx" className="block w-full">
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-between group-hover:border-cyan-500/30 group-hover:bg-cyan-950/20 group-hover:text-white"
              >
                <span>Import Excel Workbook</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Import Security & Trust Architecture Overview */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Production-Grade Import Pipeline Guarantees</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Every imported trade conforms to strict security, accounting, and ownership invariants.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Account Ownership
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              All imports verify account ownership authoritatively on the server. Foreign account IDs are strictly rejected.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Exact Duplicate Detection
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dynamic date-window duplicate engine compares date, symbol, side, and price to prevent accidental double-counting.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Decimal Financial Precision
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prices, sizes, and P&L strings are preserved through Decimal conventions without JavaScript floating-point errors.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Full Analytics Sync
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Persisted via canonical Trade Service, immediately updating Dashboard, Reports, Calendar, and Tag analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
