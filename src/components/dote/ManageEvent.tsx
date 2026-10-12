"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Sidebar } from "./EventsHome";

/* ------------------------------------------------------------------ *
 * Dote, Manage event (mobile, Figma 14544:12491). The host's view of a
 * published celebration: hero + invite link, welcome message, details,
 * gallery, the wishlist with contribution progress, and a thank-you.
 * Serif display headings use Italiana (font-italiana).
 * ------------------------------------------------------------------ */

const PAGE_BG = "#FBF8F0"; // warm cream, the Manage page is a flat bg, not the lilac gradient
// Per-occasion welcome note (fallback when the host didn't add a description).
// Wedding copy is verbatim from Figma.
const WELCOME_NOTES: Record<string, string> = {
  wedding:
    "Join us as we say “I do” and begin our forever. Surrounded by the people we love most, we’re celebrating the start of our journey as husband and wife with vows, laughter,",
  birthday:
    "Come celebrate another year worth celebrating. Surrounded by the people we love most, we’re making this day one to remember with cake, music, laughter,",
  baby:
    "A little one is on the way and our hearts are overflowing. Surrounded by the people we love most, we’re celebrating this sweet new beginning with love, joy, laughter,",
};

type WishItem = {
  id: string;
  type: "monetary" | "physical";
  name: string;
  emoji: string;
  image?: string | null;
  anyAmount: boolean;
  amount: number;
};
type StoredEvent = {
  id: string;
  title: string;
  occasion: string;
  category?: string;
  date: string;
  time: string;
  venue: string;
  dress?: string;
  description?: string;
  cover: string | null;
  gallery?: string[];
  items?: WishItem[];
  wishes: number;
  createdAt: number;
};

