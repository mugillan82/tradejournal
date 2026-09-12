/**
 * Analytics Page — Server Component Wrapper
 *
 * Route: `/analytics`
 * Renders `AnalyticsClientPage` which handles interactive data loading via `/api/analytics/overview`.
 */

import { Suspense } from "react";
import { AnalyticsClientPage } from "@/components/analytics/analytics-client-page";
import { AnalyticsSkeleton } from "@/components/analytics/analytics-skeleton";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsClientPage />
    </Suspense>
  );
}
