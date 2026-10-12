"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DoteLogo } from "./Logo";
import { BackArrow } from "./BackArrow";
import { forgotPassword, resetPassword } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/api";

/**
 * Forgot-password flow: enter email → receive a reset code → set a new
 * password. On success the user is signed in and sent to the dashboard.
 */
export function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      setStep("reset");
      setNote("If that email has an account, a reset code is on its way.");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (next.length < 6) return setError("Password must be at least 6 characters.");
    if (next !== confirm) return setError("Passwords don’t match.");
    setBusy(true);
    try {
      await resetPassword(email.trim(), code.trim(), next);
      router.push("/events"); // signed in
    } catch (err) {
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-dote text-black">
      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col px-6 pb-10 pt-6">
        <button
          type="button"
          onClick={() => (step === "reset" ? setStep("email") : router.push("/login"))}
          aria-label="Back"
          className="grid size-9 place-items-center rounded-[10px] border border-teal bg-[#cbf5ff]/30"
        >
          <BackArrow className="size-4 text-teal" />
        </button>

        <div className="mt-8">
          <DoteLogo />
          <h1 className="mt-4 font-dote text-[26px] font-medium tracking-[-0.4px]">
            {step === "email" ? "Reset your password" : "Enter your reset code"}
          </h1>
          <p className="mt-2 text-[14px] leading-[22px] text-dote-sub">
            {step === "email"
              ? "Enter the email on your account and we’ll send you a code."
              : `We sent a 6-digit code to ${email}. Enter it and choose a new password.`}
          </p>
        </div>

        {note && step === "reset" && (
          <p className="mt-4 rounded-[12px] bg-[#eefaf0] px-4 py-3 text-[13px] text-[#1c7a3f]">{note}</p>
        )}
        {error && (
          <p className="mt-4 rounded-[12px] bg-[#fdeeec] px-4 py-3 text-[13px] text-[#c0392b]">{error}</p>
        )}

        {step === "email" ? (
          <form className="mt-6 flex flex-col gap-5" onSubmit={sendCode}>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email" className={inputClass} />
            </Field>
            <Cta busy={busy} disabled={!email.trim()}>Send reset code</Cta>
          </form>
        ) : (
          <form className="mt-6 flex flex-col gap-5" onSubmit={reset}>
            <Field label="Reset code">
              <input inputMode="numeric" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code" className={inputClass} />
            </Field>
            <Field label="New password">
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)}
                placeholder="••••••••" autoComplete="new-password" className={inputClass} />
            </Field>
            <Field label="Confirm password">
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••" autoComplete="new-password" className={inputClass} />
            </Field>
            <Cta busy={busy} disabled={code.length !== 6 || !next || !confirm}>Reset password</Cta>
            <button type="button" onClick={() => void sendCode(new Event("submit") as unknown as React.FormEvent)}
              className="text-center text-[13px] font-medium text-teal">
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-[10px]">
      <span className="text-[14px] font-medium tracking-[-0.2px] text-[#221a10]">{label}</span>
      {children}
    </label>
  );
}

function Cta({ busy, disabled, children }: { busy: boolean; disabled: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy || disabled}
      className="mt-1 flex h-[56px] w-full items-center justify-center rounded-[50px] text-[14px] tracking-[0.35px] text-teal-ink transition disabled:cursor-not-allowed disabled:bg-[#d0ebf1] enabled:bg-teal enabled:hover:brightness-95">
      {busy ? "Please wait…" : children}
    </button>
  );
}

const inputClass =
  "h-[60px] w-full rounded-[16px] border border-sky-line bg-field px-4 text-[16px] font-medium text-black " +
  "outline-none placeholder:text-[#b9b9b9] focus:border-teal focus:ring-2 focus:ring-teal/15";
