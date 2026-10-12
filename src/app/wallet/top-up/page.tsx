import type { Metadata } from "next";
import { WalletTopUp } from "@/components/dote/WalletTopUp";

export const metadata: Metadata = { title: "Top up" };

export default function WalletTopUpPage() {
  return <WalletTopUp />;
}
