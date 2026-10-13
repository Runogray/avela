"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackArrow } from "./BackArrow";
import { TransactionStatus } from "./TransactionStatus";
import { recordWalletTx } from "@/lib/walletTx";
import { getBankAccount, getWallet, saveBankAccount, setWithdrawalPin, verifyNin, withdraw as withdrawApi } from "@/lib/wallet";
import { apiErrorMessage } from "@/lib/api";

// Small mock helpers so the status screen shows plausible values.
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

/* ------------------------------------------------------------------ *
 * Dote, Wallet Withdraw, first-time flow (mobile, Figma 14552:16404):
 *   1. Verify Identity (BVN)  14552:16528
 *   2. Bank Details           14552:16490
 *   3. Create PIN             14552:16571
 *   4. Confirm PIN            14552:16601
 * ------------------------------------------------------------------ */

const BANKS = [
  "Access Bank",
  "Ecobank",
  "Fidelity Bank",
  "First Bank",
  "FCMB",
  "GTBank",
  "Keystone Bank",
  "Kuda",
  "Moniepoint",
  "Opay",
  "PalmPay",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC",
  "Sterling Bank",
  "UBA",
  "Union Bank",
  "Wema Bank",
  "Zenith Bank",
];

/** Only follow same-site paths from ?next= (never another origin). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/wallet";
}
type Step = "bvn" | "bank" | "createPin" | "confirmPin" | "amount" | "authPin" | "done";

export function WalletWithdraw({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const modal = !!onClose;
  const close = onClose ?? (() => router.push("/wallet"));
  // ?setup=bank&next=/events/<id>: hosts adding the account guests transfer
  // cash gifts into. Opens straight on Bank Details (no BVN) and returns.
  const params = useSearchParams();
  const setupNext = !modal && params.get("setup") === "bank" ? safeNext(params.get("next")) : null;
  const [step, setStep] = useState<Step>(setupNext ? "bank" : "bvn");

  const [bvn, setBvn] = useState("");
  const [bank, setBank] = useState("GTBank");
  const [bankOpen, setBankOpen] = useState(false);
  const [account, setAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankErr, setBankErr] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pinErr, setPinErr] = useState(false);
  const [amount, setAmount] = useState(0);
  const [authPin, setAuthPin] = useState("");
  const [authErr, setAuthErr] = useState(false);
  const [avail, setAvail] = useState(0);

  useEffect(() => {
    getWallet()
      .then((w) => setAvail(w.available_kobo / 100))
      .catch(() => setAvail(0));
    // Pre-fill a saved account so hosts can review or change it.
    getBankAccount()
      .then((b) => {
        if (!b) return;
        if (BANKS.includes(b.bank_name)) setBank(b.bank_name);
        setAccount(b.account_number);
        setAccountName(b.account_name);
      })
      .catch(() => {});
  }, []);

  // No account-name lookup service yet, so the host types the name as it
  // appears on the account (guests see it when sending cash gifts).
  const bankReady = account.length === 10 && accountName.trim().length >= 3;

  async function saveBank() {
    if (!bankReady || savingBank) return;
    setSavingBank(true);
    setBankErr("");
    try {
      await saveBankAccount({ bank_name: bank, account_number: account, account_name: accountName.trim() });
      if (setupNext) router.push(setupNext);
      else setStep("createPin");
    } catch (err) {
      setBankErr(apiErrorMessage(err, "We couldn’t save your bank details. Please try again."));
    } finally {
      setSavingBank(false);
    }
  }

  // Create PIN complete → go confirm.
  useEffect(() => {
    if (step === "createPin" && pin.length === 4) {
      const t = setTimeout(() => setStep("confirmPin"), 180);
      return () => clearTimeout(t);
    }
  }, [pin, step]);

  // Confirm PIN complete → verify match → persist the PIN → enter the amount.
  useEffect(() => {
    if (step === "confirmPin" && confirm.length === 4) {
      if (confirm === pin) {
        setWithdrawalPin(pin).catch(() => {}); // save the new withdrawal PIN
        const t = setTimeout(() => setStep("amount"), 220);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setPinErr(true);
        setConfirm("");
      }, 180);
      return () => clearTimeout(t);
    }
  }, [confirm, pin, step]);

  // Authorize PIN complete → verify against the PIN just created → finish.
  useEffect(() => {
    if (step === "authPin" && authPin.length === 4) {
      if (authPin === pin) {
        const t = setTimeout(async () => {
          try {
            await withdrawApi(amount * 100, authPin); // server enforces NIN + floor + balance + PIN
          } catch (e) {
            setAuthErr(true);
            setAuthPin("");
            alert(apiErrorMessage(e));
            return;
          }
          recordWalletTx("withdraw", amount);
          setStep("done");
        }, 220);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setAuthErr(true);
        setAuthPin("");
      }, 180);
      return () => clearTimeout(t);
    }
  }, [authPin, pin, step, router]);

  /* ----------------------------- BVN ----------------------------- */
  if (step === "bvn") {
    return (
      <FormShell modal={modal} onBack={close}>
        <div className="flex flex-col items-center gap-[18px] text-center">
          <span className="text-[44px] leading-none">🗳️</span>
          <div className="flex flex-col gap-2">
            <h1 className="font-dote text-[28px] font-medium tracking-[-0.66px] text-[#221a10]">Verify Identity</h1>
            <p className="text-[15px] leading-[22px] text-[#6e6558]">
              Before we can pay out to your bank, regulations require us to confirm your identity with your BVN.
              You&rsquo;ll only ever do this once.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-[14px]">
          <label className="text-[14px] font-medium tracking-[-0.66px] text-[#221a10]">
            Bank Verification Number (BVN)
          </label>
          <input
            inputMode="numeric"
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
            placeholder="Enter your 11-digit BVN"
            className="h-[64px] w-full rounded-[16px] border border-[#edeceb] bg-[#fafafa] px-4 text-[16px] font-medium text-[#1a1a1a] outline-none transition placeholder:text-[#b9b9b9] focus:border-teal"
          />
          <p className="text-[12px] text-[#575757]">
            Dial <span className="font-semibold text-[#101010]">*565*0#</span> on your registered line to see your BVN.
          </p>
        </div>

        <PrivacyBanner>
          We only check that the name matches your account. Your BVN is encrypted and never shown to buyers or
          sellers.
        </PrivacyBanner>

        <Cta
          label="Continue"
          disabled={bvn.length !== 11}
          onClick={() => {
            // Lift the receiving cap / enable withdrawals (stub accepts 11 digits).
            verifyNin(bvn).catch(() => {});
            setStep("bank");
          }}
        />
      </FormShell>
    );
  }

  /* ---------------------------- BANK ----------------------------- */
  if (step === "bank") {
    return (
      <FormShell modal={modal} onBack={() => (setupNext ? router.push(setupNext) : setStep("bvn"))}>
        <h1 className="font-dote text-[28px] font-medium tracking-[-0.4px] text-[#1c1611]">Bank Details</h1>
        {setupNext && (
          <p className="mt-2 text-[14px] leading-relaxed text-[#5c5c5c]">
            Guests send cash gifts straight to this account by bank transfer.
          </p>
        )}

        <div className="mt-[18px] flex flex-col gap-[14px]">
          <label className="text-[14px] font-medium tracking-[-0.66px] text-[#221a10]">Select Bank</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setBankOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-[20px] border border-[#eff3f2] bg-white p-4"
            >
              <span className="flex items-center gap-[6px]">
                <span className="grid size-[38px] place-items-center rounded-[10px] bg-[#dcf4f9]">
                  <BuildingsIcon className="size-5 text-teal" />
                </span>
                <span className="text-[14px] font-medium tracking-[0.2px] text-[#0e0e0e]">{bank}</span>
              </span>
              <ChevronDown className={`size-[18px] text-[#8a8a8a] transition ${bankOpen ? "rotate-180" : ""}`} />
            </button>
            {bankOpen && (
              <div className="absolute z-10 mt-2 max-h-[240px] w-full overflow-y-auto rounded-[16px] border border-[#eff3f2] bg-white py-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.3)]">
                {BANKS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setBank(b);
                      setBankOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] transition hover:bg-black/[0.03] ${
                      b === bank ? "font-medium text-teal" : "text-[#1c1611]"
                    }`}
                  >
                    <span className="grid size-7 place-items-center rounded-[8px] bg-[#dcf4f9]">
                      <BuildingsIcon className="size-4 text-teal" />
                    </span>
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-[18px] flex flex-col gap-[12px]">
          <div className="flex flex-col gap-[14px]">
            <label className="text-[14px] font-medium tracking-[-0.66px] text-[#221a10]">Account Number</label>
            <input
              inputMode="numeric"
              value={account}
              onChange={(e) => setAccount(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
              placeholder="Enter 10-digit account number"
              className="h-[64px] w-full rounded-[16px] border border-[#edeceb] bg-[#fafafa] px-4 text-[16px] font-medium text-[#1a1a1a] outline-none transition placeholder:text-[#b9b9b9] focus:border-teal"
            />
          </div>
        </div>

        <div className="mt-[18px] flex flex-col gap-[14px]">
          <label className="text-[14px] font-medium tracking-[-0.66px] text-[#221a10]">Account Name</label>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value.slice(0, 140))}
            placeholder="Name on the account"
            autoComplete="name"
            className="h-[64px] w-full rounded-[16px] border border-[#edeceb] bg-[#fafafa] px-4 text-[16px] font-medium text-[#1a1a1a] outline-none transition placeholder:text-[#b9b9b9] focus:border-teal"
          />
          {bankErr && <p role="alert" className="text-[13px] text-[#c0392b]">{bankErr}</p>}
        </div>

        <Cta label={savingBank ? "Saving…" : "Save"} disabled={!bankReady || savingBank} onClick={saveBank} />
      </FormShell>
    );
  }

  /* --------------------------- AMOUNT ---------------------------- */
  if (step === "amount") {
    const validAmt = amount >= 100 && amount <= avail;
    const chips = [5000, 10000, 20000];
    return (
      <FormShell modal={modal} onBack={close}>
        <h1 className="font-dote text-[28px] font-medium tracking-[-0.4px] text-[#1c1611]">Withdraw</h1>
        <p className="mt-2 text-[15px] leading-[22px] text-[#8a8177]">
          How much would you like to withdraw to {bank}?
        </p>

        <div className="mt-[18px] flex flex-col gap-6 rounded-[16px] border border-[#e5e5e5] bg-white p-4">
          <div className="flex items-start justify-between tracking-[0.2px]">
            <span className="text-[12px] text-[#292929]">AMOUNT</span>
            <span className="text-[10px] font-medium text-[#737373]">
              Available ₦{avail.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-[2px]">
            <span className="text-[35px] font-semibold leading-none text-[#0e0e0e]">₦</span>
            <input
              inputMode="numeric"
              value={amount ? amount.toLocaleString() : ""}
              onChange={(e) => setAmount(Math.min(avail, Number(e.target.value.replace(/[^\d]/g, "")) || 0))}
              placeholder="0"
              className="w-full min-w-0 bg-transparent text-[34px] font-semibold leading-none text-[#0e0e0e] outline-none placeholder:text-[#cccccc]"
              style={{ caretColor: "#00829f" }}
            />
          </div>
          <div className="flex flex-wrap gap-[10px]">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAmount(c)}
                className={`rounded-[10px] border px-[7px] py-[6px] text-[12px] font-medium tracking-[0.2px] transition ${
                  amount === c ? "border-teal bg-teal/10 text-teal" : "border-[#e5e5e5] bg-[#f5f5f5] text-[#141414] hover:border-[#cfcfcf]"
                }`}
              >
                ₦{c.toLocaleString()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(avail)}
              className={`rounded-[10px] border px-[7px] py-[6px] text-[12px] font-medium tracking-[0.2px] transition ${
                amount === avail ? "border-teal bg-teal/10 text-teal" : "border-[#e5e5e5] bg-[#f5f5f5] text-[#141414] hover:border-[#cfcfcf]"
              }`}
            >
              All ₦{avail.toLocaleString()}
            </button>
          </div>
        </div>

        <Cta
          label={amount > 0 ? `Withdraw ₦${amount.toLocaleString()}` : "Withdraw"}
          disabled={!validAmt}
          onClick={() => {
            setAuthErr(false);
            setAuthPin("");
            setStep("authPin");
          }}
        />
      </FormShell>
    );
  }

  /* ---------------------------- DONE ----------------------------- */
  if (step === "done") {
    return (
      <TransactionStatus
        variant="success"
        amount={amount}
        subtitle={
          <>
            {`₦${amount.toLocaleString()} on its way to `}
            <span className="font-bold">{accountName.trim() || bank}</span>
          </>
        }
        rows={[
          { label: "Amount", value: `-₦${amount.toLocaleString()}` },
          { label: "Date", value: txDate() },
          { label: "Transaction ID", value: txRef() },
          { label: "Transaction type", value: "Transfer_out" },
          { label: "Bank", value: bank },
          { label: "Account", value: account ? `••••${account.slice(-4)}` : "Not added" },
          { label: "Balance before", value: `₦${avail.toLocaleString()}` },
          { label: "Balance after", value: `₦${Math.max(0, avail - amount).toLocaleString()}` },
          { label: "Reference", value: "Paystack" },
        ]}
        buttonLabel="Done"
        onPrimary={() => (onClose ? onClose() : router.push("/wallet?withdrawn=1"))}
        onClose={onClose}
      />
    );
  }

  /* --------------------------- PIN steps ------------------------- */
  const isCreate = step === "createPin";
  const isAuth = step === "authPin";
  return (
    <PinShell
      modal={modal}
      title={isCreate ? "Create PIN" : isAuth ? "Enter PIN" : "Confirm PIN"}
      caption={
        isCreate
          ? "Create a 4 digit passcode to keep your financial information safe and secure."
          : isAuth
            ? `Enter your PIN to authorize withdrawing ₦${amount.toLocaleString()}.`
            : "Confirm your 4 digit passcode to keep your financial information safe and secure."
      }
      value={isAuth ? authPin : isCreate ? pin : confirm}
      error={isAuth ? authErr : !isCreate && pinErr}
      errorText={isAuth ? "Incorrect PIN. Try again." : "PINs don’t match. Try again."}
      onBack={() => {
        if (isCreate) setStep("bank");
        else if (isAuth) {
          setStep("amount");
          setAuthPin("");
          setAuthErr(false);
        } else {
          setStep("createPin");
          setPin("");
          setConfirm("");
          setPinErr(false);
        }
      }}
      onKey={(d) => {
        if (isAuth) {
          setAuthErr(false);
          setAuthPin((p) => (p.length < 4 ? p + d : p));
        } else if (isCreate) {
          setPin((p) => (p.length < 4 ? p + d : p));
        } else {
          setPinErr(false);
          setConfirm((c) => (c.length < 4 ? c + d : c));
        }
      }}
      onDelete={() => {
        if (isAuth) setAuthPin((p) => p.slice(0, -1));
        else if (isCreate) setPin((p) => p.slice(0, -1));
        else setConfirm((c) => c.slice(0, -1));
      }}
    />
  );
}

/* ------------------------- shared shells -------------------------- */

function FormShell({ children, onBack, modal }: { children: React.ReactNode; onBack: () => void; modal?: boolean }) {
  return (
    <div className={`flex ${modal ? "h-full" : "min-h-screen"} flex-col bg-white font-dote`}>
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
        <header className="flex items-center px-6 py-[18px]">
          <BackPill onClick={onBack} />
        </header>
        <div className="flex flex-1 flex-col px-6 pt-[26px]">{children}</div>
      </div>
    </div>
  );
}

function Cta({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <div className="mt-auto py-6">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex h-[56px] w-full items-center justify-center rounded-[50px] text-[14px] tracking-[0.35px] text-teal-ink transition disabled:cursor-not-allowed disabled:bg-[#d0ebf1] enabled:bg-teal enabled:hover:brightness-95"
      >
        {label}
      </button>
    </div>
  );
}

// Figma back button (Top Up / Withdraw / Verify / PIN): teal-outline chevron square, no label.
function BackPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="grid place-items-center rounded-[10px] border border-teal bg-[#cbf5ff]/30 p-[6px]"
    >
      <BackArrow className="size-4 text-teal" />
    </button>
  );
}

// Verify Identity privacy banner, coral/pink per the updated Figma.
function PrivacyBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-[18px] flex items-center gap-[9px] rounded-[12px] bg-[#fff3f2] px-[15px] py-[13px]">
      <span className="grid shrink-0 place-items-center rounded-full border border-[#fed6cc] bg-[#ffe3db] p-[6px]">
        <ShieldTick className="size-5 text-[#e8603c]" />
      </span>
      <p className="text-[13px] leading-[19px] text-[#221a10]">{children}</p>
    </div>
  );
}

function PinShell({
  title,
  caption,
  value,
  error,
  errorText = "PINs don’t match. Try again.",
  onBack,
  onKey,
  onDelete,
  modal,
}: {
  title: string;
  caption: string;
  value: string;
  error?: boolean;
  errorText?: string;
  onBack: () => void;
  onKey: (d: string) => void;
  onDelete: () => void;
  modal?: boolean;
}) {
  return (
    <div className={`flex ${modal ? "h-full" : "min-h-screen"} flex-col bg-white font-dote`}>
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
        {/* header: back + centered title */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-6 py-[18px]">
          <span className="justify-self-start">
            <BackPill onClick={onBack} />
          </span>
          <p className="text-[16px] font-semibold tracking-[0.2px] text-[#0e0e0e]">{title}</p>
          <span />
        </header>

        {/* center */}
        <div className="mt-[56px] flex flex-col items-center gap-5 px-6">
          <span className="grid size-16 place-items-center rounded-[32px] bg-[#e5f6fa]">
            <LockIcon className="size-8 text-teal" />
          </span>
          <p className="max-w-[345px] text-center text-[14px] text-[#808080]">{caption}</p>
          <div className="flex items-center gap-4 py-2">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="size-4 rounded-full transition"
                style={{
                  background: i < value.length ? (error ? "#ff4848" : "#0e0e0e") : "transparent",
                  boxShadow: i < value.length ? "none" : `inset 0 0 0 1.5px ${error ? "#ff4848" : "#d4d4d4"}`,
                }}
              />
            ))}
          </div>
          {error && <p className="text-[13px] text-[#ff4848]">{errorText}</p>}
        </div>

        {/* keypad */}
        <div className="mt-auto flex flex-col items-center gap-[14px] px-6 pb-9 pt-4">
          {[
            ["1", "2", "3"],
            ["4", "5", "6"],
            ["7", "8", "9"],
            ["", "0", "del"],
          ].map((row, r) => (
            <div key={r} className="flex w-full max-w-[345px] justify-center gap-[10px]">
              {row.map((k, c) =>
                k === "" ? (
                  <span key={c} className="h-[66px] flex-1" />
                ) : k === "del" ? (
                  <button
                    key={c}
                    type="button"
                    onClick={onDelete}
                    aria-label="Delete"
                    className="grid h-[66px] flex-1 place-items-center rounded-[12px] bg-[#f5f5f5] text-[18px] text-teal transition active:scale-95"
                  >
                    ⌫
                  </button>
                ) : (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onKey(k)}
                    className="grid h-[66px] flex-1 place-items-center rounded-[12px] bg-[#f5f5f5] text-[22px] font-bold text-[#0e0e0e] transition active:scale-95"
                  >
                    {k}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ icons ----------------------------- */

function BuildingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M15 21V10h2a2 2 0 0 1 2 2v9" />
      <path d="M8 7h4M8 11h4M8 15h4" />
    </svg>
  );
}
function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
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
function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 15v2" />
    </svg>
  );
}
