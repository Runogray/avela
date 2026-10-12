import type { Metadata } from "next";
import { Wallet } from "@/components/dote/Wallet";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return <Wallet />;
}
