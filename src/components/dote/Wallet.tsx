"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTransactions, getWallet, type LedgerEntry } from "@/lib/wallet";
import { BottomNav } from "./BottomNav";
import { TopBar, Sidebar } from "./EventsHome";
import { WalletTopUp } from "./WalletTopUp";
import { WalletWithdraw } from "./WalletWithdraw";

/* ------------------------------------------------------------------ *
 * Dote, Wallet (mobile, Figma 14552:16405). Host's wallet: balance
 * card + Top up / Withdraw / Share actions + transaction history.
 * ------------------------------------------------------------------ */

const SCREEN_BG =
  "linear-gradient(150.9deg, #FFFEF7 0.85%, #F8F5FF 41.76%, #FAFEFF 74.51%)";

export type TxKind = "gift" | "topup" | "withdraw" | "refund";
export type Tx = {
  id: string;
  title: string;
  status: "Successful" | "Pending";
  sub: string;
  amount: number;
  dir: "in" | "out";
  date: string;
  kind: TxKind;
};

export const TX: Tx[] = [
  { id: "1", title: "Bone straight wig", status: "Successful", sub: "From - Joseph Inyang", amount: 300000, dir: "in", date: "Sep 10, 2026 21:20", kind: "gift" },
  { id: "2", title: "Car", status: "Successful", sub: "From - Joseph Inyang", amount: 300000, dir: "in", date: "Sep 10, 2026 21:20", kind: "gift" },
  { id: "3", title: "Cash gift", status: "Successful", sub: "From - Joseph Inyang", amount: 300000, dir: "in", date: "Sep 10, 2026 21:20", kind: "gift" },
  { id: "4", title: "Top up", status: "Successful", sub: "Wallet top-up", amount: 1200000, dir: "in", date: "Sep 15, 2026 11:20", kind: "topup" },
  { id: "5", title: "Withdraw", status: "Successful", sub: "Access bank - 09182652798", amount: 120000, dir: "out", date: "Sep 12, 2026 14:20", kind: "withdraw" },
  { id: "6", title: "Bone straight wig", status: "Successful", sub: "From - Joseph Inyang", amount: 250000, dir: "in", date: "Sep 10, 2026 21:20", kind: "gift" },
  { id: "7", title: "Refund", status: "Successful", sub: "Send to - wallet", amount: 30500, dir: "in", date: "Sep 10, 2026 10:20", kind: "refund" },
];

const KIND_STYLE: Record<TxKind, { bg: string; color: string }> = {
  gift: { bg: "#dffcff", color: "#00829f" },
  topup: { bg: "#dffcff", color: "#00829f" },
  withdraw: { bg: "#fff0df", color: "#e8872e" },
  refund: { bg: "#ffdada", color: "#ff4848" },
};

const BALANCE = 24000;

/** Map a backend ledger entry to the UI Tx shape (kobo → naira). Returns null
 * for internal entries (settle/fee) we don't surface as their own rows. */
export function ledgerToTx(e: LedgerEntry): Tx | null {
  const MAP: Partial<Record<LedgerEntry["kind"], { kind: TxKind; title: string }>> = {
    gift_in: { kind: "gift", title: "Gift received" },
    withdrawal: { kind: "withdraw", title: "Withdraw" },
    reversal: { kind: "refund", title: "Refund" },
  };
  const m = MAP[e.kind];
  if (!m) return null;
  const d = new Date(e.created_at);
  return {
    id: e.id,
    title: m.title,
    status: "Successful",
    sub: e.memo || "",
    amount: Math.abs(e.amount_kobo) / 100,
    dir: e.amount_kobo >= 0 ? "in" : "out",
    date: d.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }),
    kind: m.kind,
  };
}

