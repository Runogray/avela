import { apiFetch } from "./api";

/* ------------------------------------------------------------------ *
 * A guest's own gifts. Guests have no account, so each gift has a
 * private link (/gift/<token>) that shows where it is and the host's
 * thank-you note. This device also remembers the gifts it gave, so the
 * event page can tag them "Your gift" and flag news with a dot.
 * ------------------------------------------------------------------ */

export type GiftStage = "started" | "held" | "sent" | "received" | "not_received";

export interface GuestGift {
  kind: "cash" | "item";
  stage: GiftStage;
  giver_name: string;
  amount_kobo: number | null;
  reference: string;
  item: { id: string; name: string; price_kobo: number | null; image: string; link: string } | null;
  goal: { id: string; name: string } | null;
  event: {
    slug: string;
    title: string;
    occasion: string;
    category: string;
    host_first_name: string;
    cover_image: string;
    starts_at: string;
  };
  created_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  thank_you_message: string;
  thanked_at: string | null;
}

export function getGuestGift(token: string) {
  return apiFetch<GuestGift>(`/my-gifts/${encodeURIComponent(token)}/`, { auth: false });
}

export function giftPagePath(token: string) {
  return `/gift/${token}`;
}

/** What's new on a gift, for the dot: the furthest thing that has happened. */
export function giftNews(g: GuestGift): string {
  if (g.thanked_at) return "thanked";
  return g.stage;
}

/** News worth a dot: anything after the guest's own "I've sent / bought it". */
export function isNews(key: string) {
  return key === "received" || key === "thanked" || key === "not_received";
}

type SavedGift = {
  token: string;
  slug: string;
  /** The wishlist item or cash goal the gift went to. */
  targetId: string;
  /** The news the guest has already seen (see giftNews). */
  seen: string;
  at: number;
};

const KEY = "avela.myGifts";

function readAll(): SavedGift[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeAll(all: SavedGift[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 100)));
  } catch {
    /* storage unavailable: the emailed / saved link still works */
  }
}

/** Remember a gift this device just gave (or opened from its link). */
export function rememberGift(g: { token: string; slug: string; targetId: string; seen?: string }) {
  const all = readAll();
  const old = all.find((s) => s.token === g.token);
  const rest = all.filter((s) => s.token !== g.token);
  writeAll([{ token: g.token, slug: g.slug, targetId: g.targetId, seen: g.seen ?? old?.seen ?? "sent", at: old?.at ?? Date.now() }, ...rest]);
}

export function savedGiftsFor(slug: string): SavedGift[] {
  return readAll().filter((s) => s.slug === slug);
}

export function markGiftSeen(token: string, news: string) {
  const all = readAll();
  const g = all.find((s) => s.token === token);
  if (!g || g.seen === news) return;
  g.seen = news;
  writeAll(all);
}

/** Forget a gift whose link no longer works (put back on the list). */
export function forgetGift(token: string) {
  writeAll(readAll().filter((s) => s.token !== token));
}
