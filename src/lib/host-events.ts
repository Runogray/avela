/**
 * Host-side events API client — the authenticated owner's CRUD over their own
 * events, wishlist items and goals. Wraps `apiFetch` against /api/host/...
 *
 * Bridges two shape mismatches between the UI and the DRF API:
 *  - occasion: UI uses "baby", the API uses "baby_shower".
 *  - the create flow has one "items" list mixing MONETARY (→ contribution
 *    goals) and PHYSICAL (→ wishlist items); the API keeps them separate.
 */
import { apiFetch } from "./api";

/* ---------------------------------- types --------------------------------- */
export type ApiOccasion = "wedding" | "birthday" | "baby_shower";

export interface ApiWishlistItem {
  id: string;
  name: string;
  description: string;
  image: string;
  link: string;
  price_kobo: number | null;
  status: "available" | "reserved";
  reserver_display: string;
  /** Confirmed cash gifts toward this item (kobo). */
  raised_kobo?: number;
}

export interface ApiGoal {
  id: string;
  name: string;
  target_kobo: number;
  raised_kobo: number;
  progress_pct: number;
  hide_contributions: boolean;
  hide_total: boolean;
}

export interface HostEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  occasion: ApiOccasion;
  category: string;
  cover_image: string;
  starts_at: string; // ISO
  venue: string;
  dress_code: string;
  visibility: "public" | "invite";
  accepts_money: boolean;
  accepts_wishlist: boolean;
  accepts_wishes: boolean;
  is_published: boolean;
  created_at: string;
  wishlist_items: ApiWishlistItem[];
  goals: ApiGoal[];
  photos: { id: string; image: string; order: number }[];
  rsvp_yes_count: number;
  gift_total_kobo: number;
}

/* ------------------------------ occasion maps ----------------------------- */
export function occApiToUi(o: string): string {
  return o === "baby_shower" ? "baby" : o;
}
export function occUiToApi(o: string): ApiOccasion {
  if (o === "baby") return "baby_shower";
  return (o === "wedding" || o === "birthday" ? o : "birthday") as ApiOccasion;
}

/* ------------------------------ date helpers ------------------------------ */
// Events are shown in West Africa Time (UTC+1, no DST). We interpret entered
// times as WAT and display in WAT everywhere, so the dashboard and the public
// page always agree.
const WAT_TZ = "Africa/Lagos";

/** "YYYY-MM-DD" (in WAT) from an ISO timestamp. */
export function isoToDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: WAT_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
/** "HH:MM" (24h, in WAT) from an ISO timestamp. */
export function isoToTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: WAT_TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}
/** Combine "YYYY-MM-DD" + "HH:MM" (interpreted as WAT) into an ISO string. */
export function dateTimeToIso(date: string, time: string): string {
  // +01:00 pins the input to WAT regardless of the browser's own timezone.
  const d = date ? new Date(`${date}T${time || "00:00"}:00+01:00`) : new Date();
  return (Number.isNaN(d.getTime()) ? new Date() : d).toISOString();
}

/* -------------------------------- requests -------------------------------- */
export function listHostEvents() {
  return apiFetch<HostEvent[]>("/host/events/");
}
export function getHostEvent(id: string) {
  return apiFetch<HostEvent>(`/host/events/${id}/`);
}
export function deleteHostEvent(id: string) {
  return apiFetch<void>(`/host/events/${id}/`, { method: "DELETE" });
}
export function publishHostEvent(id: string) {
  return apiFetch<HostEvent>(`/host/events/${id}/publish/`, { method: "POST" });
}
export function unpublishHostEvent(id: string) {
  return apiFetch<HostEvent>(`/host/events/${id}/unpublish/`, { method: "POST" });
}

type EventWrite = Partial<{
  title: string;
  description: string;
  occasion: ApiOccasion;
  category: string;
  cover_image: string;
  starts_at: string;
  venue: string;
  dress_code: string;
  visibility: "public" | "invite";
  accepts_money: boolean;
  accepts_wishlist: boolean;
  accepts_wishes: boolean;
}>;

