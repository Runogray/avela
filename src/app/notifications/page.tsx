import type { Metadata } from "next";
import { Notifications } from "@/components/dote/Notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return <Notifications />;
}
