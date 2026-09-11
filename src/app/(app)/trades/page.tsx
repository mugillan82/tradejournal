/**
 * Trades Page — Server Component Wrapper
 *
 * Route: `/trades`
 * Renders `TradesClientPage` which handles interactive data loading via `/api/trades`.
 */

import { Suspense } from "react";
import { TradesClientPage } from "@/components/trades/trades-client-page";
import { TradeSkeleton } from "@/components/trades/trade-skeleton";

export default function TradesPage() {
  return (
    <Suspense fallback={<div className="p-6 max-w-7xl mx-auto"><TradeSkeleton /></div>}>
      <TradesClientPage />
    </Suspense>
  );
}
