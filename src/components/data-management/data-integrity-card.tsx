"use client";

import React from "react";
import { ShieldCheck, Activity, Wallet, FileText } from "@/components/icons";

export function DataIntegrityCard() {
  const guarantees = [
    {
      title: "Exact Decimal Precision",
      description: "All monetary values and trade prices are serialized with zero floating-point rounding errors.",
      icon: Activity,
    },
    {
      title: "Multi-Currency Isolation",
      description: "Account currencies remain discrete. Values in USD, EUR, or GBP are never mixed or aggregated unsafely.",
      icon: Wallet,
    },
    {
      title: "Zero Credential Leakage",
      description: "Password hashes, session cookies, OAuth secrets, and auth tokens are strictly excluded from exports.",
      icon: ShieldCheck,
    },
    {
      title: "Attachment Metadata",
      description: "Full backups contain canonical attachment metadata records rather than raw binary blobs.",
      icon: FileText,
    },
  ];

  return (
    <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-zinc-200">
          Data Integrity & Export Guarantees
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {guarantees.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                <IconComp size={14} className="text-emerald-400" />
                <span>{item.title}</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
