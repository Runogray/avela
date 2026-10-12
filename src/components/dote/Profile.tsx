"use client";

import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { useRouter } from "next/navigation";
import { BackArrow } from "./BackArrow";
import { TopBar, Sidebar } from "./EventsHome";
import { SupportContent } from "./Support";
import { AvatarPicker } from "./AvatarPicker";
import { currentAvatarId, setAvatarId } from "@/lib/avatar";
import { changeEmail, changePassword, deleteAccount as deleteAccountApi, fetchMe, logout, updateMe, verifyEmail } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/api";

/* ------------------------------------------------------------------ *
 * Dote, Profile settings (Figma 14563:21106 Profile / 14563:20988
 * Change email / 14563:21056 OTP Verification). Mobile-first centred
 * flow: profile overview → change email → OTP, plus change name /
 * password, sign out and delete account. Reads/writes the mock session
 * in localStorage (dote.auth).
 * ------------------------------------------------------------------ */

type Auth = { name?: string; email?: string; gender?: string; joined?: string; at?: number };
type View = "home" | "email" | "otp" | "name" | "password" | "gender" | "support";

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

const DEFAULTS = { name: "", email: "", joined: "" };

function loadAuth(): Auth {
  try {
    return JSON.parse(localStorage.getItem("dote.auth") || "{}");
  } catch {
    return {};
  }
}
function saveAuth(patch: Auth) {
  try {
    const cur = loadAuth();
    localStorage.setItem("dote.auth", JSON.stringify({ ...cur, ...patch }));
  } catch {
    /* storage unavailable */
  }
}

