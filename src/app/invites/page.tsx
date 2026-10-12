import type { Metadata } from "next";
import { Invites } from "@/components/dote/Invites";

export const metadata: Metadata = { title: "Invites" };

export default function InvitesPage() {
  return <Invites />;
}
