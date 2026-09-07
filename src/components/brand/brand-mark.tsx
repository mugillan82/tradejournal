/**
 * TradeJournal Brand Mark
 *
 * Wordmark + monogram for the TradeJournal authentication pages.
 * Compact logo designed for dark trading/analytics aesthetic.
 */

interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

export function BrandMark({ size = "md", showWordmark = true }: BrandMarkProps) {
  const monogramSize = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  }[size];

  const wordmarkSize = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  }[size];

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${monogramSize} relative rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/40`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-1/2 h-1/2 text-slate-950"
        >
          <path
            d="M3 17L9 11L13 15L21 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 7H21V14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <span
          className={`${wordmarkSize} font-semibold tracking-tight text-slate-100`}
        >
          TradeJournal
        </span>
      )}
    </div>
  );
}
