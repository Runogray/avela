/**
 * Guest (unauthenticated) actions on a public event: RSVP, leave a wish,
 * reserve a wishlist item, and send a money gift. All hit the public DRF
 * routes with `auth: false`.
 */
import { apiFetch } from "./api";

export function rsvp(slug: string, body: { guest_name: string; status: "yes" | "maybe" | "no" }) {
  return apiFetch(`/events/${slug}/rsvp/`, { method: "POST", body, auth: false });
}

export function addWish(slug: string, body: { guest_name: string; message: string }) {
  return apiFetch(`/events/${slug}/wishes/`, { method: "POST", body, auth: false });
}

export function reserveItem(itemId: string, body: { guest_name: string; show_name: boolean }) {
  return apiFetch(`/wishlist-items/${itemId}/reserve/`, { method: "POST", body, auth: false });
}

export type GiftBody = {
  amount_kobo: number;
  goal_id?: string | null;
  giver_name?: string;
  message?: string;
  show_name: boolean;
  show_amount: boolean;
};

export async function sendGift(slug: string, body: GiftBody) {
  return apiFetch<{ gift_id: string; checkout_url: string }>(
    `/events/${slug}/gifts/`,
    { method: "POST", body, auth: false },
  );
}

/**
 * DEV ONLY: the stub gateway doesn't open a real checkout, so simulate its
 * confirmation webhook — this marks the gift PAID, credits the host wallet and
 * surfaces it in recent gifts. A real gateway calls the webhook itself.
 */
export async function confirmStubGift(checkoutUrl: string) {
  const m = checkoutUrl.match(/stub_[a-z0-9]+/i);
  if (!m) return;
  try {
    await apiFetch(`/webhooks/payment/`, {
      method: "POST",
      body: { reference: m[0] },
      auth: false,
    });
  } catch {
    /* best-effort in dev */
  }
}
