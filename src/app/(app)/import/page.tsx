import { Metadata } from "next";
import { ImportCenterClientPage } from "@/components/imports/import-center-client-page";

export const metadata: Metadata = {
  title: "Trade Import Center | TradeJournal",
  description: "Import historical and ongoing trades from screenshots, CSV files, and Excel workbooks",
};

export default function ImportCenterPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <ImportCenterClientPage />
    </div>
  );
}
