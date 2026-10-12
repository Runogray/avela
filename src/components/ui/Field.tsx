"use client";

import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mt-4", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-[7px] block text-[13px] font-semibold tracking-[0.02em] text-ink-soft"
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[12.5px] text-ink-soft">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border-[1.5px] border-line bg-white px-[15px] py-[13px] font-body text-[16px] " +
  "text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-evergreen " +
  "focus:shadow-[0_0_0_3px_rgba(24,74,60,0.12)]";

export function TextInput({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function TextArea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-24 resize-y", className)} {...rest} />;
}

/** ₦-prefixed money input. Emits kobo via onAmountChange. */
export function MoneyInput({
  valueKobo,
  onAmountChange,
  autoFocus,
  id,
}: {
  valueKobo: number;
  onAmountChange: (kobo: number) => void;
  autoFocus?: boolean;
  id?: string;
}) {
  const display = valueKobo > 0 ? Math.trunc(valueKobo / 100).toLocaleString("en-NG") : "";
  return (
    <div className="flex items-center overflow-hidden rounded-md border-[1.5px] border-line focus-within:border-evergreen focus-within:shadow-[0_0_0_3px_rgba(24,74,60,0.12)]">
      <span className="bg-shell px-3.5 py-[13px] font-semibold text-ink-soft">₦</span>
      <input
        id={id}
        autoFocus={autoFocus}
        inputMode="numeric"
        aria-label="Amount"
        placeholder="0"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, "");
          onAmountChange(digits ? parseInt(digits, 10) * 100 : 0);
        }}
        className="money w-full border-0 px-3.5 py-[13px] text-[20px] outline-none"
      />
    </div>
  );
}
