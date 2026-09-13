"use client";

import React, { useState } from "react";
import {
  X,
  Sliders,
  RotateCcw,
  Check,
  ArrowUp,
  ArrowDown,
} from "@/components/icons";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardWidgetConfig,
} from "@/lib/trading/settings/types";
import { useSettings } from "@/components/settings/settings-provider";

interface DashboardCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardCustomizeModal({
  isOpen,
  onClose,
}: DashboardCustomizeModalProps) {
  const { preferences, updatePreferences } = useSettings();
  const currentLayout = preferences?.dashboardLayout ?? DEFAULT_DASHBOARD_LAYOUT;
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(currentLayout);
  const [prevLayout, setPrevLayout] = useState(currentLayout);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (currentLayout !== prevLayout) {
    setPrevLayout(currentLayout);
    setWidgets(currentLayout);
  }

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
    );
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === widgets.length - 1)
    ) {
      return;
    }
    const target = direction === "up" ? index - 1 : index + 1;
    const next = [...widgets];
    const temp = next[index]!;
    next[index] = next[target]!;
    next[target] = temp;

    setWidgets(next.map((w, i) => ({ ...w, order: i })));
  };

  const handleReset = () => {
    setWidgets(DEFAULT_DASHBOARD_LAYOUT);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({ dashboardLayout: widgets });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 600);
    } catch {
      // Error handled
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-dashboard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sliders size={18} />
            </div>
            <div>
              <h2
                id="customize-dashboard-title"
                className="text-base font-semibold text-slate-100"
              >
                Customize Dashboard Layout
              </h2>
              <p className="text-xs text-slate-400">
                Show, hide, and reorder widgets to fit your routine.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Widgets List */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {widgets.map((widget, idx) => (
            <div
              key={widget.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                widget.visible
                  ? "border-slate-800 bg-slate-950/80"
                  : "border-slate-800/40 bg-slate-950/40 opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`modal-widget-${widget.id}`}
                  checked={widget.visible}
                  onChange={() => handleToggle(widget.id)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                />
                <label
                  htmlFor={`modal-widget-${widget.id}`}
                  className="text-xs font-medium text-slate-200 cursor-pointer select-none"
                >
                  {widget.label}
                </label>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, "up")}
                  aria-label={`Move ${widget.label} up`}
                  className="p-1 rounded bg-slate-800/70 text-slate-400 hover:text-slate-200 disabled:opacity-25 transition-colors"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  disabled={idx === widgets.length - 1}
                  onClick={() => handleMove(idx, "down")}
                  aria-label={`Move ${widget.label} down`}
                  className="p-1 rounded bg-slate-800/70 text-slate-400 hover:text-slate-200 disabled:opacity-25 transition-colors"
                >
                  <ArrowDown size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <RotateCcw size={13} />
            Reset Layout
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : saveSuccess ? (
                <>
                  <Check size={14} />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Layout</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
