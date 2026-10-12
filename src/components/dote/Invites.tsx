"use client";

import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { useRouter } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { TopBar, Sidebar } from "./EventsHome";
import { addInvite as addInviteApi, listInvites } from "@/lib/engagement";
import { isoToDate, isoToTime, occApiToUi } from "@/lib/host-events";
import { getSession } from "@/lib/auth";

/* ------------------------------------------------------------------ *
 * Dote, Invites received (Figma 14559:19812 desktop / 14559:19905
 * mobile). The celebrations a user has been invited to by other hosts.
 * Add one by its event link; a card opens the guest view (/i/[id]).
 * localStorage: dote.invites (string[] of event ids), dote.events,
 * dote.wellwishes.
 * ------------------------------------------------------------------ */

type StoredItem = { id: string };
type StoredEvent = {
  id: string;
  title: string;
  occasion: string;
  category?: string;
  date?: string;
  time?: string;
  venue?: string;
  cover?: string | null;
  items?: StoredItem[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
function fmtTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${ampm}` : `${h12}${ampm}`;
}

const OCC_GRADIENT: Record<string, string> = {
  wedding: "linear-gradient(135deg, #7EDFFF 0%, #00829f 100%)",
  birthday: "linear-gradient(135deg, #B3FF84 0%, #63991e 100%)",
  baby: "linear-gradient(135deg, #FFB2FB 0%, #d4537e 100%)",
};
const OCC_LABEL: Record<string, string> = { wedding: "Wedding", birthday: "Birthday", baby: "Baby shower" };

const slugify = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// Pull a usable event id/slug out of a pasted link, #hashtag, or bare id.
function parseLink(input: string): string {
  let s = input.trim();
  if (!s) return "";
  s = s.split(/[?#]/)[0] || s.replace(/^#/, "");
  if (s.includes("/")) s = s.split("/").filter(Boolean).pop() || s;
  return s;
}

export function Invites() {
  const router = useRouter();
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [wishCounts, setWishCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  // When the API is reachable, invites come from the server; otherwise null and
  // we fall back to the local (dote.invites) list.
  const [serverInvites, setServerInvites] = useState<StoredEvent[] | null>(null);
  const [slugById, setSlugById] = useState<Record<string, string>>({});
  const [firstName, setFirstName] = useState("there");

  useEffect(() => {
    const n = (getSession().name || "").trim().split(/\s+/)[0];
    if (n) setFirstName(n);
  }, []);

  async function loadFromApi(): Promise<boolean> {
    try {
      const data = await listInvites();
      const mapped: StoredEvent[] = [];
      const slugs: Record<string, string> = {};
      const counts: Record<string, number> = {};
      for (const inv of data) {
        const e = inv.event;
        mapped.push({
          id: e.id,
          title: e.title,
          occasion: occApiToUi(e.occasion),
          date: isoToDate(e.starts_at),
          time: isoToTime(e.starts_at),
          venue: e.venue,
          cover: e.cover_image || null,
        });
        slugs[e.id] = e.slug;
        counts[e.id] = e.wishlist_count;
      }
      setServerInvites(mapped);
      setSlugById(slugs);
      setWishCounts(counts);
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    (async () => {
      const ok = await loadFromApi();
      if (!ok) {
        // offline fallback to the local mock store
        try {
          setEvents(JSON.parse(localStorage.getItem("dote.events") || "[]"));
          setIds(JSON.parse(localStorage.getItem("dote.invites") || "[]"));
          const wishes: { eventId: string }[] = JSON.parse(localStorage.getItem("dote.wellwishes") || "[]");
          const counts: Record<string, number> = {};
          for (const w of wishes) counts[w.eventId] = (counts[w.eventId] ?? 0) + 1;
          setWishCounts(counts);
        } catch {
          /* storage unavailable */
        }
      }
      setLoaded(true);
    })();
  }, []);

  const byId = useMemo(() => {
    const m: Record<string, StoredEvent> = {};
    for (const e of events) m[e.id] = e;
    return m;
  }, [events]);

  const invites = useMemo(
    () =>
      serverInvites ??
      (ids.map((id) => byId[id]).filter(Boolean) as StoredEvent[]),
    [serverInvites, ids, byId]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invites;
    return invites.filter(
      (e) => e.title.toLowerCase().includes(q) || slugify(e.title).includes(q.replace(/^#/, ""))
    );
  }, [invites, query]);

  async function addInvite() {
    const key = parseLink(link);
    if (!key) return;
    // --- live API first (resolves by slug or id) ---
    try {
      await addInviteApi(key);
      await loadFromApi();
      setLink("");
      setError("");
      return;
    } catch {
      if (serverInvites !== null) {
        // server reachable, but no event matched that link
        setError("We couldn’t find a celebration for that link.");
        return;
      }
      // offline → fall through to the local mock store
    }

    const match = events.find(
      (e) => e.id === key || slugify(e.title) === slugify(key.replace(/^#/, ""))
    );
    if (!match) {
      setError("We couldn’t find a celebration for that link.");
      return;
    }
    if (ids.includes(match.id)) {
      setError("That invite is already in your list.");
      setLink("");
      return;
    }
    const next = [match.id, ...ids];
    setIds(next);
    try {
      localStorage.setItem("dote.invites", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setLink("");
    setError("");
  }

  // Open the celebration's public page (by slug when we have it from the API).
  const view = (id: string) => router.push(slugById[id] ? `/e/${slugById[id]}` : `/i/${id}`);

  return (
    <div
      className="min-h-screen font-dote text-black"
      style={{ backgroundImage: "linear-gradient(160deg, #fffef7 1%, #f8f5ff 42%, #fafeff 75%)" }}
    >
      {/* ============================ MOBILE ============================ */}
      <div className="flex min-h-screen flex-col lg:hidden">
        {/* header */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-6 py-[18px]">
          {searchOpen ? (
            <div className="flex w-full items-center gap-3">
              <div className="flex h-[52px] flex-1 items-center gap-2 rounded-[16px] border border-[#b8d8df] bg-[#f6fdff] px-4">
                <SearchIcon className="size-5 text-[#8a9ba0]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search invites"
                  className="w-full bg-transparent text-[15px] text-[#1a1a1a] outline-none placeholder:text-[#b3c4c9]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                aria-label="Close search"
                className="grid size-9 place-items-center text-[#5c5c5c]"
              >
                <CrossIcon className="size-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  aria-label="Profile"
                  className="transition hover:opacity-80"
                >
                  <UserAvatar className="size-[50px] rounded-full object-cover" />
                </button>
                <p className="text-[20px] font-medium tracking-[-0.4px] text-black">Invites</p>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="grid size-9 place-items-center text-[#1c1c1c]"
              >
                <SearchIcon className="size-6" />
              </button>
            </>
          )}
        </header>

        <div className="flex flex-1 flex-col gap-[14px] px-6 pb-28 pt-6">
          {/* add-by-link card */}
          <div className="flex flex-col gap-3 rounded-[18px] border border-[#e7f3f6] bg-white p-4">
            <p className="text-[12px] font-medium tracking-[-0.3px] text-black">Find an event by entering a link</p>
            <LinkInput value={link} onChange={setLink} onSubmit={addInvite} />
          </div>
          {error && <p className="-mt-1 px-1 text-[13px] text-[#c0392b]">{error}</p>}

          {/* cards */}
          {loaded && shown.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState hasInvites={invites.length > 0} />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {shown.map((e) => (
                <InviteCard key={e.id} event={e} wishes={wishCounts[e.id] ?? 0} onView={() => view(e.id)} />
              ))}
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0">
          <BottomNav active="invites" />
        </div>
      </div>

      {/* ============================ DESKTOP =========================== */}
      <div className="hidden h-screen flex-col overflow-hidden lg:flex">
        <TopBar section="Invites received" />
        <div className="flex min-h-0 flex-1">
          <Sidebar active="invites" />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto py-8 pl-7 pr-6">
            {/* heading + add */}
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-col">
                <p className="flex items-center gap-1 text-[12px] leading-[22px] text-[#4a4a4a]">
                  Hi, {firstName} <span aria-hidden>👋</span>
                </p>
                <h1 className="font-dote text-[22px] font-medium tracking-[-0.8px] text-[#1c1611]">View your invites</h1>
              </div>
              <div className="flex items-center gap-5">
                <div className="w-[322px]">
                  <LinkInput value={link} onChange={setLink} onSubmit={addInvite} compact />
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/create")}
                  className="shrink-0 rounded-[50px] bg-[#00829f] px-[42px] py-4 text-[14px] tracking-[0.35px] text-[#f4fffe] transition hover:brightness-95"
                >
                  New Celebration
                </button>
              </div>
            </div>
            {error && <p className="mt-2 text-[13px] text-[#c0392b]">{error}</p>}

            {/* cards */}
            {loaded && invites.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="w-full max-w-[520px]">
                  <EmptyState hasInvites={false} />
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-[17px]">
                {invites.map((e) => (
                  <InviteCard
                    key={e.id}
                    event={e}
                    wishes={wishCounts[e.id] ?? 0}
                    onView={() => view(e.id)}
                    className="w-[314px]"
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- invite card ----------------------------- */
function InviteCard({
  event,
  wishes,
  onView,
  className = "",
}: {
  event: StoredEvent;
  wishes: number;
  onView: () => void;
  className?: string;
}) {
  const cover = event.cover || null;
  const when = [fmtDate(event.date), fmtTime(event.time)].filter(Boolean);
  const tag = OCC_LABEL[event.occasion] || event.category || "Celebration";
  const slug = event.title.replace(/\s+/g, "");
  const hashtag = slug.startsWith("#") ? slug : `#${slug}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
      className={`cursor-pointer rounded-[24px] border border-[#cddde0] bg-white px-[6px] pb-5 pt-[6px] transition hover:border-teal/60 hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div className="flex flex-col gap-[14px]">
        {/* cover */}
        <div className="relative flex h-[181px] flex-col justify-between overflow-hidden rounded-[20px] p-[14px]">
          <div
            aria-hidden
            className="absolute inset-0"
            style={cover ? undefined : { backgroundImage: OCC_GRADIENT[event.occasion] ?? OCC_GRADIENT.wedding }}
          >
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="size-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/[0.38]" />
          </div>
          <div className="relative flex items-center">
            <span className="rounded-[10px] border border-[#b4e7ff] bg-[#eafaff] px-[6px] py-[2px] text-[10px] leading-4 text-[#529ae2]">
              {tag}
            </span>
          </div>
          <p className="relative text-[22px] font-medium tracking-[-0.8px] text-white">
            {slug ? hashtag : event.title}
          </p>
        </div>

        {/* meta */}
        <div className="flex flex-col gap-[14px] px-[14px]">
          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center gap-[6px] text-[14px] tracking-[-0.8px] text-[#212121]">
              <CalendarIcon className="size-5 shrink-0 text-[#4b4b4b]" />
              {when.length ? (
                <span className="flex items-center gap-[6px]">
                  <span>{when[0]}</span>
                  {when[1] && (
                    <>
                      <span className="h-[13px] w-px bg-[#c9c9c9]" />
                      <span>{when[1]}</span>
                    </>
                  )}
                </span>
              ) : (
                <span className="text-[#8a8a8a]">Date to be announced</span>
              )}
            </div>
            <div className="flex items-center gap-[6px] text-[14px] tracking-[-0.8px] text-[#212121]">
              <LocationIcon className="size-5 shrink-0 text-[#4b4b4b]" />
              <span className="line-clamp-1">{event.venue || "Venue to be announced"}</span>
            </div>
          </div>
          <div className="h-px w-full bg-[#ededed]" />
          <div className="flex items-center justify-between text-[14px] tracking-[-0.8px]">
            <span className="text-[#212121]">
              {wishes} {wishes === 1 ? "wish" : "wishes"}
            </span>
            <span className="font-medium text-[#00829f]">View</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkInput({
  value,
  onChange,
  onSubmit,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-[16px] border border-[#b8d8df] bg-[#f6fdff] px-4 ${
        compact ? "h-[54px]" : "h-16"
      }`}
    >
      <span className="text-[16px] font-medium text-[#1a1a1a]">#</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        placeholder="Event link"
        className="w-full bg-transparent text-[16px] font-medium text-[#1a1a1a] outline-none placeholder:text-[#dcdcdc]"
      />
      {value.trim() && (
        <button type="button" onClick={onSubmit} aria-label="Add invite" className="shrink-0 text-teal">
          <ArrowRight className="size-5" />
        </button>
      )}
    </div>
  );
}

function EmptyState({ hasInvites }: { hasInvites: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-[#cddde0] bg-white/60 px-6 py-14 text-center">
      <span className="text-[28px]">✉️</span>
      <p className="text-[15px] font-medium text-[#1c1611]">
        {hasInvites ? "No invites match your search." : "No invites yet."}
      </p>
      {!hasInvites && (
        <p className="max-w-[320px] text-[13px] text-[#6e6558]">
          Paste an event link above to add a celebration you&rsquo;ve been invited to.
        </p>
      )}
    </div>
  );
}

/* -------------------------------- icons -------------------------------- */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}
function CrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-5.3-7-11a7 7 0 1 1 14 0c0 5.7-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
