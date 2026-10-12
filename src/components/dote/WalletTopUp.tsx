"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackArrow } from "./BackArrow";
import { TransactionStatus } from "./TransactionStatus";
import { recordWalletTx } from "@/lib/walletTx";
import { confirmStubTopUp, topUp } from "@/lib/wallet";

/* ------------------------------------------------------------------ *
 * Dote, Wallet Top Up (mobile, Figma 14552:16663). Amount entry +
 * quick chips, Paystack escrow note, Continue to Paystack → status
 * screen (Figma 14556:19149).
 * ------------------------------------------------------------------ */

const MIN = 500;
const MAX = 2_000_000;
const CHIPS = [5000, 10000, 25000, 50000];
const BALANCE = 24000; // mock current balance (matches Wallet screen)

const txDate = () =>
  new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
const txRef = () => `TXN-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export function WalletTopUp({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const [amount, setAmount] = useState(10000);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = onClose ?? (() => router.push("/wallet"));

  const valid = amount >= MIN && amount <= MAX;

  async function pay() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await topUp(amount * 100); // kobo
      // Live Paystack → redirect to the hosted checkout.
      if (res.checkout_url && !/stub_/i.test(res.checkout_url)) {
        window.location.href = res.checkout_url;
        return;
      }
      // Dev stub → confirm immediately so the balance updates.
      await confirmStubTopUp(res.checkout_url);
    } catch {
      recordWalletTx("topup", amount); // offline fallback
    }
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <TransactionStatus
        variant="success"
        amount={amount}
        subtitle={`₦${amount.toLocaleString()} has been added to your wallet.`}
        rows={[
          { label: "Amount", value: `+₦${amount.toLocaleString()}`, accent: "green" },
          { label: "Date", value: txDate() },
          { label: "Transaction ID", value: txRef() },
          { label: "Transaction type", value: "Transfer_in" },
          { label: "Balance before", value: `₦${BALANCE.toLocaleString()}` },
          { label: "Balance after", value: `₦${(BALANCE + amount).toLocaleString()}` },
          { label: "Reference", value: "Paystack" },
        ]}
        buttonLabel="Wallet"
        onPrimary={() => (onClose ? onClose() : router.push("/wallet?topped=1"))}
        onClose={onClose}
      />
    );
  }

  return (
    <div className={`flex ${onClose ? "h-full" : "min-h-screen"} flex-col bg-white font-dote`}>
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
        {/* header */}
        <header className="flex items-center px-6 py-[18px]">
          <button
            type="button"
            onClick={close}
            aria-label={onClose ? "Close" : "Back"}
            className="grid place-items-center rounded-[10px] border border-teal bg-[#cbf5ff]/30 p-[6px]"
          >
            <BackArrow className="size-4 text-teal" />
          </button>
        </header>

        {/* body */}
        <div className="flex flex-1 flex-col gap-[18px] px-6 pt-[26px]">
          <div className="flex flex-col gap-2">
            <h1 className="font-dote text-[28px] font-medium tracking-[-0.4px] text-[#1c1611]">Top Up</h1>
            <p className="text-[15px] leading-[22px] text-[#8a8177]">
              Top up your wallet to buy with escrow protection.
            </p>
          </div>

          {/* amount card */}
          <div className="flex flex-col gap-6 rounded-[16px] border border-[#e5e5e5] bg-white p-4">
            <div className="flex flex-col gap-[18px]">
              <div className="flex items-start justify-between tracking-[0.2px]">
                <span className="text-[12px] text-[#292929]">AMOUNT</span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-[#737373]">
                  <span>Min ₦{MIN.toLocaleString()}</span>
                  <span className="text-[#c4c4c4]">·</span>
                  <span>Max ₦{MAX.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex items-center gap-[2px]">
                <span className="text-[35px] font-semibold leading-none text-[#0e0e0e]">₦</span>
                <input
                  inputMode="numeric"
                  value={amount ? amount.toLocaleString() : ""}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^\d]/g, ""));
                    setAmount(Math.min(MAX * 10, n || 0));
                  }}
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-[34px] font-semibold leading-none text-[#0e0e0e] outline-none placeholder:text-[#cccccc]"
                  style={{ caretColor: "#00829f" }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-[10px]">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAmount(c)}
                  className={`rounded-[10px] border px-[7px] py-[6px] text-[12px] font-medium tracking-[0.2px] transition ${
                    amount === c
                      ? "border-teal bg-teal/10 text-teal"
                      : "border-[#e5e5e5] bg-[#f5f5f5] text-[#141414] hover:border-[#cfcfcf]"
                  }`}
                >
                  ₦{c.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* privacy banner */}
          <div className="flex items-center gap-[9px] rounded-[12px] bg-[#ebfaff] px-[15px] py-[13px]">
            <span className="grid shrink-0 place-items-center rounded-full border border-[#acebf8] bg-[#dbf8ff] p-[6px]">
              <ShieldTick className="size-5 text-teal" />
            </span>
            <p className="text-[13px] leading-[19px] text-[#221a10]">
              You&rsquo;ll pay securely through Paystack, card, bank transfer or USSD. Your balance updates the
              moment Paystack confirms.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 py-6">
          <button
            type="button"
            disabled={!valid || busy}
            onClick={pay}
            className="flex h-[56px] w-full items-center justify-center rounded-[50px] text-[14px] tracking-[0.35px] text-teal-ink transition disabled:cursor-not-allowed disabled:bg-[#d0ebf1] enabled:bg-teal enabled:hover:brightness-95"
          >
            {busy ? "Processing…" : "Continue to Paystack"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShieldTick({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.2-2.8 7.5-7 9-4.2-1.5-7-4.8-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
