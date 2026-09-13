"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  ChevronRight,
  ExternalLink,
  Keyboard,
} from "@/components/icons";

interface HelpTopic {
  id: string;
  category: string;
  title: string;
  description: string;
  workflow: string[];
  link?: { href: string; label: string };
  tags: string[];
}

const HELP_TOPICS: HelpTopic[] = [
  {
    id: "dashboard",
    category: "Dashboard",
    title: "Dashboard & Trading Command Center",
    description:
      "A high-density operational cockpit synthesizing real-time net P&L, win rate, profit factor, equity curve trajectory, and monthly performance.",
    workflow: [
      "Filter performance across all trading accounts or isolate a specific portfolio.",
      "Track Today's net return and current month milestones.",
      "Inspect top performing symbols, strategies, and Long vs. Short directional bias.",
      "Use 'Customize Layout' in Settings to reorder or toggle widgets to fit your screen size.",
    ],
    link: { href: "/dashboard", label: "Open Dashboard" },
    tags: ["kpi", "equity curve", "win rate", "overview", "layout"],
  },
  {
    id: "trades",
    category: "Trades",
    title: "Trade Logging & Execution Management",
    description:
      "Canonical trade records supporting multi-execution entries and exits, exact financial decimal precision, stop loss, and take profit.",
    workflow: [
      "Click 'Add Trade' to record a new position with side, entry price, quantity, and dates.",
      "Assign strategies, setups, mistakes, and tags to classify every setup.",
      "Attach broker trade confirmation receipts or chart screenshots directly.",
      "Edit or close positions as exits and partial fills occur.",
    ],
    link: { href: "/trades", label: "View Trade Log" },
    tags: ["executions", "position sizing", "stop loss", "pnl", "tags"],
  },
  {
    id: "structured-import",
    category: "Import",
    title: "Structured File Import (CSV & Excel XLSX)",
    description:
      "Import thousands of historical trades directly from broker CSV or XLSX spreadsheets with automatic delimiter detection and alias mapping.",
    workflow: [
      "Upload .csv or .xlsx exports from MetaTrader, Interactive Brokers, TradingView, or proprietary prop firms.",
      "For multi-sheet Excel files, select the specific sheet containing fill records.",
      "Review column mappings with auto-detected aliases for Symbol, Side, Quantity, Prices, and P&L.",
      "Inspect the paginated preview with server-side validation and duplicate detection before confirming.",
    ],
    link: { href: "/import/csv", label: "Open CSV & Excel Import" },
    tags: ["csv", "xlsx", "excel", "broker export", "column mapping", "preview"],
  },
  {
    id: "smart-import",
    category: "Import",
    title: "Smart Screenshot Vision Import",
    description:
      "Transform mobile or desktop trading screenshots into normalized trade candidates using OCR vision parsing.",
    workflow: [
      "Upload clean, uncropped trading app screenshots (PNG, JPG, WebP).",
      "The OCR engine extracts symbol, direction, entry/exit prices, and volume.",
      "Review detected candidates in the interactive validation grid.",
      "Confirm trades to persist directly into your trading account.",
    ],
    link: { href: "/import/smart", label: "Open Smart Import" },
    tags: ["ocr", "vision", "screenshot", "mobile app", "image"],
  },
  {
    id: "analytics",
    category: "Analytics",
    title: "Analytics Engine & Performance Metrics",
    description:
      "Rigorous calculation engine computing win rate, profit factor, average win/loss, Sharpe ratio, and multidimensional breakdowns.",
    workflow: [
      "Evaluate performance breakdown by Symbol (forex, equities, crypto, futures).",
      "Analyze win rates and net returns across designated Strategies and Setups.",
      "Audit costly behavioral patterns via the Mistakes breakdown.",
      "Filter by custom date ranges to measure monthly or quarterly progression.",
    ],
    link: { href: "/analytics", label: "Open Analytics" },
    tags: ["metrics", "profit factor", "breakdowns", "symbols", "strategies"],
  },
  {
    id: "calendar",
    category: "Calendar & Journal",
    title: "Interactive Calendar & Daily Journal",
    description:
      "Visual day-by-day P&L heatmap coupled with holistic psychological tracking of trader mood, energy, and focus.",
    workflow: [
      "Click any calendar day cell to inspect executed trades and daily net returns.",
      "Log your emotional state (Mood, Energy 1-5, Focus 1-5) to correlate psychology with performance.",
      "Write daily journal market notes and upload pre-market analysis attachments.",
      "All dates respect your configured Display Timezone in Settings.",
    ],
    link: { href: "/calendar", label: "Open Calendar" },
    tags: ["heatmap", "daily journal", "psychology", "mood", "energy"],
  },
  {
    id: "reviews",
    category: "Reviews",
    title: "Structured Trade Reviews & Retrospectives",
    description:
      "Formal self-assessment framework for post-trade debriefs, execution quality ratings, and rule adherence scoring.",
    workflow: [
      "Create a review linked to one or multiple trades using structured templates.",
      "Answer guided prompts: 'What went well?', 'What went wrong?', and 'Lessons learned'.",
      "Score your Execution Quality and Rule Adherence on a 1-5 scale.",
      "Transition review status from Draft to In Review to Completed.",
    ],
    link: { href: "/reviews", label: "Open Trade Reviews" },
    tags: ["review", "template", "retrospective", "rule adherence", "post trade"],
  },
  {
    id: "accounts",
    category: "Accounts",
    title: "Trading Accounts & Portfolios",
    description:
      "Multi-account management supporting live, prop firm, simulation, and paper trading portfolios across multiple currencies.",
    workflow: [
      "Create dedicated accounts with currency (USD, EUR, GBP, JPY, CAD, AUD).",
      "Set initial balances to accurately track equity curves and return percentages.",
      "Toggle active/inactive status to archive funded accounts without deleting historical data.",
      "Specify your preferred Default Account in Settings to streamline trade logging.",
    ],
    link: { href: "/accounts", label: "Manage Accounts" },
    tags: ["portfolio", "currencies", "balance", "paper trading", "live"],
  },
  {
    id: "data-management",
    category: "Data",
    title: "Data Management & Backups",
    description:
      "Full export capabilities ensuring you always own your historical trading data without vendor lock-in.",
    workflow: [
      "Export trade logs as clean RFC 4180 CSV with exact decimal preservation.",
      "Export relational database backups in structured JSON format.",
      "Export daily journal entries and account statements for tax or reporting purposes.",
      "Review account-scoped record counts and data hygiene stats.",
    ],
    link: { href: "/data-management", label: "Open Data Management" },
    tags: ["backup", "export", "csv", "json", "data portability"],
  },
  {
    id: "settings",
    category: "Settings",
    title: "Product Settings & Customization",
    description:
      "Centralized user configuration for timezone, regional formatting, risk rules, and custom dashboard layout.",
    workflow: [
      "Set your display timezone so all trade times, calendar cells, and charts match your local market hours.",
      "Customize dashboard widget order and hide widgets you don't need.",
      "Configure default risk percentages and default dollar risk per trade.",
      "Switch table row density between Compact, Comfortable, and Spacious.",
    ],
    link: { href: "/settings", label: "Open Settings" },
    tags: ["timezone", "date format", "theme", "density", "widgets"],
  },
];

