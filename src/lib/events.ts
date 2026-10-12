import { cache } from "react";
import { getMockEvent } from "./mock";
import type { PublicEvent } from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

/**
 * Single source for a public event, memoized per-request so generateMetadata
 * and the page render share one lookup. Fetches the live DRF
 * `PublicEventSerializer` (shape === `PublicEvent`); falls back to mock
 * fixtures when the API is unreachable (offline/dev).
 */
export const getEvent = cache(async (slug: string): Promise<PublicEvent | null> => {
  try {
    const res = await fetch(`${API_BASE}/events/${slug}/`, { next: { revalidate: 15 } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`events/${slug} → ${res.status}`);
    return (await res.json()) as PublicEvent;
  } catch {
    return getMockEvent(slug);
  }
});
