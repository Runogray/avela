"use client";

import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ *
 * Dote, Transaction status screen (Figma 14556:19149 success /
 * 14556:19246 failed). Shown after a top-up or withdrawal. Renders as
 * a full page on mobile and, when given `onClose`, fits a desktop
 * modal card. One component, two variants.
 * ------------------------------------------------------------------ */

export type TxStatusRow = {
  label: string;
  value: string;
  /** value colour, defaults to white */
  accent?: "green" | "red";
};

export type TransactionStatusProps = {
  variant: "success" | "failed";
  /** the big headline amount (e.g. 10000) */
  amount: number;
  title?: string;
  subtitle?: React.ReactNode;
  /** optional top rows of the black card */
  giftType?: string;
  from?: string;
  /** the "Transaction Info" rows */
  rows?: TxStatusRow[];
  statusLabel?: string;
  buttonLabel?: string;
  /** primary button action (defaults to onClose, else → /wallet) */
  onPrimary?: () => void;
  /** when supplied the screen is a modal: close X + root h-full */
  onClose?: () => void;
};

const naira = (n: number) => `₦${n.toLocaleString()}`;

export function TransactionStatus({
  variant,
  amount,
  title,
  subtitle,
  giftType,
  from,
  rows = [],
  statusLabel,
  buttonLabel,
  onPrimary,
  onClose,
}: TransactionStatusProps) {
  const router = useRouter();
  const modal = !!onClose;
  const success = variant === "success";

  const heading = title ?? (success ? "Successful Transaction" : "Failed Transaction");
  const sub =
    subtitle ?? (success ? "Your transaction was completed." : "We can’t complete your transaction at the moment.");
  const status = statusLabel ?? (success ? "Completed" : "Failed");
  const cta = buttonLabel ?? (success ? "Wallet" : "Try again later");
  const primary = onPrimary ?? onClose ?? (() => router.push("/wallet"));

  return (
    <div
      className={`flex ${modal ? "h-full" : "min-h-screen"} flex-col font-dote`}
      style={{
        backgroundImage:
          "linear-gradient(152deg, #f7fcff 1%, #fffdfa 49%, #f5fcff 79%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col">
        {/* header, close X right-aligned */}
        <header className="flex items-center justify-end px-6 py-[18px]">
          <button
            type="button"
            onClick={onClose ?? (() => router.push("/wallet"))}
            aria-label="Close"
            className="grid size-6 place-items-center text-[#0e0e0e] transition hover:opacity-60"
          >
            <CrossIcon className="size-4" />
          </button>
        </header>

        {/* body */}
        <div className="flex flex-1 flex-col items-center px-6 pt-[16px]">
          {/* emoji tile */}
          <span
            className="grid size-20 place-items-center rounded-[40px] text-[40px] leading-none"
            style={{ background: success ? "#a6ff9c" : "#f14826" }}
          >
            <span aria-hidden="true">{success ? "🚀" : "😣"}</span>
          </span>

          {/* title + amount + subtitle */}
          <div className="mt-5 flex flex-col items-center gap-2">
            <p
              className="text-[18px] font-medium tracking-[0.2px]"
              style={{ color: success ? "#0e0e0e" : "#ff270f" }}
            >
              {heading}
            </p>
            <p
              className={`text-[40px] font-semibold leading-[1.1] text-[#0e0e0e] ${
                success ? "" : "line-through"
              }`}
            >
              {naira(amount)}
            </p>
            <p className="max-w-[320px] text-center text-[14px] leading-[1.4] tracking-[0.2px] text-[#424242]">
              {sub}
            </p>
          </div>

          {/* details card */}
          <div className="mt-6 flex w-full flex-col gap-5 rounded-[32px] bg-black px-[18px] py-5">
            {giftType && (
              <Row
                className="border-b border-dashed border-[#e1e1e1] pb-3"
                label="Gift type"
                value={giftType}
                bold
              />
            )}
            {from && (
              <Row
                className="border-b border-dashed border-[#e1e1e1] pb-4"
                label="From:"
                value={from}
                bold
              />
            )}

            <div className="flex flex-col gap-[14px]">
              <p className="text-[14px] font-medium tracking-[0.2px] text-white">Transaction Info:</p>
              <div className="flex flex-col gap-[10px]">
                {rows.map((r) => (
                  <InfoRow key={r.label} label={r.label} value={r.value} accent={r.accent} />
                ))}
                {/* status */}
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-white tracking-[0.2px]">Status</span>
                  <span className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: success ? "#34c759" : "#ff4405" }}
                    />
                    <span
                      className="text-[12px] font-medium tracking-[0.2px]"
                      style={{ color: success ? "#34c759" : "#ff4405" }}
                    >
                      {status}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* primary button */}
        <div className="px-6 pb-8 pt-6">
          <button
            type="button"
            onClick={primary}
            className="flex h-[56px] w-full items-center justify-center rounded-[50px] text-[14px] tracking-[0.25px] text-[#f4fffe] transition hover:brightness-95"
            style={{ background: success ? "#f19026" : "#fa1818" }}
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}

/* top rows (gift type / from), bold value */
function Row({
  label,
  value,
  bold,
  className = "",
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-[14px] font-medium tracking-[0.2px] text-white">{label}</span>
      <span className={`text-[14px] tracking-[0.2px] text-white ${bold ? "font-bold" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

/* transaction-info rows, 12px values, optional accent colour */
function InfoRow({ label, value, accent }: { label: string; value: string; accent?: "green" | "red" }) {
  const color = accent === "green" ? "#29d226" : accent === "red" ? "#ff4405" : "#ffffff";
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] text-white tracking-[0.2px]">{label}</span>
      <span className="text-[12px] font-medium tracking-[0.2px]" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
