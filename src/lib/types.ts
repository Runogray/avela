/**
 * Domain types, mirror the DRF serializers so the same shapes flow whether
 * data comes from mock fixtures or the live API (PublicEventSerializer, etc).
 */

export type Occasion = "wedding" | "birthday" | "baby_shower";

export type WishlistStatus = "available" | "reserved";

export interface WishlistItem {
  id: string;
  name: string;
  description: string;
  image: string;
  link: string;
  price_kobo: number | null;
  status: WishlistStatus;
  reserver_display: string; // "" | name | "Anonymous"
}

export interface ContributionGoal {
  id: string;
  name: string;
  target_kobo: number;
  raised_kobo: number;
  progress_pct: number;
}

export interface PublicGift {
  id: string;
  giver: string; // "Anonymous" when name hidden
  amount_kobo: number | null; // null when amount hidden
  message: string;
  created_at: string;
}

export interface Wish {
  id: string;
  guest_name: string;
  message: string;
  host_reply: string;
  created_at: string;
}

export interface PublicEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  occasion: Occasion;
  cover_image: string;
  starts_at: string; // ISO
  venue: string;
  dress_code: string;
  host_verified: boolean;
  host_first_name: string;
  accepts_money: boolean;
  accepts_wishlist: boolean;
  accepts_wishes: boolean;
  // module data
  wishlist_items: WishlistItem[];
  goals: ContributionGoal[];
  wishes: Wish[];
  recent_gifts: PublicGift[];
  // social proof
  rsvp_yes_count: number;
  // A3: the "gift box is full" state, host hit the cap, unverified
  gifts_paused: boolean;
}

export const OCCASION_LABEL: Record<Occasion, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  baby_shower: "Baby shower",
};

// maps occasion -> the chip tone defined in the design system
export const OCCASION_TONE: Record<Occasion, "green" | "coral" | "blush"> = {
  wedding: "green",
  birthday: "coral",
  baby_shower: "blush",
};
