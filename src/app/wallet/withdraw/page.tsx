import type { Metadata } from "next";
import { WalletWithdraw } from "@/components/dote/WalletWithdraw";

export const metadata: Metadata = { title: "Withdraw" };

export default function WalletWithdrawPage() {
  return <WalletWithdraw />;
}
