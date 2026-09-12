/**
 * TradeJournal — Calendar Page Route
 *
 * Route: /calendar
 * Server component wrapper providing metadata and Suspense boundary.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarClientPage } from "@/components/calendar/calendar-client-page";
import { CalendarSkeleton } from "@/components/calendar/calendar-skeleton";

export const metadata: Metadata = {
  title: "Trading Calendar | TradeJournal",
  description: "Monthly trading performance calendar and daily journal activity.",
};

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarClientPage />
    </Suspense>
  );
}
