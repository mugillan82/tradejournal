/**
 * Trade Detail Route
 *
 * Route: `/trades/[id]`
 *
 * Authenticated page for inspecting, editing, and deleting a trade record.
 */

import { Suspense, use } from "react";
import { TradeDetailView } from "@/components/trades/trade-detail-view";

interface TradeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TradeDetailPage({ params }: TradeDetailPageProps) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 animate-pulse space-y-6">
            <div className="h-8 w-48 bg-slate-800 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-800/60 rounded-xl" />
              ))}
            </div>
            <div className="h-48 bg-slate-800/30 rounded-xl" />
          </div>
        </div>
      }
    >
      <TradeDetailView tradeId={id} />
    </Suspense>
  );
}
