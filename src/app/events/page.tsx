import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsHome } from "@/components/dote/EventsHome";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <Suspense fallback={null}>
      <EventsHome />
    </Suspense>
  );
}
