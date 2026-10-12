import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateEventFlow } from "@/components/dote/CreateEventFlow";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <CreateEventFlow editId={id} />
    </Suspense>
  );
}
