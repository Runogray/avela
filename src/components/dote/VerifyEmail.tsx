"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Terms } from "./AuthScreen";
import { resendEmailOtp, verifyEmail } from "@/lib/auth";
import { apiErrorMessage, isNetworkError } from "@/lib/api";

/**
 * Dote email verification, dark petrol screen, a frosted card with six OTP
 * tiles, teal action, and a loading overlay on submit.
 */
export function VerifyEmail({ email }: { email?: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState("");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function resend() {
    if (seconds > 0) return;
    setError("");
    setNote("");
    setSeconds(60);
    try {
      await resendEmailOtp();
      setNote("A new code is on its way.");
    } catch (err) {
      if (!isNetworkError(err)) setError(apiErrorMessage(err, "Couldn’t resend the code."));
    }
  }

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 5) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const code = digits.join("");
    try {
      await verifyEmail(code);
    } catch (err) {
      if (!isNetworkError(err)) {
        // Real validation error (e.g. bad code), stop and show it.
        setError(apiErrorMessage(err, "That code didn’t work. Try again."));
        setLoading(false);
        return;
      }
      // Backend unreachable, proceed (mock flow).
    }
    // On success the new host lands on New celebration (create event).
    router.push("/create");
  }

  return (
    <div className="relative min-h-screen w-full bg-petrol-ink font-dote-body">
      {/* back */}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        className="absolute left-5 top-5 z-20 grid place-items-center rounded-[10px] border border-[#464646] bg-[#1d1d1d] p-1.5 sm:left-[72px] sm:top-11"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dote/arrow-up.svg" alt="" className="h-4 w-4 -rotate-90" />
      </button>

      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-[550px] overflow-hidden rounded-[40px] bg-white/90 px-6 py-14 backdrop-blur-xl">
          <form onSubmit={submit} className="mx-auto flex w-full max-w-[354px] flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-[23px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/dote/verify-mark.svg" alt="" className="h-[44px] w-auto" />
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="font-dote text-[28px] font-medium tracking-[-0.66px] text-dote-label">
                  Verify your email
                </h1>
                <p className="text-[15px] leading-[22px] text-dote-sub2">
                  Enter the 6 digit code we sent to your email{" "}
                  <span className="font-bold text-[#373737]">{email ?? "your email"}</span> to
                  complete your setup.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-[10px]">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    value={d}
                    inputMode="numeric"
                    maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    className={cn(
                      "h-[52px] w-[44px] rounded-[14px] bg-black text-center font-dote-input text-[18px]",
                      "tracking-[0.2px] text-white caret-teal outline-none",
                      "focus:ring-2 focus:ring-teal"
                    )}
                  />
                ))}
              </div>
              <p className="text-[12px] text-[#1a1a1a]">
                Didn&rsquo;t receive a code?{" "}
                {seconds > 0 ? (
                  <span className="font-semibold text-[#9a9a9a]">Resend in {seconds}s</span>
                ) : (
                  <button type="button" onClick={resend} className="font-semibold text-teal">
                    Resend code
                  </button>
                )}
              </p>
              {note && <p className="text-[12px] text-[#1c7a3f]">{note}</p>}
              {error && <p className="text-[13px] text-[#c0392b]">{error}</p>}
            </div>

            <div className="flex w-full flex-col items-center gap-[14px]">
              <button
                type="submit"
                className="w-full rounded-[50px] bg-teal px-4 py-[18px] text-center text-[14px] leading-5 tracking-[0.35px] text-teal-ink transition hover:brightness-95"
              >
                Verify &amp; continue
              </button>
              <Terms />
            </div>
          </form>

          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-sm">
              <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-teal/25 border-t-teal" />
              <span className="text-[14px] font-medium text-teal">Loading&hellip;</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
