import type { Metadata } from "next";
import { WalletTransactions } from "@/components/dote/WalletTransactions";

export const metadata: Metadata = { title: "Transactions" };

export default function WalletTransactionsPage() {
  return <WalletTransactions />;
}