const SHORTCUTS = [
  { key: "Ctrl / Cmd + K", description: "Quick navigation / search dialog" },
  { key: "Esc", description: "Close active modal, drawer, or dropdown" },
  { key: "Tab / Shift+Tab", description: "Navigate between interactive form inputs" },
  { key: "Enter / Space", description: "Activate buttons and toggle checkboxes" },
];

export function HelpClientPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = useMemo(() => {
    const cats = new Set(HELP_TOPICS.map((t) => t.category));
    return ["All", ...Array.from(cats)];
  }, []);

  const filteredTopics = useMemo(() => {
    return HELP_TOPICS.filter((topic) => {
      const matchesCategory =
        selectedCategory === "All" || topic.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        topic.title.toLowerCase().includes(q) ||
        topic.description.toLowerCase().includes(q) ||
        topic.category.toLowerCase().includes(q) ||
        topic.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8" data-testid="help-page">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
          <HelpCircle size={26} className="text-emerald-400" />
          Product Documentation & User Guide
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Explore workflows, trading formulas, import procedures, and platform customization.
        </p>

        {/* Search Bar */}
        <div className="mt-6 max-w-xl relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics (e.g., CSV import, timezone, profit factor)..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Topics Grid */}
      {filteredTopics.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/40">
          <p className="text-base text-slate-300 font-medium">
            No documentation topics match &quot;{searchQuery}&quot;
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Try searching for terms like &quot;import&quot;, &quot;calendar&quot;, or &quot;risk&quot;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
            className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 border border-slate-700/60">
                    {topic.category}
                  </span>
                  {topic.link && (
                    <Link
                      href={topic.link.href}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <span>{topic.link.label}</span>
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>

                <h2 className="text-base font-semibold text-slate-100">
                  {topic.title}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {topic.description}
                </p>

                {/* Workflow Checklist */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Key Workflow & Invariants:
                  </p>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {topic.workflow.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight
                          size={14}
                          className="text-emerald-500 mt-0.5 flex-shrink-0"
                        />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {topic.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-slate-500 font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Keyboard size={16} className="text-emerald-400" />
          Keyboard Accessibility & Navigation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {SHORTCUTS.map((sc) => (
            <div
              key={sc.key}
              className="p-3 rounded-lg border border-slate-800/80 bg-slate-950"
            >
              <kbd className="px-2 py-1 rounded bg-slate-800 text-[11px] font-mono text-emerald-400 font-semibold border border-slate-700">
                {sc.key}
              </kbd>
              <p className="text-xs text-slate-400 mt-2">{sc.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
