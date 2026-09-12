/**
 * Dashboard Page Route — /dashboard
 *
 * Server component wrapper for the Premium Trading Dashboard V2.
 * Enforces server-side authentication check and wraps DashboardClientPage in Suspense.
 */

import { Suspense } from "react";
import { requireServerUser } from "@/lib/auth/session";
import { DashboardClientPage } from "@/components/dashboard/dashboard-client-page";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireServerUser();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClientPage />
    </Suspense>
  );
}
