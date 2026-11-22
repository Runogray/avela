"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DoteLogo } from "./Logo";
import { BackArrow } from "./BackArrow";
import { ApiError } from "@/lib/api";
import { getGuestGift, giftNews, rememberGift, type GuestGift as Gift } from "@/lib/my-gifts";

/* ------------------------------------------------------------------ *
 * A guest's private gift page (/gift/<token>): what they gave, where
 * it is (sent, received) and the host's thank-you note. Reached from
 * the "Your gift" tag on the invite, the confirmation screen or the
 * guest's emails. No account needed: the link is the key.
 * ------------------------------------------------------------------ */

// Same occasion colours as the invite page's hero (EventOverview OCC).
const COVER: Record<string, string> = {
  wedding: "linear-gradient(135deg, #7EDFFF 0%, #00829f 100%)",
  birthday: "linear-gradient(135deg, #B3FF84 0%, #63991e 100%)",
  baby_shower: "linear-gradient(135deg, #FFB2FB 0%, #d4537e 100%)",
  graduation: "linear-gradient(135deg, #FFD27A 0%, #b8860b 100%)",
  farewell: "linear-gradient(135deg, #D9CCFF 0%, #5e548e 100%)",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${h}:${m}${d.getHours() < 12 ? "am" : "pm"}`;
}

function naira(kobo: number | null): string {
  return kobo == null ? "" : `₦${Math.round(kobo / 100).toLocaleString()}`;
}

export function GuestGift({ token }: { token: string }) {
  const router = useRouter();
  const [gift, setGift] = useState<Gift | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    getGuestGift(token)
      .then((g) => {
        if (!alive) return;
        setGift(g);
        // Opening the page counts as seeing the news, and remembers the gift
        // on this device (e.g. opened from an email on a new phone).
        const targetId = g.item?.id || g.goal?.id;
        if (targetId) rememberGift({ token, slug: g.event.slug, targetId, seen: giftNews(g) });
      })
      .catch((err) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 404) setMissing(true);
        else setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function copy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your gift link", url);
    }
  }

  if (missing || failed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FFFEF7] px-6 text-center font-dote">
        <DoteLogo />
        <p className="max-w-[340px] text-[16px] leading-relaxed text-[#6e6558]">
          {missing
            ? "We couldn’t find this gift. The host may have put it back on their list."
            : "We couldn’t load your gift. Check your connection and try again."}
        </p>
        {failed && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-[50px] bg-teal px-6 py-3 text-[14px] font-medium text-teal-ink"
          >
            Try again
          </button>
        )}
      </div>
    );
  }
  if (!gift) return <div className="min-h-screen bg-[#FFFEF7]" />;

  const ev = gift.event;
  const host = ev.host_first_name || "The host";
  const cash = gift.kind === "cash";
  const title = gift.item?.name || gift.goal?.name || "Cash gift";
  const declined = gift.stage === "not_received";
  const received = gift.stage === "received";
  const byCard = gift.method === "card";
  const paying = gift.stage === "paying";

  const steps: { label: string; when: string; done: boolean }[] = [
    {
      label: byCard ? "You paid by card" : cash ? "You sent it" : gift.stage === "held" ? "You’re buying it" : "You bought it",
      when: fmtWhen(gift.sent_at),
      done: gift.stage !== "started" && gift.stage !== "held" && !paying,
    },
    { label: `${host} received it`, when: fmtWhen(gift.received_at), done: received },
    { label: `${host} said thank you`, when: fmtWhen(gift.thanked_at), done: !!gift.thanked_at },
  ];

  return (
    <div className="min-h-screen bg-[#FFFEF7] font-dote text-black">
      {/* ============================ HERO ============================ */}
      <section className="relative h-[240px] w-full overflow-hidden sm:h-[300px]">
        <div className="absolute inset-0" style={{ background: COVER[ev.occasion] ?? COVER.wedding }} />
        {ev.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ev.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.35) 100%)" }}
        />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center px-6 py-5">
          <button
            type="button"
            onClick={() => router.push(`/i/${ev.slug}`)}
            aria-label="Back to the event"
            className="grid place-items-center rounded-[10px] border border-[#b7dee7] bg-white p-[6px]"
          >
            <BackArrow className="size-4 text-teal" />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1 px-6 pb-8 text-center text-white">
          <h1 className="font-italiana text-[32px] tracking-[-0.8px] sm:text-[42px]">Your gift</h1>
          <p className="text-[15px] text-white/85">{ev.title}</p>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-4 py-8 sm:px-6">
        {/* what they gave */}
        <section className="flex items-center gap-4 rounded-[20px] border border-[#e8f1f3] bg-white p-[18px]">
          {gift.item?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gift.item.image} alt="" className="size-[52px] shrink-0 rounded-[10px] object-cover" />
          ) : (
            <span className="grid size-[52px] shrink-0 place-items-center rounded-[10px] bg-[#f0f7f9] text-[24px]">
              {cash && !gift.item ? "💵" : "🎁"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-medium leading-[1.3] tracking-[-0.5px] text-[#1c1611]">{title}</p>
            <p className="mt-1 text-[13px] leading-[1.5] text-[#6e6558]">
              {cash
                ? byCard
                  ? `${naira(gift.amount_kobo)} paid by card${gift.fee_kobo ? ` (+ ${naira(gift.fee_kobo)} fee)` : ""}`
                  : `${naira(gift.amount_kobo)} by bank transfer${gift.reference ? ` · Ref ${gift.reference}` : ""}`
                : "You bought this gift from the wishlist"}
            </p>
          </div>
        </section>

        {/* where it is */}
        <section className="flex flex-col gap-4 rounded-[20px] border border-[#e8f1f3] bg-white p-[18px]">
          {paying ? (
            <div className="flex flex-col gap-3 rounded-[14px] border border-[#f1e0bd] bg-[#fffaf0] px-4 py-3 text-[14px] leading-relaxed text-[#7a5a1e]">
              <p>
                We&rsquo;re waiting for Paystack to confirm your payment. If you finished paying, this usually takes a
                few seconds. If you closed the payment page, nothing was charged; you can give again from the event.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="h-[38px] rounded-[50px] bg-teal px-4 text-[13px] font-medium text-teal-ink transition hover:brightness-95"
                >
                  Check again
                </button>
                <a
                  href={`/i/${ev.slug}`}
                  className="flex h-[38px] items-center rounded-[50px] border border-teal/40 bg-white px-4 text-[13px] font-medium text-teal transition hover:bg-teal/5"
                >
                  Back to the event
                </a>
              </div>
            </div>
          ) : declined ? (
            <div className="rounded-[14px] border border-[#f1e0bd] bg-[#fffaf0] px-4 py-3 text-[14px] leading-relaxed text-[#7a5a1e]">
              {`${host} hasn’t received this transfer. If you sent it, check with your bank that it went through. If you haven’t sent it yet, you can give again from the event page.`}
            </div>
          ) : (
            <ol className="flex flex-col">
              {steps.map((s, i) => (
                <li key={s.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid size-[22px] shrink-0 place-items-center rounded-full ${
                        s.done ? "bg-teal text-teal-ink" : "border-2 border-[#d0ebf1] bg-white"
                      }`}
                    >
                      {s.done && (
                        <svg viewBox="0 0 16 16" fill="none" className="size-[12px]" aria-hidden="true">
                          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {i < steps.length - 1 && (
                      <span className={`my-1 w-[2px] flex-1 ${steps[i + 1].done ? "bg-teal" : "bg-[#d0ebf1]"}`} />
                    )}
                  </div>
                  <div className={`flex flex-col ${i === steps.length - 1 ? "" : "pb-5"}`}>
                    <p className={`text-[15px] font-medium leading-[22px] ${s.done ? "text-[#1c1611]" : "text-[#9a9a9a]"}`}>
                      {s.label}
                    </p>
                    {s.done && s.when && <p className="text-[13px] text-[#6e6558]">{s.when}</p>}
                    {!s.done && i === 1 && steps[0].done && (
                      <p className="text-[13px] leading-relaxed text-[#6e6558]">
                        {cash
                          ? `${host} will confirm once the transfer lands in their account.`
                          : `${host} will confirm once the gift arrives.`}
                      </p>
                    )}
                    {s.done && i === 1 && byCard && (
                      <p className="text-[13px] leading-relaxed text-[#6e6558]">Paid straight into their bank account.</p>
                    )}
                    {!s.done && i === 0 && (
                      <p className="text-[13px] leading-relaxed text-[#6e6558]">
                        {gift.stage === "held"
                          ? "Finish buying it, then tap “I’ve bought it” on the event page."
                          : "Waiting for you to send the transfer."}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* the thank-you */}
        <section className="flex flex-col gap-3 rounded-[20px] bg-[#f0f7f9] p-[22px]">
          <h2 className="font-italiana text-[26px] tracking-[-0.8px] text-[#1c1611]">Thank you</h2>
          {gift.thanked_at && gift.thank_you_message ? (
            <>
              <p className="whitespace-pre-line text-[16px] leading-[1.7] text-[#1c1611]">{gift.thank_you_message}</p>
              <p className="text-[14px] font-medium text-teal">{`— ${host}`}</p>
            </>
          ) : (
            <p className="text-[15px] leading-relaxed text-[#5c5c5c]">
              {`When ${host} sends you a thank-you note, it will appear here.`}
            </p>
          )}
        </section>

        {/* keep the link */}
        <section className="flex flex-col items-center gap-3 px-2 pt-2 text-center">
          <p className="max-w-[380px] text-[14px] leading-relaxed text-[#6e6558]">
            This page is private to you. Save the link to come back to it on any device.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="h-[44px] rounded-[50px] border border-teal bg-white px-5 text-[14px] font-medium text-teal transition hover:bg-teal/5"
            >
              {copied ? "Link copied" : "Copy link"}
            </button>
            <a
              href={`/i/${ev.slug}`}
              className="flex h-[44px] items-center rounded-[50px] bg-teal px-5 text-[14px] font-medium text-teal-ink transition hover:brightness-95"
            >
              Back to the event
            </a>
          </div>
        </section>

        <div className="flex justify-center pt-4 pb-2">
          <DoteLogo />
        </div>
      </main>
    </div>
  );
}