export function Wallet() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [modal, setModal] = useState<"topup" | "withdraw" | null>(null);
  const [detailTx, setDetailTx] = useState<Tx | null>(null);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [w, ledger] = await Promise.all([getWallet(), getTransactions()]);
        if (!alive) return;
        setBalance(w.available_kobo / 100);
        setTxs(ledger.map(ledgerToTx).filter((t): t is Tx => t !== null));
      } catch {
        if (alive) {
          setBalance(BALANCE);
          setTxs(TX); // offline fallback
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const totalIn = txs.filter((t) => t.dir === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = txs.filter((t) => t.dir === "out").reduce((s, t) => s + t.amount, 0);
  const rows = txs.filter((t) => filter === "all" || t.dir === filter);

  return (
    <div className="min-h-screen font-dote" style={{ background: SCREEN_BG }}>
      {/* ===================== MOBILE (≤ lg) ===================== */}
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col lg:hidden">
        {/* header */}
        <header className="flex items-center justify-between bg-white px-6 py-[18px]">
          <Link href="/profile" aria-label="Settings" className="transition hover:opacity-80">
            <UserAvatar className="size-[50px] rounded-full object-cover" />
          </Link>
          <h1 className="font-dote text-[20px] font-medium tracking-[-0.4px] text-black">Wallet</h1>
          <button type="button" aria-label="Wallet info" className="grid size-6 place-items-center text-[#1c1611]">
            <InfoIcon className="size-6" />
          </button>
        </header>

        <div className="flex-1 px-6 pt-[22px]">
          {/* balance card */}
          <div className="flex h-[126px] flex-col justify-center rounded-[20px] bg-black px-6">
            <p className="text-[12px] tracking-[-0.24px] text-[#b4b4b4]">Available wallet balance</p>
            <p className="mt-2 flex items-center gap-[6px] text-[40px] font-medium leading-none tracking-[-0.8px]">
              <span className="text-[#8c8c8c]">₦</span>
              <span className="text-white">{balance.toLocaleString()}</span>
            </p>
          </div>

          {/* actions */}
          <div className="mt-4 flex items-center gap-[10px]">
            <ActionPill label="Top up" bg="#e6f5ff" color="#004f67" onClick={() => setModal("topup")}>
              <WalletAddIcon className="size-6" />
            </ActionPill>
            <ActionPill label="Withdraw" bg="#ffe6ce" color="#6f3b00" onClick={() => setModal("withdraw")}>
              <WithdrawIcon className="size-6" />
            </ActionPill>
            <ActionPill label="Share" bg="#fdecff" color="#530060" onClick={() => undefined}>
              <ShareIcon className="size-6" />
            </ActionPill>
          </div>

          {/* transactions */}
          <div className="mt-8 flex items-center justify-between">
            <h2 className="font-dote text-[16px] font-medium tracking-[-0.32px] text-black">Transaction History</h2>
            <button
              type="button"
              onClick={() => router.push("/wallet/transactions")}
              className="text-[14px] tracking-[-0.28px] text-[#f19026]"
            >
              See all
            </button>
          </div>

          <div className="mt-1 flex flex-col pb-6">
            {txs.length === 0 && (
              <p className="py-8 text-center text-[13px] text-[#8a8177]">No transactions yet.</p>
            )}
            {txs.map((t) => (
              <TxRow key={t.id} tx={t} onClick={() => router.push(`/wallet/transactions`)} />
            ))}
          </div>
        </div>

        <BottomNav active="wallet" />
      </div>

      {/* ===================== DESKTOP (lg +) ===================== */}
      <div className="hidden h-screen flex-col overflow-hidden lg:flex">
        <TopBar section="Wallet" />
        <div className="flex min-h-0 flex-1">
          <Sidebar active="wallet" />
          <main className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
            <div className="mx-auto w-full max-w-[1120px]">
              {/* header */}
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="text-[12px] leading-[22px] text-[#4a4a4a]">Manage your celebration funds</p>
                  <h1 className="font-dote text-[22px] font-medium tracking-[-0.8px] text-[#1c1611]">Wallet</h1>
                </div>
                <div className="flex items-center gap-3">
                  <DeskAction label="Top up" bg="#e6f5ff" color="#004f67" onClick={() => setModal("topup")}>
                    <WalletAddIcon className="size-5" />
                  </DeskAction>
                  <DeskAction label="Withdraw" bg="#ffe6ce" color="#6f3b00" onClick={() => setModal("withdraw")}>
                    <WithdrawIcon className="size-5" />
                  </DeskAction>
                  <DeskAction label="Share" bg="#fdecff" color="#530060" onClick={() => undefined}>
                    <ShareIcon className="size-5" />
                  </DeskAction>
                </div>
              </div>

              {/* summary cards */}
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex flex-col justify-center rounded-[20px] bg-black px-6 py-6 xl:col-span-1">
                  <p className="text-[12px] tracking-[-0.24px] text-[#b4b4b4]">Available wallet balance</p>
                  <p className="mt-2 flex items-center gap-[6px] text-[34px] font-medium leading-none tracking-[-0.8px]">
                    <span className="text-[#8c8c8c]">₦</span>
                    <span className="text-white">{balance.toLocaleString()}</span>
                  </p>
                </div>
                <WalletStat label="Total received" value={`+₦${totalIn.toLocaleString()}`} valueColor="#0c8a3e" icon={<ReceiveIcon className="size-5" />} iconBg="#dffcff" iconColor="#00829f" />
                <WalletStat label="Total withdrawn" value={`-₦${totalOut.toLocaleString()}`} valueColor="#ff4848" icon={<WithdrawIcon className="size-5" />} iconBg="#fff0df" iconColor="#e8872e" />
                <WalletStat label="Transactions" value={`${txs.length}`} valueColor="#1c1611" icon={<ReceiptIcon className="size-5" />} iconBg="#f0f0ff" iconColor="#5f7eef" />
              </div>

              {/* transaction table */}
              <section className="mt-8 overflow-hidden rounded-[20px] border border-[#e9e4d8] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efeadd] px-6 py-5">
                  <h2 className="font-dote text-[16px] font-medium tracking-[-0.32px] text-black">Transaction History</h2>
                  <div className="flex items-center gap-2">
                    {([["all", "All"], ["in", "Money in"], ["out", "Money out"]] as const).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setFilter(k)}
                        className={`rounded-full px-4 py-[7px] text-[13px] font-medium transition ${
                          filter === k ? "bg-teal text-teal-ink" : "bg-[#f5f5f5] text-[#5c5c5c] hover:bg-[#ececec]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#efeadd] text-[11px] uppercase tracking-[0.4px] text-[#9a9282]">
                      <th className="px-6 py-3 font-medium">Transaction</th>
                      <th className="px-6 py-3 font-medium">Details</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => {
                      const ks = KIND_STYLE[t.kind];
                      const positive = t.dir === "in";
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setDetailTx(t)}
                          className="cursor-pointer border-b border-[#f4f0e6] transition last:border-0 hover:bg-[#faf8f2]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: ks.bg, color: ks.color }}>
                                <TxIcon kind={t.kind} className="size-[18px]" />
                              </span>
                              <span className="text-[14px] font-medium text-[#1c1611]">{t.title}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[13px] text-[#7a7167]">{t.sub}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-[13px] text-[#7a7167]">{t.date}</td>
                          <td className="px-6 py-4"><StatusPill status={t.status} /></td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-[14px] font-bold" style={{ color: positive ? "#0c4408" : "#ff4848" }}>
                            {positive ? "+" : "-"}₦{t.amount.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="px-6 py-10 text-center text-[14px] text-[#8a8177]">No transactions in this filter.</p>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* ===================== TOP UP / WITHDRAW MODAL ===================== */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-stretch bg-black/50 lg:items-center lg:justify-center lg:p-6"
          onClick={() => setModal(null)}
        >
          <div
            className="flex h-full w-full flex-col overflow-hidden bg-white lg:h-[min(92vh,820px)] lg:max-w-[440px] lg:rounded-[24px] lg:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            {modal === "topup" ? (
              <WalletTopUp onClose={() => setModal(null)} />
            ) : (
              <WalletWithdraw onClose={() => setModal(null)} />
            )}
          </div>
        </div>
      )}

      {/* ===================== TRANSACTION DETAILS MODAL ===================== */}
      {detailTx && <TxDetailsSheet tx={detailTx} onClose={() => setDetailTx(null)} />}
    </div>
  );
}

function DeskAction({
  label,
  bg,
  color,
  children,
  onClick,
}: {
  label: string;
  bg: string;
  color: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-[6px] rounded-[16px] px-5 py-3 transition hover:brightness-95"
      style={{ background: bg, color }}
    >
      <span style={{ color }}>{children}</span>
      <span className="text-[13px] font-medium tracking-[-0.24px]">{label}</span>
    </button>
  );
}

function WalletStat({
  label,
  value,
  valueColor,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  valueColor: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] border border-[#e9e4d8] bg-white px-5 py-6">
      <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[12px] tracking-[-0.24px] text-[#7a7167]">{label}</span>
        <span className="text-[20px] font-semibold tracking-[-0.5px]" style={{ color: valueColor }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function ActionPill({
  label,
  bg,
  color,
  children,
  onClick,
}: {
  label: string;
  bg: string;
  color: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-[6px] rounded-[22px] py-3 transition hover:brightness-95"
      style={{ background: bg, color }}
    >
      <span style={{ color }}>{children}</span>
      <span className="text-[12px] font-medium tracking-[-0.24px]">{label}</span>
    </button>
  );
}

export function TxRow({ tx, onClick }: { tx: Tx; onClick: () => void }) {
  const ks = KIND_STYLE[tx.kind];
  const positive = tx.dir === "in";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[#ececec] py-3 text-left transition hover:bg-black/[0.015]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: ks.bg, color: ks.color }}>
        <TxIcon kind={tx.kind} className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-center gap-[6px]">
          <span className="truncate text-[12px] font-medium text-[#1c1611]">{tx.title}</span>
          <StatusPill status={tx.status} />
        </span>
        <span className="truncate text-[12px] text-[#7a7167]">{tx.sub}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-[7px]">
        <span className="text-[12px] font-bold" style={{ color: positive ? "#0c4408" : "#ff4848" }}>
          {positive ? "+" : "-"}₦{tx.amount.toLocaleString()}
        </span>
        <span className="text-[10px] text-[#7a7167]">{tx.date}</span>
      </span>
    </button>
  );
}

function StatusPill({ status }: { status: "Successful" | "Pending" }) {
  const ok = status === "Successful";
  return (
    <span
      className="inline-flex items-center rounded-[8px] px-[6px] py-[3px] text-[8px] font-medium"
      style={ok ? { background: "#dbffe9", color: "#008c1e" } : { background: "#fffbdc", color: "#c6b200" }}
    >
      {status}
    </span>
  );
}

/* ------------------ transaction details modal -------------------- */

const TYPE_LABEL: Record<TxKind, string> = {
  gift: "Transfer in",
  topup: "Top up",
  withdraw: "Withdrawal",
  refund: "Refund",
};

export function TxDetailsSheet({ tx, onClose }: { tx: Tx; onClose: () => void }) {
  const positive = tx.dir === "in";
  const after = 504000; // mock running balance
  const before = after - (positive ? tx.amount : -tx.amount);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-[440px] flex-col gap-5 overflow-y-auto rounded-t-[26px] bg-white px-6 py-6 font-dote sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-[5px] w-11 rounded-[3px] bg-[#e6e6e6] sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="font-dote text-[18px] font-semibold tracking-[-0.3px] text-[#1c1611]">Transaction details</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-full text-[#9a9a9a] transition hover:bg-black/5">
            <CloseIcon className="size-5" />
          </button>
        </div>

        <DetailRow label="Gift type" value={tx.title} />
        <DetailRow label={positive ? "From" : "To"} value={tx.sub.replace(/^(From|Send to|To)\s*-\s*/i, "")} />

        <div className="flex flex-col gap-3 rounded-[16px] bg-[#faf8f2] p-4">
          <p className="text-[13px] font-medium text-[#1c1611]">Transaction info</p>
          <InfoRow label="Amount" value={`${positive ? "+" : "-"}₦${tx.amount.toLocaleString()}`} valueColor={positive ? "#0c8a3e" : "#ff4848"} />
          <InfoRow label="Date" value={tx.date} />
          <InfoRow label="Transaction ID" value={`TXN-${tx.id.toUpperCase()}-001ABC`} />
          <InfoRow label="Transaction type" value={TYPE_LABEL[tx.kind]} />
          <InfoRow label="Balance before" value={`₦${before.toLocaleString()}`} />
          <InfoRow label="Balance after" value={`₦${after.toLocaleString()}`} />
          <InfoRow label="Reference" value="Paystack" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#7a7167]">Status</span>
            <span className="flex items-center gap-[6px] text-[13px] font-medium text-[#1c1611]">
              <span className="size-2 rounded-full" style={{ background: tx.status === "Successful" ? "#1a9f5a" : "#c6b200" }} />
              {tx.status === "Successful" ? "Completed" : "Pending"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#f1ece0] pb-3">
      <span className="text-[14px] text-[#7a7167]">{label}</span>
      <span className="text-[14px] font-medium text-[#1c1611]">{value}</span>
    </div>
  );
}
function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[#7a7167]">{label}</span>
      <span className="text-[13px] font-medium" style={{ color: valueColor ?? "#1c1611" }}>{value}</span>
    </div>
  );
}
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/* ------------------------------ icons ----------------------------- */

function TxIcon({ kind, className }: { kind: TxKind; className?: string }) {
  if (kind === "topup") return <WalletAddIcon className={className} />;
  if (kind === "withdraw") return <WithdrawIcon className={className} />;
  if (kind === "refund") return <RefundIcon className={className} />;
  return <ReceiveIcon className={className} />;
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-5M12 8h.01" />
    </svg>
  );
}
function WalletAddIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 8V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" />
      <path d="M21 11h-4a2 2 0 0 0 0 4h4v-4Z" />
      <path d="M4 7l10-3 3 4" />
    </svg>
  );
}
function ReceiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 7v7M12 14l-3-3M12 14l3-3" />
    </svg>
  );
}
function WithdrawIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 17v-7M12 10l-3 3M12 10l3 3" />
    </svg>
  );
}
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M9 15 15 9M10 9h5v5" />
    </svg>
  );
}
function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}
function RefundIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10a9 9 0 1 1 1.5 5" />
      <path d="M3 5v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}
