"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackArrow } from "./BackArrow";
import { TX, TxRow, TxDetailsSheet, ledgerToTx, type Tx } from "./Wallet";
import { getTransactions } from "@/lib/wallet";

/* ------------------------------------------------------------------ *
 * Dote, Wallet Transactions list (mobile, Figma 14552:16710). Filter
 * tabs (All / Money in / Money Out) + month-grouped rows + a tap-to-
 * open Transaction details sheet (14552:16752).
 * ------------------------------------------------------------------ */

// A few older entries so the month grouping is visible (page-only; the
// Wallet home keeps just TX).
const OLDER: Tx[] = [
  { id: "a1", title: "Cash gift", status: "Successful", sub: "From - Amara Okafor", amount: 150000, dir: "in", date: "Aug 28, 2026 09:10", kind: "gift" },
  { id: "a2", title: "Withdraw", status: "Successful", sub: "Access bank - 09182652798", amount: 80000, dir: "out", date: "Aug 20, 2026 16:40", kind: "withdraw" },
  { id: "a3", title: "Top up", status: "Pending", sub: "Wallet top-up", amount: 500000, dir: "in", date: "Aug 12, 2026 11:05", kind: "topup" },
];
const ALL = [...TX, ...OLDER];

const MONTHS: Record<string, string> = {
  Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June",
  Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December",
};
function monthKey(date: string): string {
  const parts = date.split(" ");
  return `${MONTHS[parts[0]] ?? parts[0]} ${parts[2] ?? ""}`.trim();
}

export function WalletTransactions() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [active, setActive] = useState<Tx | null>(null);
  const [all, setAll] = useState<Tx[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ledger = await getTransactions();
        if (alive) setAll(ledger.map(ledgerToTx).filter((t): t is Tx => t !== null));
      } catch {
        if (alive) setAll(ALL); // offline fallback
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = all.filter((t) => filter === "all" || t.dir === filter);
  // group preserving order
  const groups: { month: string; items: Tx[] }[] = [];
  for (const t of rows) {
    const m = monthKey(t.date);
    const g = groups.find((x) => x.month === m);
    if (g) g.items.push(t);
    else groups.push({ month: m, items: [t] });
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-dote">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
        {/* header */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-[18px]">
          <span className="justify-self-start">
            <button
              type="button"
              onClick={() => router.push("/wallet")}
              aria-label="Back"
              className="grid place-items-center rounded-[10px] border border-teal bg-[#cbf5ff]/30 p-[6px]"
            >
              <BackArrow className="size-4 text-teal" />
            </button>
          </span>
          <p className="text-[16px] font-semibold tracking-[0.2px] text-[#0e0e0e]">Transactions</p>
          <span />
        </header>

        {/* filter tabs */}
        <div className="flex items-center gap-3 px-6 pt-2">
          {([["all", "All"], ["in", "Money in"], ["out", "Money Out"]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-[22px] px-4 py-[11px] text-[12px] font-medium tracking-[-0.24px] transition ${
                filter === k ? "bg-[#00c0e8] text-white" : "bg-[#f3f3f3]/70 text-[#525252] hover:bg-[#ececec]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* grouped rows */}
        <div className="flex-1 px-6 pb-8 pt-5">
          {groups.length === 0 && (
            <p className="py-16 text-center text-[14px] text-[#8a8177]">No transactions in this filter.</p>
          )}
          {groups.map((g) => (
            <div key={g.month} className="mb-2">
              <p className="py-2 text-[16px] font-medium tracking-[-0.32px] text-[#7f7f7f]">{g.month}</p>
              <div className="flex flex-col">
                {g.items.map((t) => (
                  <TxRow key={t.id} tx={t} onClick={() => setActive(t)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {active && <TxDetailsSheet tx={active} onClose={() => setActive(null)} />}
    </div>
  );
}

