/**
 * Trade Skeleton Loading Component
 *
 * Polished loading state matching table and card layouts.
 */

export function TradeSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Desktop Table Skeleton */}
      <div className="hidden md:block rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
        <div className="h-10 bg-slate-900/80 border-b border-slate-800" />
        <div className="divide-y divide-slate-800/60">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 px-4 flex items-center justify-between gap-4">
              <div className="h-4 w-24 bg-slate-800/80 rounded" />
              <div className="h-4 w-32 bg-slate-800/60 rounded" />
              <div className="h-4 w-20 bg-slate-800/60 rounded" />
              <div className="h-4 w-12 bg-slate-800/80 rounded" />
              <div className="h-4 w-16 bg-slate-800/60 rounded" />
              <div className="h-4 w-16 bg-slate-800/60 rounded" />
              <div className="h-4 w-20 bg-slate-800/80 rounded" />
              <div className="h-4 w-14 bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card Skeleton */}
      <div className="md:hidden space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-slate-800 rounded" />
              <div className="h-4 w-16 bg-slate-800 rounded" />
            </div>
            <div className="h-3 w-40 bg-slate-800/60 rounded" />
            <div className="h-4 w-full bg-slate-800/40 rounded pt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
