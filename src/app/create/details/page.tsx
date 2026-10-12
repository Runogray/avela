import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateEventFlow } from "@/components/dote/CreateEventFlow";

export const metadata: Metadata = { title: "Set up your event" };

export default function CreateDetailsPage() {
  return (
    <Suspense fallback={null}>
      <CreateEventFlow />
    </Suspense>
  );
}