export function createHostEvent(body: EventWrite) {
  return apiFetch<HostEvent>("/host/events/", { method: "POST", body });
}
export function updateHostEvent(id: string, body: EventWrite) {
  return apiFetch<HostEvent>(`/host/events/${id}/`, { method: "PATCH", body });
}

export function addWishlistItem(eventId: string, body: Partial<ApiWishlistItem>) {
  return apiFetch<ApiWishlistItem>(`/host/events/${eventId}/wishlist-items/`, {
    method: "POST", body,
  });
}
export function addGoal(
  eventId: string,
  body: { name: string; target_kobo: number; hide_contributions?: boolean; hide_total?: boolean },
) {
  return apiFetch<ApiGoal>(`/host/events/${eventId}/goals/`, { method: "POST", body });
}
export function addEventPhoto(eventId: string, image: string, order = 0) {
  return apiFetch(`/host/events/${eventId}/photos/`, {
    method: "POST",
    body: { image, order },
  });
}
export function updateWishlistItem(itemId: string, body: Partial<ApiWishlistItem>) {
  return apiFetch<ApiWishlistItem>(`/host/wishlist-items/${itemId}/`, { method: "PATCH", body });
}
export function deleteWishlistItem(itemId: string) {
  return apiFetch<void>(`/host/wishlist-items/${itemId}/`, { method: "DELETE" });
}
export function updateGoal(
  goalId: string,
  body: { name?: string; target_kobo?: number; hide_contributions?: boolean; hide_total?: boolean },
) {
  return apiFetch<ApiGoal>(`/host/goals/${goalId}/`, { method: "PATCH", body });
}
export function deleteGoal(goalId: string) {
  return apiFetch<void>(`/host/goals/${goalId}/`, { method: "DELETE" });
}

/** Map an API event into the create-flow's editable fields (for edit mode).
 * Wishlist items + goals become the flow's unified `items`, each carrying its
 * server id so saving can diff add/update/delete. */
export function hostEventToFlow(e: HostEvent) {
  const items = [
    ...e.goals.map((g) => ({
      id: g.id,
      type: "monetary" as const,
      name: g.name,
      emoji: "💵",
      image: null as string | null,
      anyAmount: !g.target_kobo,
      amount: Math.round((g.target_kobo || 0) / 100),
      raised: Math.round((g.raised_kobo || 0) / 100),
      hideContrib: g.hide_contributions,
      hideTotal: g.hide_total,
    })),
    ...e.wishlist_items.map((w) => ({
      id: w.id,
      type: "physical" as const,
      name: w.name,
      emoji: "🎁",
      image: w.image || null,
      link: w.link || "",
      anyAmount: false,
      amount: Math.round((w.price_kobo || 0) / 100),
      raised: Math.round((w.raised_kobo || 0) / 100),
      hideContrib: false,
      hideTotal: false,
    })),
  ];
  return {
    occasion: occApiToUi(e.occasion),
    category: e.category,
    title: e.title,
    venue: e.venue,
    dress: e.dress_code,
    date: isoToDate(e.starts_at),
    time: isoToTime(e.starts_at),
    description: e.description,
    cover: e.cover_image || null,
    gallery: [e.cover_image, ...e.photos.map((p) => p.image)].filter(Boolean) as string[],
    items,
  };
}

/* ----------------------------- public (guest) ----------------------------- */
/** A published event as a guest sees it — no auth. Matches the DRF
 * PublicEventSerializer; goals carry the hide-contribution flags. */
export interface PublicApiEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  occasion: ApiOccasion;
  cover_image: string;
  starts_at: string;
  venue: string;
  dress_code: string;
  host_first_name: string;
  accepts_money: boolean;
  accepts_wishlist: boolean;
  accepts_wishes: boolean;
  wishlist_items: ApiWishlistItem[];
  goals: ApiGoal[];
  gallery: string[];
  /** The host has a bank account, so cash gifts can be paid by transfer. */
  accepts_transfers: boolean;
}

/** Public read of a published event by slug (guest invite page). */
export function getPublicEvent(slug: string) {
  return apiFetch<PublicApiEvent>(`/events/${slug}/`, { auth: false });
}

