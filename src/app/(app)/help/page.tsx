import type { Metadata } from "next";
import { HelpClientPage } from "@/components/help/help-client-page";

export const metadata: Metadata = {
  title: "Documentation & User Guide — TradeJournal",
  description:
    "Comprehensive guides, trading workflow checklists, import tutorials, and keyboard shortcuts.",
};

export default function HelpPage() {
  return <HelpClientPage />;
}
