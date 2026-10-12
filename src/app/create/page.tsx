import type { Metadata } from "next";
import { CreateEventScreen } from "@/components/dote/CreateEventScreen";

export const metadata: Metadata = { title: "Create event" };

export default function CreatePage() {
  return <CreateEventScreen />;
}