/** Guest reserves a physical wishlist item (locks it so no one double-buys). */
export function reserveWishlistItem(
  itemId: string,
  body: { guest_name: string; show_name: boolean },
) {
  return apiFetch(`/wishlist-items/${itemId}/reserve/`, { method: "POST", body, auth: false });
}

/* ------------------------- cash gifts by bank transfer ------------------------- */
/** What a guest sees after choosing an amount: the host's account + a reference. */
export interface TransferDetails {
  gift_id: string;
  reference: string;
  amount_kobo: number;
  bank_name: string;
  account_number: string;
  account_name: string;
}

/** Guest starts a cash gift: records it as pending and returns where to pay. */
export function startTransferGift(
  slug: string,
  body: {
    amount_kobo: number;
    giver_name: string;
    goal_id?: string | null;
    wishlist_item_id?: string | null;
    show_name?: boolean;
    show_amount?: boolean;
  },
) {
  return apiFetch<TransferDetails>(`/events/${slug}/transfers/`, { method: "POST", body, auth: false });
}

/** Guest tapped "I've sent it" — nudges the host to confirm. */
export function markTransferSent(slug: string, giftId: string) {
  return apiFetch(`/events/${slug}/transfers/${giftId}/sent/`, { method: "POST", auth: false });
}

/** A transfer gift as the host sees it on Manage. */
export interface HostTransfer {
  id: string;
  giver_name: string;
  amount_kobo: number;
  reference: string;
  status: "initiated" | "paid" | "failed" | "reversed";
  goal_id: string | null;
  wishlist_item_id: string | null;
  for_name: string;
  message: string;
  marked_sent_at: string | null;
  created_at: string;
  paid_at: string | null;
}

export function listTransfers(eventId: string) {
  return apiFetch<HostTransfer[]>(`/host/events/${eventId}/transfers/`);
}

export function confirmTransfer(eventId: string, giftId: string) {
  return apiFetch<HostTransfer>(`/host/events/${eventId}/transfers/${giftId}/confirm/`, { method: "POST" });
}

export function declineTransfer(eventId: string, giftId: string) {
  return apiFetch<HostTransfer>(`/host/events/${eventId}/transfers/${giftId}/decline/`, { method: "POST" });
}

/** Map a public event into the overview's display shape (mirrors
 * hostEventToFlow; carries the real raised totals + hide flags for guests). */
export function publicEventToFlow(e: PublicApiEvent) {
  const items = [
    ...e.goals.map((g) => ({
      id: g.id,
      type: "monetary" as const,
      name: g.name,
      emoji: "💵",
      image: null as string | null,
      anyAmount: !g.target_kobo,
      amount: Math.round((g.target_kobo || 0) / 100),
      raised: Math.round((g.raised_kobo || 0) / 100),
      hideContrib: g.hide_contributions,
      hideTotal: g.hide_total,
    })),
    ...e.wishlist_items.map((w) => ({
      id: w.id,
      type: "physical" as const,
      name: w.name,
      emoji: "🎁",
      image: w.image || null,
      link: w.link || "",
      anyAmount: false,
      amount: Math.round((w.price_kobo || 0) / 100),
      raised: Math.round((w.raised_kobo || 0) / 100),
      hideContrib: false,
      hideTotal: false,
    })),
  ];
  return {
    occasion: occApiToUi(e.occasion),
    title: e.title,
    venue: e.venue,
    dress: e.dress_code,
    date: isoToDate(e.starts_at),
    time: isoToTime(e.starts_at),
    description: e.description,
    cover: e.cover_image || null,
    gallery: (e.gallery || []).filter(Boolean),
    items,
    acceptsTransfers: !!e.accepts_transfers,
  };
}

/* --------------------------- create-flow adapter -------------------------- */
export type FlowItem = {
  id: string;
  type: "monetary" | "physical";
  name: string;
  emoji?: string;
  image?: string | null;
  link?: string; // optional store/vendor link (physical gifts)
  anyAmount?: boolean;
  amount?: number; // naira
  hideContrib?: boolean; // monetary: hide per-person contribution amounts
  hideTotal?: boolean; // monetary: hide the total raised
};

