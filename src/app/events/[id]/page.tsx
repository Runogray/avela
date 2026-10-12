import type { Metadata } from "next";
import { Suspense } from "react";
import { EventOverview } from "@/components/dote/EventOverview";

export const metadata: Metadata = { title: "Event overview" };

export default function EventOverviewPage() {
  return (
    <Suspense fallback={null}>
      <EventOverview />
    </Suspense>
  );
}
