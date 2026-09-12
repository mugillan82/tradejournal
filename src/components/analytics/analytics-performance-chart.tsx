/**
 * Analytics Domain — Performance Equity Curve Chart Component
 *
 * Responsive SVG chart visualizing cumulative P&L progression trade-by-trade.
 * Features:
 * - Interactive hover cursor & tooltip
 * - Dynamic zero baseline & peak markers
 * - Positive/negative gradient area fills
 * - Mobile responsive scaling
 */

"use client";

import React, { useState, useMemo, useRef } from "react";
import type { EquityCurvePointDto } from "@/lib/client/analytics";

interface AnalyticsPerformanceChartProps {
  equityCurve: ReadonlyArray<EquityCurvePointDto>;
  hasInitialBalance?: boolean;
}

function formatTooltipCurrency(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "$0.00";
  const num = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(num)) return "$0.00";
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return isNeg ? `-${formatted}` : formatted;
}

export function AnalyticsPerformanceChart({
  equityCurve,
  hasInitialBalance = false,
}: AnalyticsPerformanceChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse points into numerical coordinates
  const chartData = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) return null;

    const points = equityCurve.map((pt, idx) => {
      const cumPnl = parseFloat(pt.cumulativePnl) || 0;
      const netPnl = parseFloat(pt.netPnl) || 0;
      const equity = pt.equity ? parseFloat(pt.equity) : null;
      const drawdown = parseFloat(pt.drawdown) || 0;
      return {
        idx,
        tradeId: pt.tradeId,
        date: pt.exitDate ? new Date(pt.exitDate) : new Date(),
        cumPnl,
        netPnl,
        equity,
        drawdown,
      };
    });

    // Min and Max values for Y scale
    const values = points.map((p) => p.cumPnl);
    let minVal = Math.min(0, ...values);
    let maxVal = Math.max(0, ...values);

    // Add 10% padding to Y bounds
    const range = maxVal - minVal || 100;
    minVal -= range * 0.08;
    maxVal += range * 0.08;

    return { points, minVal, maxVal, range: maxVal - minVal };
  }, [equityCurve]);

  if (!chartData || chartData.points.length === 0) {
    return (
      <div
        className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col items-center justify-center min-h-[320px] text-center"
        data-testid="analytics-chart-empty"
      >
        <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-200">No Closed Trades Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Performance and equity curves will appear automatically once closed trades with realized P&L are recorded.
        </p>
      </div>
    );
  }

  const { points, minVal, maxVal, range } = chartData;
  const totalPoints = points.length;

  // ViewBox dimensions
  const vbWidth = 800;
  const vbHeight = 320;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 40;

  const plotWidth = vbWidth - padLeft - padRight;
  const plotHeight = vbHeight - padTop - padBottom;

  // Map value to Y coordinate
  const getY = (val: number) => {
    const norm = (val - minVal) / range;
    return padTop + plotHeight * (1 - norm);
  };

  // Map index to X coordinate
  const getX = (idx: number) => {
    if (totalPoints <= 1) return padLeft + plotWidth / 2;
    return padLeft + (idx / (totalPoints - 1)) * plotWidth;
  };

  // Build SVG path
  const pathD = points.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getY(pt.cumPnl);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  // Build closed Area path
  const zeroY = getY(0);
  const firstX = getX(0);
  const lastX = getX(totalPoints - 1);
  const areaD = `${pathD} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;

  // Determine dominant curve trend (overall positive or negative)
  const finalCumPnl = points[points.length - 1].cumPnl;
  const isOverallPositive = finalCumPnl >= 0;

  // Hover detection handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (relX - padLeft * (rect.width / vbWidth)) / (plotWidth * (rect.width / vbWidth))));
    const index = Math.round(ratio * (totalPoints - 1));
    setHoverIndex(Math.max(0, Math.min(totalPoints - 1, index)));
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  // Y-axis tick values (5 ticks)
  const yTicks = [
    maxVal,
    maxVal * 0.5 + minVal * 0.5,
    0,
    minVal * 0.5,
    minVal,
  ].filter((v, idx, arr) => arr.findIndex((x) => Math.abs(x - v) < range * 0.05) === idx);

  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-sm"
      data-testid="analytics-performance-chart"
      ref={containerRef}
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span>Cumulative Realized P&L</span>
            <span
              className={`text-xs font-mono font-bold ${
                isOverallPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatTooltipCurrency(finalCumPnl)}
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            Chronological performance progression over {totalPoints} closed trades
          </p>
        </div>

        {hoveredPoint && (
          <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <span className="text-slate-400">
              Trade #{hoveredPoint.idx + 1}:
            </span>
            <span
              className={`font-mono font-semibold ${
                hoveredPoint.netPnl > 0
                  ? "text-emerald-400"
                  : hoveredPoint.netPnl < 0
                  ? "text-rose-400"
                  : "text-slate-300"
              }`}
            >
              {hoveredPoint.netPnl > 0 ? "+" : ""}
              {formatTooltipCurrency(hoveredPoint.netPnl)}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">
              Total:{" "}
              <strong className="text-slate-200 font-mono">
                {formatTooltipCurrency(hoveredPoint.cumPnl)}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full aspect-[2.6/1] min-h-[220px]">
        <svg
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          className="w-full h-full overflow-visible select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role="img"
          aria-label="Performance equity curve chart showing cumulative profit and loss"
        >
          <defs>
            <linearGradient id="areaGradientPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="areaGradientNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={vbWidth - padRight}
                  y2={y}
                  stroke={val === 0 ? "#475569" : "#1e293b"}
                  strokeWidth={val === 0 ? 1.5 : 1}
                  strokeDasharray={val === 0 ? undefined : "3 3"}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  className="text-[10px] font-mono select-none"
                >
                  {formatTooltipCurrency(val)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaD}
            fill={isOverallPositive ? "url(#areaGradientPos)" : "url(#areaGradientNeg)"}
          />

          {/* Main trendline */}
          <path
            d={pathD}
            fill="none"
            stroke={isOverallPositive ? "#10b981" : "#f43f5e"}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover indicator */}
          {hoverIndex !== null && hoveredPoint && (
            <g>
              {/* Vertical line */}
              <line
                x1={getX(hoverIndex)}
                y1={padTop}
                x2={getX(hoverIndex)}
                y2={vbHeight - padBottom}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="2 2"
              />

              {/* Point circle */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hoveredPoint.cumPnl)}
                r={5.5}
                fill="#0f172a"
                stroke={hoveredPoint.netPnl >= 0 ? "#10b981" : "#f43f5e"}
                strokeWidth={2.5}
              />
            </g>
          )}

          {/* X Axis Date Labels */}
          {points.length > 0 && (
            <g fill="#64748b" className="text-[10px] font-mono select-none">
              <text x={padLeft} y={vbHeight - padBottom + 18} textAnchor="start">
                {points[0].date.toISOString().slice(0, 10)}
              </text>
              {points.length > 2 && (
                <text
                  x={padLeft + plotWidth / 2}
                  y={vbHeight - padBottom + 18}
                  textAnchor="middle"
                >
                  {points[Math.floor(points.length / 2)].date.toISOString().slice(0, 10)}
                </text>
              )}
              <text
                x={vbWidth - padRight}
                y={vbHeight - padBottom + 18}
                textAnchor="end"
              >
                {points[points.length - 1].date.toISOString().slice(0, 10)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Footer Details */}
      {hoveredPoint && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <div>
            Exit Date:{" "}
            <span className="text-slate-200 font-mono">
              {hoveredPoint.date.toLocaleString()}
            </span>
          </div>
          {hasInitialBalance && hoveredPoint.equity !== null && (
            <div>
              Account Equity:{" "}
              <span className="text-cyan-400 font-mono font-medium">
                {formatTooltipCurrency(hoveredPoint.equity)}
              </span>
            </div>
          )}
          <div>
            Drawdown from Peak:{" "}
            <span className="text-rose-400 font-mono font-medium">
              {formatTooltipCurrency(hoveredPoint.drawdown)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
