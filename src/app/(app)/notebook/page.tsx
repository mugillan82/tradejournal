/**
 * Notebook Page — Route Component
 *
 * Route: `/notebook`
 *
 * Grounded in the Journal domain foundation, providing quick access
 * to trader reflection and execution logs.
 */

import { DailyJournalView } from "@/components/journal/daily-journal-view";

export default function NotebookPage() {
  return <DailyJournalView />;
}
