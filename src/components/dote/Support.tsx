"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ *
 * Avela, Support content (lives inside Settings/Profile as a sub-view).
 * Simple: email + socials (TikTok, Instagram, WhatsApp) + a short FAQ.
 * ------------------------------------------------------------------ */

const EMAIL = "support@avela.app";
const WHATSAPP = "2348000000000"; // placeholder

const SOCIALS: { label: string; href: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { label: "TikTok", href: "https://www.tiktok.com/@avela", Icon: TikTokIcon },
  { label: "Instagram", href: "https://www.instagram.com/avela", Icon: InstagramIcon },
  { label: "WhatsApp", href: `https://wa.me/${WHATSAPP}`, Icon: WhatsAppIcon },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do guests send gifts or contribute?",
    a: "They open your invite link, pick a gift from your wishlist or contribute any amount, no account needed.",
  },
  {
    q: "When do contributions reach my wallet?",
    a: "As soon as the payment is confirmed, usually within minutes. You’ll see each one in Transactions.",
  },
  {
    q: "How do I withdraw my funds?",
    a: "Open Wallet → Withdraw. First time you’ll verify your BVN, add a bank account and set a PIN; after that just enter an amount.",
  },
];

/** The support content, rendered inside the Profile "Help & support" sub-view. */
export function SupportContent() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[14px] leading-[21px] text-[#6e6558]">
        Reach us by email or on social and we’ll get back to you. Common questions are below.
      </p>

      {/* email */}
      <a
        href={`mailto:${EMAIL}`}
        className="flex items-center gap-3 rounded-[18px] border border-[#e7f3f6] bg-white p-4 transition hover:border-teal/50"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#dff6fb] text-teal">
          <MailIcon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-[#1c1611]">Email us</span>
          <span className="block truncate text-[13px] text-[#6e6e6e]">{EMAIL}</span>
        </span>
        <span className="text-[13px] font-medium text-teal">Send</span>
      </a>

      {/* socials */}
      <div className="rounded-[18px] border border-[#e7f3f6] bg-white p-4">
        <p className="text-[13px] font-medium text-[#6e6558]">Or reach us on social</p>
        <div className="mt-3 flex gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              title={s.label}
              className="grid size-11 place-items-center rounded-full bg-[#f1f7f8] text-[#1c1611] transition hover:bg-teal hover:text-white"
            >
              <s.Icon className="size-5" />
            </a>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="flex flex-col gap-2">
        <p className="mb-1 text-[14px] font-semibold tracking-[-0.2px] text-[#1c1611]">Common questions</p>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="overflow-hidden rounded-[14px] border border-[#e7eff0] bg-white">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-[14px] text-left"
              >
                <span className="text-[14px] font-medium text-[#1c1611]">{f.q}</span>
                <ChevronDown className={`size-4 shrink-0 text-[#8aa0a3] transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && <p className="px-4 pb-4 text-[13px] leading-[20px] text-[#5f5f5f]">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- icons -------------------------------- */
function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
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
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.45 1.34 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.35c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.25.86 5.8 2.41a8.14 8.14 0 0 1 2.4 5.8c0 4.53-3.68 8.2-8.2 8.2Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.13-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43l-.48-.01c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.54.12.16 1.73 2.64 4.19 3.7.59.25 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z"/>
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82a4.28 4.28 0 0 1-2.6-3.82h-3.1v12.6a2.4 2.4 0 1 1-2.1-2.38V8.98a5.5 5.5 0 1 0 5.2 5.49V8.9a7.3 7.3 0 0 0 4.2 1.33V7.13a4.3 4.3 0 0 1-1.6-.31Z"/>
    </svg>
  );
}
