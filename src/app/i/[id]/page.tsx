import type { Metadata } from "next";
import { Suspense } from "react";
import { EventOverview } from "@/components/dote/EventOverview";

export const metadata: Metadata = { title: "You're invited" };

export default function InviteOverviewPage() {
  return (
    <Suspense fallback={null}>
      <EventOverview guest />
    </Suspense>
  );
}
