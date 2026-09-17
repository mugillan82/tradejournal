/**
 * Command Palette — Stitch Obsidian Orbit Quick Launcher
 *
 * Global command bar accessible via ⌘K / Ctrl+K or search trigger.
 * Allows quick jumping to any section, running fast actions,
 * and navigating the trade journal with zero latency.
 */

"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { navigation, type NavItem } from "@/lib/navigation";
import {
  Search,
  X,
  PlusCircle,
  Wand2,
  BookOpen,
  BarChart3,
  ChevronRight,
  Sparkles,
} from "@/components/icons";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActionItem {
  id: string;
  title: string;
  category: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: string;
  description?: string;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Flatten all navigable items
  const allItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [
      {
        id: "action-new-trade",
        title: "Log New Trade",
        category: "Quick Actions",
        href: "/trades/new",
        icon: PlusCircle,
        badge: "Action",
        description: "Manually register an open or closed trade",
      },
      {
        id: "action-smart-import",
        title: "Smart Import via AI",
        category: "Quick Actions",
        href: "/import/smart",
        icon: Wand2,
        badge: "AI OCR",
        description: "Extract trades instantly from MT5 / broker screenshots",
      },
      {
        id: "action-daily-journal",
        title: "Today's Daily Journal",
        category: "Quick Actions",
        href: "/journal",
        icon: BookOpen,
        badge: "Journal",
        description: "Write pre-market and post-market session notes",
      },
      {
        id: "action-analytics",
        title: "Analytics & Edge Breakdown",
        category: "Quick Actions",
        href: "/analytics",
        icon: BarChart3,
        badge: "Insights",
        description: "Inspect win rate, profit factor, and expectancy",
      },
    ];

    navigation.forEach((section) => {
      section.items.forEach((navItem: NavItem) => {
        // avoid duplicate entries if already in quick actions
        if (!items.some((i) => i.href === navItem.href)) {
          items.push({
            id: `nav-${navItem.href}`,
            title: navItem.label,
            category: section.label,
            href: navItem.href,
            icon: navItem.icon,
            badge: navItem.status === "coming-soon" ? "Soon" : undefined,
          });
        }
      });
    });

    return items;
  }, []);

  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)),
    );
  }, [allItems, query]);

  // Reset search state when opened
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          router.push(selected.href);
          onClose();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, router, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Obsidian Orbit Command Palette"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-slate-950/60">
          <Search size={18} className="text-purple-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search destination (e.g. 'trades', 'ai', 'analytics')..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-800 border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 overscroll-contain"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matching destinations or commands for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  data-index={idx}
                  type="button"
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-100 ${
                    isSelected
                      ? "bg-purple-500/15 text-purple-200 border border-purple-500/30 shadow-sm shadow-purple-950/50"
                      : "text-slate-300 hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${
                        isSelected
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-slate-800/80 text-slate-400"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 border border-purple-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      {item.category}
                    </span>
                    {isSelected && (
                      <ChevronRight
                        size={14}
                        className="text-purple-400 flex-shrink-0"
                      />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 bg-slate-950/80 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-purple-400" />
            <span>Obsidian Orbit Quick Launcher</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline">Navigate: <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-400">↑</kbd> <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-400">↓</kbd></span>
            <span>Select: <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-400">↵</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
}
