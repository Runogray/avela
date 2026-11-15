import type { Metadata } from "next";
import { GuestGift } from "@/components/dote/GuestGift";

// A guest's private gift page: keep it out of search results.
export const metadata: Metadata = { title: "Your gift", robots: { index: false, follow: false } };

export default async function GuestGiftPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestGift token={token} />;
}
