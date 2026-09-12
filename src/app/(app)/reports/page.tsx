/**
 * TradeJournal — Performance Reports Route
 *
 * Route: /reports
 * Server component wrapper providing metadata and Suspense boundary.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { ReportsClientPage } from "@/components/reports/reports-client-page";
import { ReportsSkeleton } from "@/components/reports/reports-skeleton";

export const metadata: Metadata = {
  title: "Performance Reports | TradeJournal",
  description: "Advanced multi-dimensional performance reports and trade analytics.",
};

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <ReportsClientPage />
    </Suspense>
  );
}
