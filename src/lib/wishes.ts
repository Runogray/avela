import { apiFetch } from "./api";

/* Well wishes: notes guests leave for the host. Only the host reads them. */

export interface HostWish {
  id: string;
  guest_name: string;
  guest_email: string;
  message: string;
  host_reply: string;
  is_hidden: boolean;
  created_at: string;
}

/** Guest sends well wishes from the invite page (no login). */
export function sendWellWishes(slug: string, body: { guest_name: string; guest_email?: string; message: string }) {
  return apiFetch(`/events/${slug}/wishes/`, { method: "POST", body, auth: false });
}

/** Host: every note guests left on this event, newest first. */
export function listHostWishes(eventId: string) {
  return apiFetch<HostWish[]>(`/host/events/${eventId}/wishes/`);
}
