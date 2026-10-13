import type { Metadata } from "next";
import { Suspense } from "react";
import { WalletWithdraw } from "@/components/dote/WalletWithdraw";

export const metadata: Metadata = { title: "Withdraw" };

export default function WalletWithdrawPage() {
  return (
    <Suspense fallback={null}>
      <WalletWithdraw />
    </Suspense>
  );
}
