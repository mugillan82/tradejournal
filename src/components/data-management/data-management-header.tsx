"use client";

import React from "react";
import { Database } from "@/components/icons";

export function DataManagementHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-800">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Database size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Data Management & Export
          </h1>
        </div>
        <p className="text-sm text-zinc-400">
          Control your trading journal data, review record counts, and create verified backups or CSV exports.
        </p>
      </div>
    </div>
  );
}
