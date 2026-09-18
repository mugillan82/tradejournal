import { Metadata } from "next";
import { SmartImportClientPage } from "@/components/imports/smart-import-client-page";
import { StrokeText } from "@/components/ui/stroke-text";

export const metadata: Metadata = {
  title: "Smart Import | TradeJournal",
  description: "Import trades automatically from screenshots",
};

export default function SmartImportPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center min-h-[38px]">
          <StrokeText
            text="Smart Import"
            fontSize={28}
            fontWeight={700}
            strokeColor="#a855f7"
            fillColor="#f8fafc"
            strokeWidth={1.3}
            drawDuration={1.2}
            fillDelay={0.15}
            fillMode="wipe"
            trigger="mount"
            replayOnHover
          />
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload a trading screenshot and let the Smart Agent extract your trades.
        </p>
      </div>
      <SmartImportClientPage />
    </div>
  );
}
