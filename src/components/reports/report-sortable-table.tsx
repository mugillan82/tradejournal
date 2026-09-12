/**
 * Reports Domain — Reusable Sortable Table Component
 *
 * Professional dark-terminal tabular view with column sorting,
 * numeric formatting, and responsive horizontal scrolling.
 */

"use client";

import React, { useState, useMemo } from "react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  getValue?: (item: T) => string | number | null | undefined;
  render?: (item: T) => React.ReactNode;
}

interface ReportSortableTableProps<T> {
  columns: ColumnDef<T>[];
  data: ReadonlyArray<T>;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  emptyMessage?: string;
  testId?: string;
}

export function ReportSortableTable<T>({
  columns,
  data,
  defaultSortKey,
  defaultSortDir = "desc",
  emptyMessage = "No report data available for current filters.",
  testId = "report-sortable-table",
}: ReportSortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey || columns[0]?.key);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);

  const handleHeaderClick = (colKey: string, sortable = true) => {
    if (!sortable) return;
    if (sortKey === colKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(colKey);
      setSortDir("desc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;

    const list = [...data];
    list.sort((a, b) => {
      const valA = col.getValue ? col.getValue(a) : (a as Record<string, unknown>)[sortKey];
      const valB = col.getValue ? col.getValue(b) : (b as Record<string, unknown>)[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const numA = typeof valA === "number" ? valA : parseFloat(String(valA));
      const numB = typeof valB === "number" ? valB : parseFloat(String(valB));

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === "asc" ? numA - numB : numB - numA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDir === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    return list;
  }, [data, columns, sortKey, sortDir]);

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-xs text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/80 shadow-sm overflow-hidden"
      data-testid={testId}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const alignClass =
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                      ? "text-center"
                      : "text-left";

                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col.key, col.sortable !== false)}
                    className={`px-3.5 py-3 select-none ${alignClass} ${
                      col.sortable !== false ? "cursor-pointer hover:text-slate-200" : ""
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1 ${
                        col.align === "right"
                          ? "justify-end"
                          : col.align === "center"
                            ? "justify-center"
                            : "justify-start"
                      }`}
                    >
                      <span>{col.label}</span>
                      {col.sortable !== false && (
                        <span className="text-[10px] text-slate-500">
                          {isSorted ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
            {sortedData.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-slate-800/40 transition-colors"
                data-testid={`report-row-${rowIdx}`}
              >
                {columns.map((col) => {
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left";

                  return (
                    <td key={col.key} className={`px-3.5 py-2.5 ${alignClass}`}>
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
