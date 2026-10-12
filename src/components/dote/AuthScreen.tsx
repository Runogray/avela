"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { DoteLogo } from "./Logo";
import { login, register, saveMockSession } from "@/lib/auth";
import { markAvatarOnboarding } from "@/lib/avatar";
import { apiErrorMessage, isNetworkError } from "@/lib/api";

type Mode = "create" | "login";

/**
 * Dote account creation + sign-in, one screen with a Create/Login toggle.
 * Faithful to the Figma: full-bleed celebration photo behind a frosted-glass
 * form panel, teal primary action.
 */
export function AuthScreen({ initialMode = "create" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPass, setShowPass] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const afterAuth = () =>
    router.push(mode === "create" ? `/verify${email ? `?email=${encodeURIComponent(email)}` : ""}` : "/");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (mode === "create") {
        await register({ name: name.trim(), email: email.trim(), password });
        markAvatarOnboarding(); // the dashboard will prompt them to pick an avatar
      } else {
        await login({ email: email.trim(), password });
      }
      afterAuth(); // navigates away; keep busy=true so the button stays disabled
    } catch (err) {
      if (isNetworkError(err)) {
        // Backend unreachable, keep the mock flow working (offline/preview).
        saveMockSession({ name, email });
        if (mode === "create") markAvatarOnboarding();
        afterAuth();
        return;
      }
      setError(apiErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-petrol-ink font-dote-body">
      {/* full-bleed celebration photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dote/hero.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

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

      {/* frosted form panel */}
      <div className="relative z-10 flex min-h-screen justify-center lg:justify-end lg:p-4">
        <div className="flex w-full items-center justify-center bg-white/90 px-6 py-14 backdrop-blur-xl lg:w-[630px] lg:max-w-[48%] lg:rounded-[40px]">
          <div className="w-full max-w-[354px]">
            <DoteLogo />

            <div className="mt-4">
              <h1 className="font-dote text-[28px] font-medium leading-tight tracking-[-0.66px] text-black">
                Let&rsquo;s get you started!
              </h1>
              <p className="mt-2 max-w-[328px] text-[14px] leading-[22px] text-dote-sub">
                Create an event to receive gifts, RSVPs, and good wishes for your wedding,
                birthday, or baby shower
              </p>
            </div>

            {/* Login / Create toggle */}
            <div className="mt-6 flex rounded-[28px] border border-field-line bg-field-alt">
              <Tab active={mode === "login"} onClick={() => setMode("login")}>
                Login to account
              </Tab>
              <Tab active={mode === "create"} onClick={() => setMode("create")}>
                Create account
              </Tab>
            </div>

            <form className="mt-8 flex flex-col gap-8" onSubmit={submit}>
              <div className="flex flex-col gap-5">
                {mode === "create" && (
                  <Field label="What's your full name?" htmlFor="name">
                    <input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Amara Okafor"
                      autoComplete="name"
                      className={inputClass}
                    />
                  </Field>
                )}

                <Field label="Email" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label={mode === "create" ? "Create password" : "Password"}
                  htmlFor="password"
                >
                  <div className="relative">
                    <input
                      id="password"
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === "create" ? "new-password" : "current-password"}
                      className={cn(inputClass, "pr-12")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/dote/eye.svg" alt="" className="h-4 w-4" />
                    </button>
                  </div>
                </Field>

                {mode === "login" && (
                  <Link href="/forgot-password" className="-mt-2 self-end text-[13px] font-medium text-dote-link">
                    Forgot password?
                  </Link>
                )}
              </div>

              <div className="flex flex-col items-center gap-[14px]">
                {error && (
                  <p className="w-full rounded-[12px] bg-[#fdeeec] px-4 py-3 text-center text-[13px] text-[#c0392b]">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-[50px] bg-teal px-4 py-[18px] text-center text-[14px] leading-5 tracking-[0.35px] text-teal-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {busy
                    ? mode === "create"
                      ? "Creating account…"
                      : "Logging in…"
                    : mode === "create"
                      ? "Create account"
                      : "Log in"}
                </button>
                <Terms />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-[64px] w-full rounded-[16px] border border-sky-line bg-field px-4 py-[14px] font-dote-input " +
  "text-[16px] font-medium text-black outline-none placeholder:text-[#b9b9b9] focus:border-teal " +
  "focus:ring-2 focus:ring-teal/15";

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[20px] py-3 text-center text-[14px] tracking-[-0.66px] transition",
        active ? "bg-petrol text-white" : "text-dote-muted"
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <label
        htmlFor={htmlFor}
        className="text-[14px] font-medium tracking-[-0.66px] text-dote-label"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function Terms() {
  return (
    <p className="max-w-[263px] text-center text-[12px] leading-4 text-[#5d5d5d]">
      By continuing you agree to our{" "}
      <a href="#" className="text-dote-link">
        Terms of Service
      </a>{" "}
      and{" "}
      <a href="#" className="text-dote-link">
        Privacy Policy
      </a>
    </p>
  );
}