export function Profile() {
  const router = useRouter();
  const [view, setView] = useState<View>("home");
  const [name, setName] = useState(DEFAULTS.name);
  const [email, setEmail] = useState(DEFAULTS.email);
  const [gender, setGender] = useState("");
  const [joined, setJoined] = useState(DEFAULTS.joined);
  const [pendingEmail, setPendingEmail] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarId, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    setAvatar(currentAvatarId());
    const a = loadAuth();
    if (a.name) setName(a.name);
    if (a.email) setEmail(a.email);
    if (a.gender) setGender(a.gender);
    // Refresh from the server (keeps name/email/gender/avatar authoritative).
    fetchMe()
      .then((u) => {
        if (u.name) setName(u.name);
        if (u.email) setEmail(u.email);
        if (u.gender) setGender(u.gender);
        if (u.avatar) setAvatar(u.avatar);
      })
      .catch(() => {});
    if (a.joined) setJoined(a.joined);
    else if (a.at) {
      const d = new Date(a.at);
      const day = d.getDate();
      const suf = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
      const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      setJoined(`${day}${suf} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`);
    }
  }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function signOut() {
    await logout(); // clears the API token + dote.auth (and dote.token)
    router.push("/login");
  }

  async function deleteAccount() {
    await deleteAccountApi(); // DELETE /auth/me + clear token/session
    try {
      localStorage.removeItem("dote.invites");
    } catch {
      /* ignore */
    }
    router.push("/");
  }

  // ------------------------------------------------------------- sub-views
  function renderSubView() {
    switch (view) {
      case "email":
        return (
          <ChangeEmail
            current={email}
            onBack={() => setView("home")}
            onContinue={async (next) => {
              try {
                await changeEmail(next); // sets new email (unverified) + sends OTP
              } catch (e) {
                alert(apiErrorMessage(e));
                return;
              }
              setPendingEmail(next);
              setView("otp");
            }}
          />
        );
      case "otp":
        return (
          <OtpVerify
            email={pendingEmail}
            onBack={() => setView("email")}
            onVerified={async (code) => {
              try {
                await verifyEmail(code);
              } catch {
                /* offline: optimistic */
              }
              setEmail(pendingEmail);
              saveAuth({ email: pendingEmail });
              setView("home");
              flash("Email updated");
            }}
          />
        );
      case "name":
        return (
          <EditScreen
            emoji="🧑"
            title="Change name"
            subtitle="Update the name shown on your account"
            label="Full name"
            initial={name}
            cta="Save changes"
            onBack={() => setView("home")}
            onSave={(v) => {
              setName(v);
              saveAuth({ name: v });
              updateMe({ name: v }).catch(() => {});
              setView("home");
              flash("Name updated");
            }}
          />
        );
      case "gender":
        return (
          <GenderScreen
            initial={gender}
            onBack={() => setView("home")}
            onSave={(v) => {
              setGender(v);
              saveAuth({ gender: v });
              updateMe({ gender: v }).catch(() => {});
              setView("home");
              flash("Gender updated");
            }}
          />
        );
      case "password":
        return (
          <ChangePassword
            onBack={() => setView("home")}
            onSave={async (next) => {
              try {
                await changePassword("", next);
              } catch {
                /* offline: keep UX optimistic */
              }
              setView("home");
              flash("Password updated");
            }}
          />
        );
      case "support":
        return (
          <FlowShell onBack={() => setView("home")} title="Help & support">
            <SupportContent />
          </FlowShell>
        );
      default:
        return null;
    }
  }

  // Shared profile pieces (used by both the mobile and desktop home).
  const hero = (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-[86px]">
        <button
          type="button"
          onClick={() => setAvatarOpen(true)}
          aria-label="Change avatar"
          className="grid size-full place-items-center overflow-hidden rounded-full border border-[#06aacf] bg-[#ebfffd] transition hover:brightness-95"
        >
          <UserAvatar className="size-[85px] rounded-full object-cover" />
        </button>
        <button
          type="button"
          onClick={() => setAvatarOpen(true)}
          aria-label="Change avatar"
          className="absolute bottom-0 right-0 grid place-items-center rounded-[10px] bg-[#06aacf] p-1 text-white transition hover:brightness-95"
        >
          <CameraIcon className="size-4" />
        </button>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-[16px] font-semibold tracking-[0.2px] text-[#0e0e0e]">{name}</p>
        <p className="text-[12px] tracking-[0.2px] text-[#737373]">Joined {joined}</p>
      </div>
    </div>
  );

  const sections = (
    <>
      <Section title="PERSONAL INFORMATION">
        <Row label="Full name" value={name} onClick={() => setView("name")} />
        <div className="h-10" />
        <Row label="Email" value={email} onClick={() => setView("email")} truncate />
        <div className="h-10" />
        <Row label="Gender" value={gender || "Not set"} muted={!gender} onClick={() => setView("gender")} />
      </Section>

      <Section title="PASSWORD">
        <Row value="************" onClick={() => setView("password")} />
      </Section>

      <Section title="KYC VERIFICATION">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-[6px] text-[14px] tracking-[0.2px] text-[#121212]">
            <VerifyBadge className="size-4 text-[#34c759]" />
            BVN
          </span>
          <span className="flex items-center gap-[6px] text-[14px] font-medium">
            <span className="text-[#777]">**** ****</span>
            <span className="text-[#1a1a1a]">224</span>
          </span>
        </div>
      </Section>

      <Section title="SUPPORT">
        <button type="button" onClick={() => setView("support")} className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2 text-[14px] tracking-[0.2px] text-[#525252]">
            <HelpIcon className="size-4 text-[#525252]" />
            Help &amp; support
          </span>
          <ChevronRight className="size-4 text-[#b5b5b5]" />
        </button>
      </Section>

      <Section title="ACCOUNT">
        <button type="button" onClick={signOut} className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2 text-[14px] tracking-[0.2px] text-[#525252]">
            <LogoutIcon className="size-4 text-[#525252]" />
            Sign out
          </span>
          <ChevronRight className="size-4 text-[#b5b5b5]" />
        </button>
        <div className="my-5 h-px w-full bg-[#ededed]" />
        <button type="button" onClick={() => setConfirmDelete(true)} className="flex w-full items-center justify-between">
          <span className="flex items-center gap-2 text-[14px] tracking-[0.2px] text-[#e12525]">
            <TrashIcon className="size-4 text-[#e12525]" />
            Delete account
          </span>
          <ChevronRight className="size-4 text-[#b5b5b5]" />
        </button>
      </Section>
    </>
  );

  return (
    <div className="font-dote text-black">
      {/* ============================ MOBILE ============================ */}
      <div className="min-h-screen bg-[#f8f8f8] lg:hidden">
        <div className="mx-auto w-full max-w-[440px]">
          <header className="grid grid-cols-[auto_1fr_auto] items-center bg-white px-6 py-[18px]">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="grid place-items-center rounded-[10px] border border-teal bg-[#cbf5ff]/30 p-[6px]"
            >
              <BackArrow className="size-4 text-teal" />
            </button>
            <p className="text-center text-[16px] font-semibold tracking-[0.2px] text-[#0e0e0e]">Profile</p>
            <span className="w-7" />
          </header>
          <section className="bg-white px-5 pb-6 pt-4">{hero}</section>
          <div className="flex flex-col gap-5 px-6 py-6">{sections}</div>
        </div>
      </div>

      {/* ============================ DESKTOP =========================== */}
      <div className="hidden h-screen flex-col overflow-hidden bg-[#f8f8f8] lg:flex">
        <TopBar section="Settings" />
        <div className="flex min-h-0 flex-1">
          <Sidebar active="settings" />
          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-10">
            <div className="mx-auto w-full max-w-[720px]">
              <h1 className="mb-6 text-[22px] font-medium tracking-[-0.8px] text-[#1c1611]">Profile</h1>
              {/* profile card */}
              <div className="rounded-[20px] bg-white p-8">{hero}</div>
              {/* sections */}
              <div className="mt-6 flex flex-col gap-6">{sections}</div>
            </div>
          </main>
        </div>
      </div>

      {/* ----------------------- sub-view (responsive) ------------------ */}
      {view !== "home" && (
        <div
          className="fixed inset-0 z-50 flex bg-white lg:items-center lg:justify-center lg:bg-black/50 lg:p-6"
          onClick={() => setView("home")}
        >
          <div
            className="h-full w-full lg:h-auto lg:max-h-[90vh] lg:max-w-[460px] lg:overflow-y-auto lg:rounded-[24px] lg:bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSubView()}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-8 z-[60] flex justify-center px-6">
          <div className="flex items-center gap-2 rounded-full bg-[#0e0e0e] px-5 py-3 text-[14px] font-medium text-white shadow-lg">
            <CheckIcon className="size-4 text-[#34c759]" />
            {toast}
          </div>
        </div>
      )}

      {avatarOpen && (
        <AvatarPicker
          current={avatarId}
          onClose={() => setAvatarOpen(false)}
          onSave={(id) => {
            setAvatarId(id);
            setAvatar(id);
            updateMe({ avatar: id }).catch(() => {});
            setAvatarOpen(false);
            flash("Avatar updated");
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6" onClick={() => setConfirmDelete(false)}>
          <div className="flex w-full max-w-[380px] flex-col gap-3 rounded-[20px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[16px] font-semibold text-[#0e0e0e]">Delete account?</p>
            <p className="text-[14px] leading-relaxed text-[#6e6558]">
              This permanently removes your account and data. This can&rsquo;t be undone.
            </p>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={deleteAccount}
                className="h-[46px] flex-1 rounded-[50px] bg-[#e12525] text-[14px] font-medium text-white transition hover:brightness-110"
              >
                Delete account
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-[46px] flex-1 rounded-[50px] border border-[#e0e0e0] text-[14px] font-medium text-[#5c5c5c] transition hover:bg-black/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- sections ------------------------------ */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-dote text-[14px] font-semibold tracking-[-0.2px] text-black">{title}</p>
      <div className="rounded-[16px] bg-white px-[18px] py-5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  onClick,
  truncate,
  muted,
}: {
  label?: string;
  value: string;
  onClick?: () => void;
  truncate?: boolean;
  muted?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 text-left">
      {label && <span className="shrink-0 text-[14px] tracking-[0.2px] text-[#525252]">{label}</span>}
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`text-[14px] font-medium tracking-[0.2px] ${muted ? "text-[#a3a3a3]" : "text-[#141414]"} ${
            truncate ? "truncate" : ""
          }`}
        >
          {value}
        </span>
        <ChevronRight className="size-4 shrink-0 text-[#b5b5b5]" />
      </span>
    </button>
  );
}

/* ----------------------------- change email ---------------------------- */
function ChangeEmail({
  current,
  onBack,
  onContinue,
}: {
  current: string;
  onBack: () => void;
  onContinue: (email: string) => void;
}) {
  const [value, setValue] = useState(current);
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim() !== current;
  return (
    <FlowShell onBack={onBack}>
      <Intro emoji="✉️" title="Change email" subtitle="Change your current email address" />
      <label className="mt-8 flex flex-col gap-[10px]">
        <span className="text-[14px] font-medium tracking-[-0.2px] text-[#221a10]">Email</span>
        <input
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="email"
          className={fieldClass}
        />
      </label>
      <Cta label="Continue" disabled={!ok} onClick={() => onContinue(value.trim())} />
    </FlowShell>
  );
}

/* --------------------------- OTP verification -------------------------- */
function OtpVerify({
  email,
  onBack,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onVerified: (code: string) => void;
}) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(60);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const full = digits.every((d) => d !== "");
  const code = digits.join("");

  useEffect(() => {
    if (full) {
      const t = setTimeout(() => onVerified(code), 260);
      return () => clearTimeout(t);
    }
  }, [full, code, onVerified]);

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

  return (
    <FlowShell onBack={onBack} title="OTP Verification">
      <Intro
        emoji="📮"
        title="Verify with email"
        subtitle={
          <>
            Enter the 6 digit code we sent to your email{" "}
            <span className="font-semibold text-[#141414]">{email}</span>
          </>
        }
      />
      <div className="mt-8 flex flex-col items-center gap-5">
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
              className="h-[52px] w-[44px] rounded-[14px] border border-[#e3e3e3] bg-white text-center text-[18px] font-semibold text-[#0e0e0e] caret-teal outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/15"
            />
          ))}
        </div>
        <p className="text-[12px] text-[#525252]">
          Didn&rsquo;t receive a code?{" "}
          {seconds > 0 ? (
            <span className="font-medium text-[#9a9a9a]">Resend in {seconds}s</span>
          ) : (
            <button type="button" onClick={() => setSeconds(60)} className="font-semibold text-teal">
              Resend code
            </button>
          )}
        </p>
      </div>
    </FlowShell>
  );
}

/* --------------------------- change password --------------------------- */
function ChangePassword({ onBack, onSave }: { onBack: () => void; onSave: (next: string) => void }) {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const ok = next.length >= 6 && next === confirm;
  return (
    <FlowShell onBack={onBack}>
      <Intro emoji="🔒" title="Change password" subtitle="Set a new password for your account" />
      <div className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-[10px]">
          <span className="text-[14px] font-medium tracking-[-0.2px] text-[#221a10]">New password</span>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={fieldClass} />
        </label>
        <label className="flex flex-col gap-[10px]">
          <span className="text-[14px] font-medium tracking-[-0.2px] text-[#221a10]">Confirm password</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" className={fieldClass} />
        </label>
        {confirm.length > 0 && next !== confirm && (
          <p className="text-[12px] text-[#e12525]">Passwords don&rsquo;t match.</p>
        )}
      </div>
      <Cta label="Save changes" disabled={!ok} onClick={() => onSave(next)} />
    </FlowShell>
  );
}

/* ------------------------- generic edit screen ------------------------- */
function EditScreen({
  emoji,
  title,
  subtitle,
  label,
  initial,
  cta,
  onBack,
  onSave,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  label: string;
  initial: string;
  cta: string;
  onBack: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const ok = value.trim().length > 0 && value.trim() !== initial;
  return (
    <FlowShell onBack={onBack}>
      <Intro emoji={emoji} title={title} subtitle={subtitle} />
      <label className="mt-8 flex flex-col gap-[10px]">
        <span className="text-[14px] font-medium tracking-[-0.2px] text-[#221a10]">{label}</span>
        <input value={value} onChange={(e) => setValue(e.target.value)} className={fieldClass} />
      </label>
      <Cta label={cta} disabled={!ok} onClick={() => onSave(value.trim())} />
    </FlowShell>
  );
}

/* ----------------------------- gender picker --------------------------- */
function GenderScreen({
  initial,
  onBack,
  onSave,
}: {
  initial: string;
  onBack: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const ok = value.length > 0 && value !== initial;
  return (
    <FlowShell onBack={onBack}>
      <Intro emoji="🧑‍🤝‍🧑" title="Gender" subtitle="Select the gender shown on your account" />
      <div className="mt-8 flex flex-col gap-3">
        {GENDERS.map((g) => {
          const on = value === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setValue(g)}
              className={`flex items-center justify-between rounded-[16px] border px-4 py-[18px] text-left text-[15px] font-medium transition ${
                on ? "border-teal bg-teal/5 text-[#0e0e0e]" : "border-[#edeceb] bg-white text-[#141414] hover:border-[#cfcfcf]"
              }`}
            >
              {g}
              <span
                className={`grid size-5 place-items-center rounded-full border ${
                  on ? "border-teal bg-teal text-white" : "border-[#cfcfcf]"
                }`}
              >
                {on && <CheckIcon className="size-3" />}
              </span>
            </button>
          );
        })}
      </div>
      <Cta label="Save changes" disabled={!ok} onClick={() => onSave(value)} />
    </FlowShell>
  );
}

/* ------------------------------ sub-shell ------------------------------ */
function FlowShell({
  children,
  onBack,
  title,
}: {
  children: React.ReactNode;
  onBack: () => void;
  title?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-dote text-black lg:min-h-0">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col lg:pb-6">
        <header className="grid grid-cols-[auto_1fr_auto] items-center px-6 py-[18px]">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="grid place-items-center rounded-[10px] border border-teal bg-[#cbf5ff]/30 p-[6px]"
          >
            <BackArrow className="size-4 text-teal" />
          </button>
          {title ? (
            <p className="text-center text-[16px] font-semibold tracking-[0.2px] text-[#0e0e0e]">{title}</p>
          ) : (
            <span />
          )}
          <span className="w-7" />
        </header>
        <div className="flex flex-1 flex-col px-6 pt-10">{children}</div>
      </div>
    </div>
  );
}

function Intro({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-[18px] text-center">
      <span className="text-[44px] leading-none">{emoji}</span>
      <div className="flex flex-col gap-2">
        <h1 className="font-dote text-[26px] font-semibold tracking-[-0.4px] text-[#1c1611]">{title}</h1>
        <p className="mx-auto max-w-[300px] text-[14px] leading-[22px] text-[#6e6558]">{subtitle}</p>
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

const fieldClass =
  "h-[64px] w-full rounded-[16px] border border-[#edeceb] bg-[#fafafa] px-4 text-[16px] font-medium text-[#1a1a1a] " +
  "outline-none transition placeholder:text-[#b9b9b9] focus:border-teal";

/* -------------------------------- icons -------------------------------- */
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 3a1 1 0 0 0-.8.4L7.2 5H5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3h-2.2l-1-1.6A1 1 0 0 0 15 3H9Zm3 5.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </svg>
  );
}
function VerifyBadge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 1 2.3 1.9 3 .1.8 2.9 2.4 1.8-.9 2.8.9 2.8-2.4 1.8-.8 2.9-3 .1L12 23l-2.3-1.9-3-.1-.8-2.9L3.5 16.3l.9-2.8-.9-2.8L5.9 8.9l.8-2.9 3-.1L12 1Z" />
      <path d="M10.6 14.6 8.4 12.4 7 13.8l3.6 3.6 6-6-1.4-1.4-4.6 4.6Z" fill="#fff" />
    </svg>
  );
}
function HelpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M15 12H5" />
    </svg>
  );
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4h6v3" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