export type FlowPayload = {
  occasion: string;
  category?: string;
  title: string;
  location: string;
  dress: string;
  time: string;
  date: string;
  description: string;
  cover: string | null; // data URL
  gallery?: string[]; // extra photo data URLs (beyond the cover)
  items: FlowItem[];
  publish?: boolean;
};

/** Create an event from the multi-step flow: event → goals/items → publish. */
export async function createEventFromFlow(p: FlowPayload): Promise<HostEvent> {
  const hasPhysical = p.items.some((i) => i.type === "physical");
  const event = await createHostEvent({
    title: p.title || "Your celebration",
    description: p.description || "",
    occasion: occUiToApi(p.occasion),
    category: p.category || "",
    cover_image: p.cover || "",
    starts_at: dateTimeToIso(p.date, p.time),
    venue: p.location || "",
    dress_code: p.dress || "",
    accepts_wishlist: hasPhysical,
  });

  for (const it of p.items) {
    const naira = Math.max(0, Math.round(it.amount || 0));
    if (it.type === "monetary") {
      await addGoal(event.id, {
        name: it.name || "Contribution",
        target_kobo: it.anyAmount ? 0 : naira * 100,
        hide_contributions: !!it.hideContrib,
        hide_total: !!it.hideTotal,
      });
    } else {
      await addWishlistItem(event.id, {
        name: it.name || "Gift",
        image: it.image || "",
        link: it.link || "",
        price_kobo: naira ? naira * 100 : null,
      });
    }
  }

  // Gallery photos beyond the cover (index 0 is the cover).
  const extra = (p.gallery ?? []).slice(1);
  for (let i = 0; i < extra.length; i++) {
    await addEventPhoto(event.id, extra[i], i + 1);
  }

  if (p.publish !== false) return publishHostEvent(event.id);
  return getHostEvent(event.id);
}

/** Update an existing event: core fields + a full sync of goals/wishlist items
 * (items keep their server id from hydration, so we add/update/delete). */
export async function updateEventFromFlow(id: string, p: FlowPayload): Promise<HostEvent> {
  const hasPhysical = p.items.some((i) => i.type === "physical");
  await updateHostEvent(id, {
    title: p.title || "Your celebration",
    description: p.description || "",
    occasion: occUiToApi(p.occasion),
    category: p.category || "",
    cover_image: p.cover || "",
    starts_at: dateTimeToIso(p.date, p.time),
    venue: p.location || "",
    dress_code: p.dress || "",
    accepts_wishlist: hasPhysical,
  });

  // --- sync goals + wishlist items against what's on the server ---
  const current = await getHostEvent(id);
  const goalIds = new Set(current.goals.map((g) => g.id));
  const itemIds = new Set(current.wishlist_items.map((w) => w.id));
  const keptGoals = new Set<string>();
  const keptItems = new Set<string>();

  for (const it of p.items) {
    const naira = Math.max(0, Math.round(it.amount || 0));
    if (it.type === "monetary") {
      const body = {
        name: it.name || "Contribution",
        target_kobo: it.anyAmount ? 0 : naira * 100,
        hide_contributions: !!it.hideContrib,
        hide_total: !!it.hideTotal,
      };
      if (goalIds.has(it.id)) {
        await updateGoal(it.id, body);
        keptGoals.add(it.id);
      } else {
        await addGoal(id, body);
      }
    } else {
      const body = { name: it.name || "Gift", image: it.image || "", link: it.link || "", price_kobo: naira ? naira * 100 : null };
      if (itemIds.has(it.id)) {
        await updateWishlistItem(it.id, body);
        keptItems.add(it.id);
      } else {
        await addWishlistItem(id, body);
      }
    }
  }
  for (const gid of goalIds) if (!keptGoals.has(gid)) await deleteGoal(gid);
  for (const iid of itemIds) if (!keptItems.has(iid)) await deleteWishlistItem(iid);

  return getHostEvent(id);
}
