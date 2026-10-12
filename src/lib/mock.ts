import type { PublicEvent } from "./types";

/**
 * Mock fixtures shaped exactly like the DRF API responses. Swapping these for
 * live `fetch` calls (see lib/api.ts) is a one-line change per page.
 */
const EVENTS: Record<string, PublicEvent> = {
  "amara-tobi": {
    id: "evt_amara_tobi",
    slug: "amara-tobi",
    title: "Amara & Tobi",
    description:
      "After eight years, a thousand jollof debates, and one very dramatic proposal, we're finally doing it. Come celebrate the start of forever with us. Your presence is the gift; everything else is a bonus we'll treasure.",
    occasion: "wedding",
    cover_image: "",
    starts_at: "2026-10-18T16:00:00+01:00",
    venue: "The Monarch Event Centre, Lekki, Lagos",
    dress_code: "Traditional & elegant, think deep greens and gold",
    host_verified: true,
    host_first_name: "Amara",
    accepts_money: true,
    accepts_wishlist: true,
    accepts_wishes: true,
    rsvp_yes_count: 142,
    gifts_paused: false,
    goals: [
      {
        id: "goal_honeymoon",
        name: "Honeymoon in Zanzibar",
        target_kobo: 1_000_000_00,
        raised_kobo: 640_000_00,
        progress_pct: 64,
      },
      {
        id: "goal_home",
        name: "Our first home fund",
        target_kobo: 2_500_000_00,
        raised_kobo: 410_000_00,
        progress_pct: 16.4,
      },
    ],
    wishlist_items: [
      {
        id: "wl_mixer",
        name: "KitchenAid stand mixer",
        description: "Tobi has threatened to start baking. We're scared and excited.",
        image: "",
        link: "https://example.com/mixer",
        price_kobo: 185_000_00,
        status: "reserved",
        reserver_display: "Ada",
      },
      {
        id: "wl_dinner",
        name: "Ceramic dinner set (12 pieces)",
        description: "For the dinner parties we keep promising everyone.",
        image: "",
        link: "https://example.com/dinner-set",
        price_kobo: 96_000_00,
        status: "available",
        reserver_display: "",
      },
      {
        id: "wl_luggage",
        name: "Matching luggage set",
        description: "Honeymoon-ready, and every trip after.",
        image: "",
        link: "",
        price_kobo: 240_000_00,
        status: "available",
        reserver_display: "",
      },
      {
        id: "wl_art",
        name: "Framed art for the living room",
        description: "Something warm for the wall above the sofa.",
        image: "",
        link: "",
        price_kobo: null,
        status: "reserved",
        reserver_display: "Anonymous",
      },
    ],
    wishes: [
      {
        id: "wish_nkechi",
        guest_name: "Aunty Nkechi",
        message:
          "May your home always be full of laughter, jollof, and good people. So happy for you both.",
        host_reply: "Thank you, Aunty. We can't wait to celebrate with you. ♥",
        created_at: "2026-06-10T09:30:00+01:00",
      },
      {
        id: "wish_seyi",
        guest_name: "Seyi & the boys",
        message:
          "From uni roommates to groomsmen. Couldn't be prouder of you, Tobi. Amara, you got a good one (we trained him).",
        host_reply: "",
        created_at: "2026-06-12T18:05:00+01:00",
      },
      {
        id: "wish_chidinma",
        guest_name: "Chidinma",
        message: "Wishing you a lifetime of joy and very little wahala. Love you both!",
        host_reply: "",
        created_at: "2026-06-14T12:00:00+01:00",
      },
    ],
    recent_gifts: [
      {
        id: "g1",
        giver: "Uncle Emeka",
        amount_kobo: 50_000_00,
        message: "For the honeymoon. Don't argue.",
        created_at: "2026-06-15T10:00:00+01:00",
      },
      {
        id: "g2",
        giver: "Anonymous",
        amount_kobo: null,
        message: "So happy for you both!",
        created_at: "2026-06-15T14:20:00+01:00",
      },
      {
        id: "g3",
        giver: "The Okafor family",
        amount_kobo: 25_000_00,
        message: "",
        created_at: "2026-06-16T08:15:00+01:00",
      },
    ],
  },

  // A birthday whose host has hit the receiving cap (Story A3 demo)
  "zara-turns-5": {
    id: "evt_zara",
    slug: "zara-turns-5",
    title: "Zara turns 5! 🎈",
    description:
      "Our little superhero is turning five! Cape strongly encouraged. There will be cake, chaos, and a bouncy castle that the parents secretly want a turn on.",
    occasion: "birthday",
    cover_image: "",
    starts_at: "2026-11-09T13:00:00+01:00",
    venue: "Ikeja, Lagos",
    dress_code: "Superhero dress code",
    host_verified: false,
    host_first_name: "Zainab",
    accepts_money: true,
    accepts_wishlist: false,
    accepts_wishes: true,
    rsvp_yes_count: 37,
    gifts_paused: true, // gift box is full for now
    goals: [],
    wishlist_items: [],
    wishes: [
      {
        id: "wish_grandma",
        guest_name: "Grandma Bisi",
        message: "Five whole years of sunshine. We love you to the moon, Zara!",
        host_reply: "",
        created_at: "2026-06-18T16:40:00+01:00",
      },
    ],
    recent_gifts: [],
  },
};

export function getMockEvent(slug: string): PublicEvent | null {
  return EVENTS[slug] ?? null;
}

export function allMockSlugs(): string[] {
  return Object.keys(EVENTS);
}

export const FEATURED_SLUG = "amara-tobi";
