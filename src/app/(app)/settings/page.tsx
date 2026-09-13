import type { Metadata } from "next";
import { SettingsClientPage } from "@/components/settings/settings-client-page";

export const metadata: Metadata = {
  title: "Settings & Customization — TradeJournal",
  description:
    "Configure trading defaults, display formatting, timezone preferences, and dashboard layout.",
};

export default function SettingsPage() {
  return <SettingsClientPage />;
}
