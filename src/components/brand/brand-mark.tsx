/**
 * TradeJournal Brand Mark — Stitch Obsidian Orbit Edition
 *
 * Wordmark + Orbital monogram for TradeJournal.
 * Features concentric orbital rings, glowing emerald nucleus,
 * and high-precision tracking typography.
 */

import { GlitchText } from "@/components/ui/glitch-text";

interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  subtitle?: string;
}

export function BrandMark({
  size = "md",
  showWordmark = true,
  subtitle,
}: BrandMarkProps) {
  const monogramSize = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  }[size];

  const wordmarkSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  }[size];

  const glitchOffset = {
    sm: 1.2,
    md: 1.5,
    lg: 2,
  }[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Orbital Monogram */}
      <div
        className={`${monogramSize} relative rounded-xl bg-gradient-to-b from-slate-900 via-slate-950 to-black p-0.5 shadow-lg shadow-black/50 border border-purple-500/30 flex items-center justify-center group overflow-hidden`}
        aria-hidden="true"
      >
        {/* Ambient Orbit Glow Backing */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-violet-500/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Orbit Rings & Trajectory Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/5 h-3/5 relative z-10 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]"
        >
          {/* Orbital Ellipse */}
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="4.5"
            transform="rotate(-28 12 12)"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="2 2"
            className="text-purple-500/50"
          />
          {/* Trading Surge Vector */}
          <path
            d="M5 16L10 11L14 15L20 8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Upward Vector Arrow */}
          <path
            d="M15 8H20V13"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Glowing Nucleus Planet */}
          <circle
            cx="10"
            cy="11"
            r="1.75"
            fill="#c084fc"
            className="animate-pulse"
          />
        </svg>

        {/* Outer orbital border glow */}
        <div className="absolute -inset-0.5 rounded-xl bg-purple-500/20 opacity-0 group-hover:opacity-100 blur-[2px] transition-opacity duration-300 -z-10" />
      </div>

      {/* Wordmark & Subtitle */}
      {showWordmark && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <GlitchText
              speed={1.35}
              offset={glitchOffset}
              text="KAIVO"
              className={`${wordmarkSize} font-bold tracking-tight text-slate-100`}
            >
              KAI<span className="text-purple-400">VO</span>
            </GlitchText>
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 font-semibold">
              Orbit
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] text-slate-500 tracking-wide">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
