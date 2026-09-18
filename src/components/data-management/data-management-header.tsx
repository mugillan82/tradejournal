"use client";

import React from "react";
import { Database } from "@/components/icons";
import { StrokeText } from "@/components/ui/stroke-text";

export function DataManagementHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-800">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Database size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center min-h-[36px]">
            <StrokeText
              text="Data Management & Export"
              fontSize={28}
              fontWeight={700}
              strokeColor="#a855f7"
              fillColor="#f8fafc"
              strokeWidth={1.3}
              drawDuration={1.2}
              fillDelay={0.15}
              fillMode="wipe"
              trigger="mount"
              replayOnHover
            />
          </h1>
        </div>
        <p className="text-sm text-zinc-400">
          Control your trading journal data, review record counts, and create verified backups or CSV exports.
        </p>
      </div>
    </div>
  );
}
