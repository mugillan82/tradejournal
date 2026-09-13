import { Metadata } from "next";
import { StructuredImportClientPage } from "@/components/imports/structured-import-client-page";

export const metadata: Metadata = {
  title: "Structured File Import | TradeJournal",
  description: "Import trades from CSV and Excel (.xlsx) files with automated column mapping and duplicate detection",
};

export default function StructuredImportPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <StructuredImportClientPage />
    </div>
  );
}
