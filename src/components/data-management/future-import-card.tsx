"use client";

import React from "react";
import { Wand2, FileSpreadsheet } from "@/components/icons";

export function FutureImportCard() {
  return (
    <div className="p-5 rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-300">
              Data Import Center
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
              Upcoming Step
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Import capabilities will allow importing trade logs from broker exports and broker platforms.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-lg bg-zinc-950/40 border border-zinc-800/40 flex items-start gap-3 opacity-75">
          <div className="p-2 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
            <Wand2 size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-300">Smart Import</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Automated broker statement parsing and execution matching.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-zinc-950/40 border border-zinc-800/40 flex items-start gap-3 opacity-75">
          <div className="p-2 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
            <FileSpreadsheet size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-300">CSV Import</h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Custom column mapping for generic CSV spreadsheets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
