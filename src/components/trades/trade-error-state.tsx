/**
 * Trade Error State Component
 *
 * User-facing network/API failure alert with retry button.
 * Does not expose raw stack traces or internal DB details.
 */

import { AlertCircle, RefreshCw } from "@/components/icons";

interface TradeErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function TradeErrorState({ message, onRetry }: TradeErrorStateProps) {
  const safeMessage = message || "An unexpected error occurred while loading your trade records.";

  return (
    <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-6 sm:p-8 text-center my-6">
      <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 mb-4">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-base font-semibold text-rose-200">Unable to Load Trades</h3>
      <p className="mt-1 text-sm text-rose-300/80 max-w-md mx-auto">
        {safeMessage}
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}
