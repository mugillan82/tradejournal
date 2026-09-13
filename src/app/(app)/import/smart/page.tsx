import { Metadata } from "next";
import { SmartImportClientPage } from "@/components/imports/smart-import-client-page";

export const metadata: Metadata = {
  title: "Smart Import | TradeJournal",
  description: "Import trades automatically from screenshots",
};

export default function SmartImportPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Smart Import</h1>
        <p className="text-muted-foreground mt-2">
          Upload a trading screenshot and let the Smart Agent extract your trades.
        </p>
      </div>
      <SmartImportClientPage />
    </div>
  );
}
