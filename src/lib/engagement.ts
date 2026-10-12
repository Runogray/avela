/** Invites received + notifications feed (authenticated). */
import { apiFetch } from "./api";

export type NotifKind = "contribution" | "wish" | "wallet" | "invite" | "system";
export interface ApiNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface ApiInviteEvent {
  id: string;
  slug: string;
  title: string;
  occasion: "wedding" | "birthday" | "baby_shower";
  starts_at: string;
  venue: string;
  cover_image: string;
  host_first_name: string;
  wishlist_count: number;
}
export interface ApiInvite {
  id: string;
  created_at: string;
  event: ApiInviteEvent;
}

export function listNotifications() {
  return apiFetch<ApiNotification[]>("/notifications/");
}
export function markAllNotificationsRead() {
  return apiFetch("/notifications/read-all/", { method: "POST" });
}

export function listInvites() {
  return apiFetch<ApiInvite[]>("/invites/");
}
export function addInvite(eventRef: string) {
  return apiFetch<ApiInvite>("/invites/", { method: "POST", body: { event: eventRef } });
}
export function removeInvite(id: string) {
  return apiFetch<void>(`/invites/${id}/`, { method: "DELETE" });
}
