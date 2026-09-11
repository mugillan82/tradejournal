/**
 * Add Trade Page — Route Wrapper
 *
 * Route: `/trades/new`
 * Renders the production-grade `AddTradeForm` client component.
 */

import { Suspense } from "react";
import { AddTradeForm } from "@/components/trades/add-trade-form";
import { TradeSkeleton } from "@/components/trades/trade-skeleton";

export default function AddTradePage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto">
          <TradeSkeleton />
        </div>
      }
    >
      <AddTradeForm />
    </Suspense>
  );
}
