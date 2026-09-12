import { Metadata } from "next";
import { DataManagementClientPage } from "@/components/data-management/data-management-client-page";

export const metadata: Metadata = {
  title: "Data Management & Export | TradeJournal",
  description: "Manage your journal data, review record counts, and download verified CSV or JSON backups.",
};

export default function DataManagementPage() {
  return <DataManagementClientPage />;
}