const OCC: Record<string, { label: string; cover: string }> = {
  wedding: { label: "Wedding", cover: "linear-gradient(135deg, #7EDFFF 0%, #00829f 100%)" },
  birthday: { label: "Birthday", cover: "linear-gradient(135deg, #B3FF84 0%, #63991e 100%)" },
  baby: { label: "Baby shower", cover: "linear-gradient(135deg, #FFB2FB 0%, #d4537e 100%)" },
};
// Each wish card wears a full, coordinated colour theme (card tint, border,
// icon tile, progress track + fill, "raised" text), exactly like the Figma
// UI, where card 1 is cyan, card 2 green, card 3 purple, etc. The theme is
// picked by a stable hash of the item id, so it's random-looking but doesn't
// shift on re-render/reload.
type WishTheme = {
  card: string;
  border: string;
  tile: string;
  track: string;
  fill: string;
  raised: string;
};
const WISH_THEMES: WishTheme[] = [
  { card: "#f4fdff", border: "#d5eaef", tile: "#caf5ff", track: "#d7f1f6", fill: "#06aacf", raised: "#00829f" }, // cyan
  { card: "#f5fff4", border: "#d6efd5", tile: "#e5f6d7", track: "#e5f6d7", fill: "#3ccf06", raised: "#1a9f00" }, // green
  { card: "#fff4ff", border: "#efd5ec", tile: "#f6d7f6", track: "#f6d7f6", fill: "#a306cf", raised: "#72009f" }, // purple
  { card: "#fff8f1", border: "#efe2d5", tile: "#ffe6cc", track: "#f6e6d7", fill: "#f19026", raised: "#b5610a" }, // orange
  { card: "#fff4f6", border: "#efd5da", tile: "#ffd7e4", track: "#f6d7de", fill: "#f72d99", raised: "#b00a5e" }, // pink
  { card: "#f4f6ff", border: "#d5daef", tile: "#d7e0ff", track: "#d7ddf6", fill: "#2f6fed", raised: "#0a3fb0" }, // blue
];
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
function themeForItem(id: string): WishTheme {
  return WISH_THEMES[hashId(id) % WISH_THEMES.length];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso: string): string {
  if (!iso) return "Date to be set";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "Date to be set";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
function fmtTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${ampm}` : `${h12}${ampm}`;
}
function slug(s: string) {
  return s.trim().replace(/\s+/g, "").replace(/[^\w#&-]/g, "") || "event";
}

export function ManageEvent({ id }: { id: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<StoredEvent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const list: StoredEvent[] = JSON.parse(localStorage.getItem("dote.events") || "[]");
      setEvent(list.find((e) => e.id === id) ?? null);
    } catch {
      setEvent(null);
    }
    setLoaded(true);
  }, [id]);

  if (!loaded) return <div className="min-h-screen" style={{ background: PAGE_BG }} />;

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center font-dote" style={{ background: PAGE_BG }}>
        <p className="font-italiana text-[24px] text-[#1c1611]">Event not found</p>
        <p className="text-[14px] text-[#6e6558]">This celebration may have been deleted.</p>
        <button
          type="button"
          onClick={() => router.push("/events")}
          className="rounded-[50px] bg-teal px-6 py-3 text-[14px] font-medium text-teal-ink"
        >
          Back to events
        </button>
      </div>
    );
  }

  const occ = OCC[event.occasion] ?? OCC.wedding;
  const cover = event.cover ?? event.gallery?.[0] ?? null;
  const category = event.category || occ.label;
  const gallery = event.gallery ?? [];
  const items = event.items ?? [];
  const link = `/e/${slug(event.title)}`;

  function copyLink() {
    try {
      navigator.clipboard?.writeText(`${window.location.origin}${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const welcomeText = event.description?.trim() || WELCOME_NOTES[event.occasion] || WELCOME_NOTES.wedding;

  return (
    <div className="min-h-screen font-dote" style={{ background: PAGE_BG }}>
      {/* ===================== MOBILE (≤ lg) ===================== */}
      <div className="mx-auto w-full max-w-[440px] lg:hidden">
        {/* ============================= HERO ============================= */}
        <div className="relative h-[514px] overflow-hidden">
          <div className="absolute inset-0" style={{ background: occ.cover }} />
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.6) 100%)" }}
          />

          {/* header */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-[52px]">
            <button
              type="button"
              onClick={() => router.push("/events")}
              aria-label="Back"
              className="grid place-items-center rounded-[10px] border border-[#b7dee7] bg-white p-1.5"
            >
              <ChevronLeft className="size-4 text-teal" />
            </button>
            <button type="button" aria-label="Settings">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/dote/setting-3.svg" alt="" className="size-6" />
            </button>
          </div>

          {/* centered title + link */}
          <div className="absolute inset-x-0 top-[200px] flex flex-col items-center gap-[28px] px-[103px] text-center">
            <div className="flex flex-col items-center gap-[10px] [text-shadow:0_2px_16px_rgba(0,0,0,0.7)]">
              <h1 className="font-dote text-[28px] font-normal leading-none tracking-[-0.8px] text-white">
                {event.title}
              </h1>
              <p className="text-[16px] font-semibold text-white">{category}</p>
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-[#6fe0f9] bg-black/[0.41] px-3 py-2 text-[12px] tracking-[-0.4px] text-white"
            >
              <LinkIcon className="size-[14px]" />
              {copied ? "Link copied" : link}
            </button>
          </div>
        </div>

        {/* ============================ WELCOME =========================== */}
        <section className="flex flex-col items-center gap-[14px] px-6 pb-2 pt-9 text-center">
          <h2 className="font-italiana text-[24px] tracking-[-0.8px] text-black">Welcome to my event</h2>
          <p className="text-[16px] leading-[22px] tracking-[-0.4px] text-black">
            {event.description?.trim() || WELCOME_NOTES[event.occasion] || WELCOME_NOTES.wedding}
          </p>
        </section>

        {/* ============================ DETAILS =========================== */}
        <section className="mt-9 flex flex-col">
          {event.dress && (
            <DetailRow label="Dress code">
              <p className="text-[14px] tracking-[-0.8px] text-black">{event.dress}</p>
              <div className="mt-2 flex gap-2">
                <span className="h-3 w-8 rounded-[3px] bg-black" />
                <span className="h-3 w-8 rounded-[3px] bg-[#5f7eef]" />
              </div>
            </DetailRow>
          )}
          <DetailRow label="Date">
            <p className="flex items-center gap-3 text-[14px] tracking-[-0.8px] text-black">
              <span>{fmtDate(event.date)}</span>
              {fmtTime(event.time) && (
                <>
                  <span className="text-[#9a9a9a]">·</span>
                  <span>{fmtTime(event.time)}</span>
                </>
              )}
            </p>
          </DetailRow>
          <DetailRow label="Venue">
            <p className="text-[14px] tracking-[-0.8px] text-black">{event.venue || "Venue to be set"}</p>
          </DetailRow>
        </section>

        {/* ============================ GALLERY =========================== */}
        {gallery.length > 0 && (
          <section className="mt-9 bg-[#0e1012] px-6 py-6">
            <div className="grid grid-cols-2 gap-[3px] overflow-hidden rounded-[16px]">
              {gallery.slice(0, 4).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="aspect-[176/194] w-full object-cover" />
              ))}
            </div>
            <button
              type="button"
              onClick={() => router.push(`/events/${event.id}/gallery`)}
              className="mx-auto mt-5 flex h-[48px] w-[171px] items-center justify-center rounded-[50px] bg-teal text-[14px] tracking-[0.35px] text-teal-ink"
            >
              Gallery
            </button>
          </section>
        )}

        {/* ========================== WISHLIST ============================ */}
        {items.length > 0 && (
          <section className="mt-9 px-6">
            <h2 className="font-italiana text-[24px] tracking-[-0.8px] text-black">A List of Little Wishes</h2>
            <div className="mt-5 flex flex-col gap-3">
              {items.slice(0, 3).map((it) => (
                <WishRow key={it.id} item={it} theme={themeForItem(it.id)} />
              ))}
            </div>
            <button
              type="button"
              className="mx-auto mt-6 flex h-[48px] w-[171px] items-center justify-center rounded-[50px] bg-teal text-[14px] tracking-[0.35px] text-teal-ink"
            >
              View Wishlist
            </button>
          </section>
        )}

        {/* =========================== THANK YOU ========================== */}
        <section className="mt-9 bg-[#eef7fb] px-10 py-12 text-center">
          <h2 className="font-italiana text-[24px] tracking-[-0.8px] text-black">Thank you</h2>
          <p className="mx-auto mt-3 max-w-[320px] text-[14px] leading-[19px] tracking-[-0.2px] text-[#3a3a3a]">
            We&rsquo;re overflowing with gratitude. Thank you for your love, your presence, and your
            generous gift
          </p>
          <p className="mt-9 text-[16px] text-[#1c1611]">{event.title}</p>
        </section>
      </div>

      {/* ===================== DESKTOP (lg +) ===================== */}
      <div className="hidden h-screen flex-col overflow-hidden lg:flex">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
            <div className="mx-auto w-full max-w-[1040px]">
              {/* back */}
              <button
                type="button"
                onClick={() => router.push("/events")}
                className="mb-6 flex items-center gap-2 text-[13px] font-medium text-[#4a4a4a] transition hover:text-[#1c1611]"
              >
                <ChevronLeft className="size-4" />
                Back to events
              </button>

              {/* hero */}
              <div className="relative h-[360px] overflow-hidden rounded-[24px]">
                <div className="absolute inset-0" style={{ background: occ.cover }} />
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.5) 100%)" }}
                />
                <button type="button" aria-label="Settings" className="absolute right-6 top-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/dote/setting-3.svg" alt="" className="size-7" />
                </button>
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 px-6 pb-10 text-center">
                  <div className="flex flex-col items-center gap-2 [text-shadow:0_2px_16px_rgba(0,0,0,0.7)]">
                    <h1 className="font-dote text-[40px] font-normal leading-none tracking-[-1px] text-white">
                      {event.title}
                    </h1>
                    <p className="text-[18px] font-semibold text-white">{category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex items-center justify-center gap-2 rounded-[10px] border border-[#6fe0f9] bg-black/[0.41] px-4 py-2.5 text-[13px] tracking-[-0.4px] text-white transition hover:bg-black/[0.55]"
                  >
                    <LinkIcon className="size-[15px]" />
                    {copied ? "Link copied" : link}
                  </button>
                </div>
              </div>

              {/* two-column body */}
              <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[1.5fr_1fr]">
                {/* left */}
                <div className="flex flex-col gap-7">
                  {/* welcome */}
                  <section className="rounded-[20px] border border-[#ece3d2] bg-white px-8 py-8 text-center">
                    <h2 className="font-italiana text-[26px] tracking-[-0.8px] text-black">Welcome to my event</h2>
                    <p className="mx-auto mt-3 max-w-[560px] text-[16px] leading-[24px] tracking-[-0.4px] text-black">
                      {welcomeText}
                    </p>
                  </section>

                  {/* details */}
                  <section className="divide-y divide-[#eadfce] rounded-[20px] border border-[#ece3d2] bg-white px-8">
                    {event.dress && (
                      <div className="flex items-start justify-between gap-6 py-6">
                        <p className="font-italiana text-[18px] tracking-[-0.8px] text-black">Dress code</p>
                        <div className="text-right">
                          <p className="text-[15px] tracking-[-0.4px] text-black">{event.dress}</p>
                          <div className="mt-2 flex justify-end gap-2">
                            <span className="h-3 w-8 rounded-[3px] bg-black" />
                            <span className="h-3 w-8 rounded-[3px] bg-[#5f7eef]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-6 py-6">
                      <p className="font-italiana text-[18px] tracking-[-0.8px] text-black">Date</p>
                      <p className="flex items-center gap-3 text-[15px] tracking-[-0.4px] text-black">
                        <span>{fmtDate(event.date)}</span>
                        {fmtTime(event.time) && (
                          <>
                            <span className="text-[#9a9a9a]">·</span>
                            <span>{fmtTime(event.time)}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-6 py-6">
                      <p className="font-italiana text-[18px] tracking-[-0.8px] text-black">Venue</p>
                      <p className="text-right text-[15px] tracking-[-0.4px] text-black">
                        {event.venue || "Venue to be set"}
                      </p>
                    </div>
                  </section>

                  {/* gallery */}
                  {gallery.length > 0 && (
                    <section className="rounded-[20px] bg-[#0e1012] p-6">
                      <div className="grid grid-cols-4 gap-[4px] overflow-hidden rounded-[16px]">
                        {gallery.slice(0, 4).map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={src} alt="" className="aspect-square w-full object-cover" />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push(`/events/${event.id}/gallery`)}
                        className="mx-auto mt-5 flex h-[48px] w-[171px] items-center justify-center rounded-[50px] bg-teal text-[14px] tracking-[0.35px] text-teal-ink transition hover:brightness-95"
                      >
                        Gallery
                      </button>
                    </section>
                  )}
                </div>

                {/* right, wishlist (sticky) */}
                {items.length > 0 && (
                  <aside className="h-fit rounded-[20px] border border-[#ece3d2] bg-white px-6 py-7 lg:sticky lg:top-8">
                    <h2 className="font-italiana text-[24px] tracking-[-0.8px] text-black">A List of Little Wishes</h2>
                    <div className="mt-5 flex flex-col gap-3">
                      {items.slice(0, 3).map((it) => (
                        <WishRow key={it.id} item={it} theme={themeForItem(it.id)} />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mx-auto mt-6 flex h-[48px] w-full max-w-[220px] items-center justify-center rounded-[50px] bg-teal text-[14px] tracking-[0.35px] text-teal-ink transition hover:brightness-95"
                    >
                      View Wishlist
                    </button>
                  </aside>
                )}
              </div>

              {/* thank you */}
              <section className="mt-8 rounded-[20px] bg-[#eef7fb] px-10 py-14 text-center">
                <h2 className="font-italiana text-[28px] tracking-[-0.8px] text-black">Thank you</h2>
                <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-[21px] tracking-[-0.2px] text-[#3a3a3a]">
                  We&rsquo;re overflowing with gratitude. Thank you for your love, your presence, and your
                  generous gift
                </p>
                <p className="mt-8 text-[18px] text-[#1c1611]">{event.title}</p>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[14px] px-6 py-[14px]">
      <div className="h-px w-full bg-[#eadfce]" />
      <div className="flex flex-col gap-[14px]">
        <p className="font-italiana text-[20px] tracking-[-0.8px] text-black">{label}</p>
        <div>{children}</div>
      </div>
    </div>
  );
}

function WishRow({ item, theme }: { item: WishItem; theme: WishTheme }) {
  const target = item.amount || 0;
  // Deterministic mock progress so each bar shows a different-length fill in
  // its (randomised) colour. Stable per item id, varies 25% to 74%. Works for
  // "Any amount" wishes too (no target) so those bars still show a colour.
  const pct = 25 + (hashId(item.id) % 50);
  const raised = target > 0 ? Math.round((target * pct) / 100) : 0;
  return (
    <div
      className="rounded-[18px] border p-[17px]"
      style={{ background: theme.card, borderColor: theme.border }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" className="size-[38px] shrink-0 rounded-[8px] object-cover" />
          ) : (
            <span
              className="grid size-[38px] shrink-0 place-items-center rounded-[8px] text-[20px]"
              style={{ background: theme.tile }}
            >
              {item.emoji}
            </span>
          )}
          <div>
            <p className="text-[14px] font-medium leading-[1.4] tracking-[-0.5px] text-black">{item.name}</p>
            <p className="flex gap-[3px] text-[12px] leading-[1.4] tracking-[-0.5px]">
              <span className="text-[#636363]">Cash</span>
              <span className="text-[#636363]">·</span>
              <span className="text-[#101010]">
                {item.anyAmount ? "Any amount" : `₦${item.amount.toLocaleString()}`}
              </span>
            </p>
          </div>
        </div>
        <ArrowRight className="size-4 shrink-0 text-[#1c1611]" />
      </div>
      <div className="mt-[14px] flex flex-col gap-[6px]">
        <div
          className="h-[6px] w-full overflow-hidden rounded-[6px]"
          style={{ background: theme.track }}
        >
          <div className="h-full rounded-[6px]" style={{ width: `${pct}%`, background: theme.fill }} />
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span>
            <span className="font-semibold" style={{ color: theme.raised }}>₦{raised.toLocaleString()}</span>{" "}
            <span className="text-[#5b5b5b]">raised</span>
          </span>
          <span>
            <span className="text-[#5b5b5b]">{item.anyAmount ? "limit" : "of"}</span>{" "}
            <span className="font-semibold text-[#191919]">₦{(item.amount || 0).toLocaleString()}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ icons ----------------------------- */

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
  );
}
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7" /></svg>
  );
}
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  );
}
