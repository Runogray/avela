"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { DoteLogo } from "./Logo";
import { SidebarLogout } from "./SidebarLogout";
import { BottomNav } from "./BottomNav";
import { AvatarPicker } from "./AvatarPicker";
import {
  clearAvatarOnboarding,
  currentAvatarId,
  needsAvatarOnboarding,
  setAvatarId,
} from "@/lib/avatar";
import {
  deleteHostEvent,
  isoToDate,
  isoToTime,
  listHostEvents,
  occApiToUi,
  publishHostEvent,
  unpublishHostEvent,
  type HostEvent,
} from "@/lib/host-events";
import { getSession, updateMe } from "@/lib/auth";

/* ------------------------------------------------------------------ *
 * Dote, Events home (host dashboard). Lists every created celebration.
 * Mobile (from Figma 14534:77450): avatar + quick-actions/search header,
 * "Hi, … / Created Events", cover cards, Quick Actions sheet, Search.
 * Desktop: sidebar dashboard (unchanged). After publishing, lands here
 * with ?published=1 and shows a success banner.
 * ------------------------------------------------------------------ */

const SCREEN_BG =
  "linear-gradient(150.9deg, #FFFEF7 0.85%, #F8F5FF 41.76%, #FAFEFF 74.51%)";

type StoredEvent = {
  id: string;
  title: string;
  occasion: string;
  date: string;
  time: string;
  venue: string;
  cover: string | null;
  wishes: number;
  createdAt: number;
  hidden?: boolean;
};

const OCC: Record<string, { label: string; chipBg: string; chipBorder: string; chipText: string; cover: string }> = {
  wedding: { label: "Wedding", chipBg: "#EAFAFF", chipBorder: "#B4E7FF", chipText: "#529AE2", cover: "linear-gradient(135deg, #7EDFFF 0%, #00829f 100%)" },
  birthday: { label: "Birthday", chipBg: "#EEFCE3", chipBorder: "#C7EDA0", chipText: "#5F9A2B", cover: "linear-gradient(135deg, #B3FF84 0%, #63991e 100%)" },
  baby: { label: "Baby shower", chipBg: "#FDEAF9", chipBorder: "#F6C3EA", chipText: "#C85BA8", cover: "linear-gradient(135deg, #FFB2FB 0%, #d4537e 100%)" },
};

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

/** Map an API HostEvent to the flattened shape the dashboard cards render. */
function toStored(e: HostEvent): StoredEvent {
  return {
    id: e.id,
    title: e.title,
    occasion: occApiToUi(e.occasion),
    date: isoToDate(e.starts_at),
    time: isoToTime(e.starts_at),
    venue: e.venue,
    cover: e.cover_image || null,
    wishes: e.wishlist_items.length,
    createdAt: new Date(e.created_at).getTime(),
    hidden: !e.is_published,
  };
}

export function EventsHome() {
  const router = useRouter();
  const params = useSearchParams();
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [banner, setBanner] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  // First time on the dashboard after signing up: prompt for an avatar.
  const [onboardAvatar, setOnboardAvatar] = useState(false);
  const [firstName, setFirstName] = useState("there");

  useEffect(() => {
    const n = (getSession().name || "").trim().split(/\s+/)[0];
    if (n) setFirstName(n);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await listHostEvents(); // live API (host's own events)
        if (alive) setEvents(list.map(toStored));
      } catch {
        // offline / not signed in → fall back to the local mock store
        try {
          if (alive) setEvents(JSON.parse(localStorage.getItem("dote.events") || "[]"));
        } catch {
          if (alive) setEvents([]);
        }
      }
    })();
    if (needsAvatarOnboarding()) setOnboardAvatar(true);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (params.get("published") !== "1") return;
    setBanner(true);
    window.history.replaceState(null, "", "/events");
    const t = setTimeout(() => setBanner(false), 5000);
    return () => clearTimeout(t);
  }, [params]);

  async function deleteEvent(id: string) {
    setEvents((es) => es.filter((e) => e.id !== id)); // optimistic
    try {
      await deleteHostEvent(id);
    } catch {
      /* offline: the optimistic removal stands for this session */
    }
  }
  // "Hidden" on the dashboard maps to unpublished on the API (and vice versa).
  async function toggleHidden(id: string) {
    const willHide = !events.find((e) => e.id === id)?.hidden;
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, hidden: willHide } : e)));
    try {
      await (willHide ? unpublishHostEvent(id) : publishHostEvent(id));
    } catch {
      /* offline */
    }
  }
  async function hideAll() {
    const toHide = events.filter((e) => !e.hidden).map((e) => e.id);
    setEvents((es) => es.map((e) => ({ ...e, hidden: true })));
    try {
      await Promise.all(toHide.map((id) => unpublishHostEvent(id)));
    } catch {
      /* offline */
    }
  }
  async function deleteAll() {
    const ids = events.map((e) => e.id);
    setEvents([]);
    setQuickOpen(false);
    try {
      await Promise.all(ids.map((id) => deleteHostEvent(id)));
    } catch {
      /* offline */
    }
  }

  // The host sees every event (hidden = hidden from public view, not from here).
  const shown = query.trim()
    ? events.filter((e) => e.title.toLowerCase().includes(query.trim().toLowerCase()))
    : events;

  return (
    <div className="min-h-screen font-dote" style={{ background: SCREEN_BG }}>
      <SuccessBanner show={banner} onClose={() => setBanner(false)} />

      {onboardAvatar && (
        <AvatarPicker
          current={currentAvatarId()}
          title="Choose your avatar"
          saveLabel="Save avatar"
          requireChange={false}
          onClose={() => {
            clearAvatarOnboarding();
            setOnboardAvatar(false);
          }}
          onSave={(id) => {
            setAvatarId(id);
            updateMe({ avatar: id }).catch(() => {});
            clearAvatarOnboarding();
            setOnboardAvatar(false);
          }}
        />
      )}

      {/* ============================= MOBILE ============================= */}
      <div className="flex min-h-screen w-full flex-col lg:hidden">
        {searching ? (
          <SearchHeader
            value={query}
            onChange={setQuery}
            onClose={() => {
              setSearching(false);
              setQuery("");
            }}
          />
        ) : (
          <ListHeader onQuickActions={() => setQuickOpen(true)} onSearch={() => setSearching(true)} />
        )}

        <main className="flex-1 px-6 pb-28">
          <div className="mb-4 pt-[6px]">
            <p className="flex items-center gap-1 text-[12px] leading-[22px] text-[#4a4a4a]">
              Hi, {firstName} <span className="text-[16px] leading-none">👋</span>
            </p>
            <h1 className="font-dote text-[22px] font-medium tracking-[-0.8px] text-[#1c1611]">
              Created Events
            </h1>
          </div>

          {shown.length === 0 ? (
            <EmptyState
              searching={query.trim().length > 0}
              onNew={() => router.push("/create")}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {shown.map((e) => (
                <EventCard key={e.id} event={e} onToggleStatus={toggleHidden} />
              ))}
            </div>
          )}
        </main>

        <div className="fixed inset-x-0 bottom-0">
          <BottomNav active="events" />
        </div>
      </div>

      {/* ============================ DESKTOP ============================ */}
      <div className="hidden h-screen flex-col overflow-hidden lg:flex">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="min-h-0 flex-1 overflow-y-auto py-8 pl-7 pr-6">
            <div className="w-full">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="flex items-center gap-1 text-[12px] leading-[22px] text-[#4a4a4a]">
                    Hi, {firstName} <span className="text-[18px] leading-none">👋</span>
                  </p>
                  <h1 className="font-dote text-[22px] font-medium tracking-[-0.8px] text-[#1c1611]">
                    Created Events
                  </h1>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      aria-label="Quick actions"
                      onClick={() => setQuickOpen(true)}
                      className="grid size-[52px] shrink-0 place-items-center rounded-[16px] border border-[#65cce3] bg-white"
                    >
                      <QuickActionsIcon className="size-[26px] text-[#1c1611]" />
                    </button>
                    <div className="flex h-[52px] w-[299px] items-center gap-[10px] rounded-[20px] border border-[#65cce3] bg-white px-4">
                      <SearchIcon className="size-5 shrink-0 text-[#9a9a9a]" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for events you created"
                        className="min-w-0 flex-1 bg-transparent font-dote-input text-[13px] text-[#1a1a1a] outline-none placeholder:text-[#9a9a9a]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/create")}
                    className="shrink-0 rounded-[50px] bg-teal px-[42px] py-4 text-[14px] tracking-[0.35px] text-teal-ink transition hover:brightness-95"
                  >
                    New Celebration
                  </button>
                </div>
              </div>
              {shown.length === 0 ? (
                <EmptyState searching={query.trim().length > 0} onNew={() => router.push("/create")} />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((e) => (
                    <EventCard key={e.id} event={e} onToggleStatus={toggleHidden} />
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {quickOpen && (
        <QuickActionsSheet
          events={events}
          onClose={() => setQuickOpen(false)}
          onHideAll={hideAll}
          onDeleteAll={deleteAll}
          onToggle={toggleHidden}
          onDelete={deleteEvent}
        />
      )}
    </div>
  );
}

/* ------------------------------ banner ---------------------------- */

function SuccessBanner({ show, onClose }: { show: boolean; onClose: () => void }) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex justify-center px-4 transition-all duration-300",
        show ? "translate-y-4 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
      )}
    >
      <div className="flex w-full max-w-[520px] items-center gap-3 rounded-[16px] border border-[#b6ead4] bg-[#eafaf3] px-4 py-3 shadow-[0_12px_30px_-16px_rgba(0,100,70,0.5)]">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#00ab7d]">
          <CheckIcon className="size-4 text-white" />
        </span>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-[#06603f]">Celebration published</p>
          <p className="text-[12px] text-[#2f7a5c]">
            Your celebration is live and ready to share with your guests.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="-m-1 shrink-0 rounded-full p-1 text-[#2f7a5c] transition hover:bg-[#d4efe0]"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* --------------------------- mobile header ------------------------ */

function ListHeader({ onQuickActions, onSearch }: { onQuickActions: () => void; onSearch: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-6 py-[18px]">
      <Link href="/profile" aria-label="Settings" className="transition hover:opacity-80">
        <UserAvatar className="size-[50px] rounded-full object-cover" />
      </Link>
      <div className="flex items-center gap-5">
        <button type="button" aria-label="Quick actions" onClick={onQuickActions}>
          <QuickActionsIcon className="size-6 text-[#1c1611]" />
        </button>
        <button type="button" aria-label="Search" onClick={onSearch}>
          <SearchIcon className="size-6 text-[#1c1611]" />
        </button>
      </div>
    </header>
  );
}

function SearchHeader({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (s: string) => void;
  onClose: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-white px-6 py-[18px]">
      <div className="flex h-[52px] flex-1 items-center gap-2 rounded-[16px] border border-[#e8f1f3] bg-white px-4">
        <SearchIcon className="size-5 shrink-0 text-[#9a9a9a]" />
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search events"
          className="min-w-0 flex-1 bg-transparent font-dote-input text-[15px] text-[#1a1a1a] outline-none placeholder:text-[#b4b4b4]"
        />
      </div>
      <button type="button" onClick={onClose} aria-label="Close search">
        <CloseIcon className="size-5 text-[#1c1611]" />
      </button>
    </header>
  );
}

/* ---------------------------- mobile card ------------------------- */

function EventCard({
  event,
  onToggleStatus,
}: {
  event: StoredEvent;
  onToggleStatus: (id: string) => void;
}) {
  const occ = OCC[event.occasion] ?? OCC.wedding;
  const hidden = !!event.hidden;
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[24px] border border-[#cddde0] bg-white p-[6px] pb-5">
      {/* cover */}
      <div className="relative h-[181px] overflow-hidden rounded-[20px] p-[14px]">
        <div className="absolute inset-0" style={{ background: occ.cover }} />
        {event.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,0.82) 100%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span
              className="rounded-[10px] border px-[6px] py-[2px] text-[10px] leading-4"
              style={{ background: occ.chipBg, borderColor: occ.chipBorder, color: occ.chipText }}
            >
              {occ.label}
            </span>
            {/* status dropdown, shows only the opposite state as the action */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-1.5"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <span className="flex items-center gap-1">
                  <span className={cn("size-2 rounded-full", hidden ? "bg-[#d0d0d0]" : "bg-[#2ee86a]")} />
                  <span
                    className={cn(
                      "text-[14px] tracking-[-0.8px]",
                      hidden ? "text-[#e2e2e2]" : "text-[#93ff8b]"
                    )}
                  >
                    {hidden ? "Hidden" : "Active"}
                  </span>
                </span>
                <ChevronDownIcon
                  className={cn("size-[14px] text-white transition", open && "rotate-180")}
                />
              </button>
              {open && (
                <>
                  <div className="fixed inset-0 z-[5]" onClick={() => setOpen(false)} />
                  <div className="absolute right-0 top-[26px] z-10 w-[132px] overflow-hidden rounded-[12px] border border-[#eef2f3] bg-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)]">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleStatus(event.id);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-[10px] text-left text-[13px] text-[#1c1611] hover:bg-[#f6f6f6]"
                    >
                      <span
                        className={cn("size-2 rounded-full", hidden ? "bg-[#2ee86a]" : "bg-[#d0d0d0]")}
                      />
                      {hidden ? "Set active" : "Hide event"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="text-[22px] font-medium tracking-[-0.8px] text-white">{event.title}</p>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-col gap-[14px] px-2 pt-[14px]">
        <div className="flex flex-col gap-[10px] text-[14px] tracking-[-0.8px] text-[#212121]">
          <div className="flex items-center gap-[6px]">
            <CalendarIcon className="size-5 shrink-0 text-[#212121]" />
            <span>{fmtDate(event.date)}</span>
            {fmtTime(event.time) && (
              <>
                <span className="h-[13px] w-px bg-[#c9c9c9]" />
                <span>{fmtTime(event.time)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-[6px]">
            <LocationIcon className="size-5 shrink-0 text-[#212121]" />
            <span className="truncate">{event.venue || "Venue to be set"}</span>
          </div>
        </div>
        <div className="h-px w-full bg-[#eef2f3]" />
        <div className="flex items-center justify-between text-[14px] tracking-[-0.8px]">
          <span className="text-[#212121]">
            {event.wishes} {event.wishes === 1 ? "wish" : "wishes"}
          </span>
          <a href={`/events/${event.id}`} className="font-medium text-teal">
            Manage
          </a>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ searching, onNew }: { searching: boolean; onNew: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-[#cbe7f0] bg-white/60 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[#eafaf3]">
        <GiftIcon className="size-7 text-teal" />
      </span>
      <div>
        <p className="font-dote text-[18px] font-medium text-[#1c1611]">
          {searching ? "No matching events" : "No celebrations yet"}
        </p>
        <p className="mx-auto mt-1 max-w-[320px] text-[13px] text-[#6e6558]">
          {searching
            ? "Try a different name, or create a new celebration."
            : "Create your first celebration to start receiving gifts, RSVPs, and good wishes."}
        </p>
      </div>
      {!searching && (
        <button
          type="button"
          onClick={onNew}
          className="mt-1 flex h-[48px] items-center gap-2 rounded-[50px] bg-teal px-6 text-[14px] font-medium text-teal-ink"
        >
          <PlusIcon className="size-[18px] text-teal-ink" /> New celebration
        </button>
      )}
    </div>
  );
}

/* ----------------------- quick actions sheet ---------------------- */

function QuickActionsSheet({
  events,
  onClose,
  onHideAll,
  onDeleteAll,
  onToggle,
  onDelete,
}: {
  events: StoredEvent[];
  onClose: () => void;
  onHideAll: () => void;
  onDeleteAll: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const allHidden = events.length > 0 && events.every((e) => e.hidden);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-stretch lg:justify-end">
      <div
        className="absolute inset-0 bg-black/[0.54] lg:bg-black/[0.03] lg:backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[26px] bg-white px-6 pb-8 pt-3 lg:h-full lg:max-h-none lg:max-w-[413px] lg:rounded-none lg:pt-7">
        <div className="mx-auto h-[5px] w-11 rounded-[3px] bg-[#e6e6e6] lg:hidden" />

        <div className="mt-4 flex items-start justify-between lg:mt-0">
          <div className="flex items-center gap-2">
            <QuickActionsIcon className="size-6 text-[#1c1611]" />
            <h2 className="font-dote text-[20px] font-medium tracking-[-0.5px] text-black">Quick Actions</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <CloseIcon className="size-4 text-black" />
          </button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto">
          {/* hide all */}
          <ToggleRow
            title="Hide all created events"
            sub="Your events will be hidden from public view."
            on={allHidden}
            onChange={onHideAll}
          />
          {/* delete all */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-col gap-1 pr-4">
              <span className="text-[14px] font-medium tracking-[-0.28px] text-[#1c1611]">
                Delete all created events
              </span>
              <span className="text-[12px] text-[#6e6558]">
                This will permanently delete all the events you&rsquo;ve created.
              </span>
            </div>
            <button type="button" onClick={onDeleteAll} aria-label="Delete all events">
              <TrashIcon className="size-5 text-[#bc1b06]" />
            </button>
          </div>

          {/* all events list */}
          <div className="mt-6">
            <div className="flex items-center gap-[10px]">
              <span className="h-[13px] w-1 rounded-[2px] bg-teal" />
              <span className="text-[16px] font-semibold text-[#1a1a1a]">All Events</span>
            </div>
            <div className="mt-2 flex flex-col">
              {events.length === 0 ? (
                <p className="py-4 text-[13px] text-[#9a9a9a]">No events to manage.</p>
              ) : (
                events.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between border-b border-[#f0f0f0] py-4 last:border-0"
                  >
                    <span className="truncate pr-3 text-[14px] text-[#1c1611]">{e.title}</span>
                    <div className="flex shrink-0 items-center gap-6">
                      <button type="button" onClick={() => onDelete(e.id)} aria-label={`Delete ${e.title}`}>
                        <TrashIcon className="size-5 text-[#bc1b06]" />
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] text-[#1c1611]">Show</span>
                        <Toggle on={!e.hidden} onChange={() => onToggle(e.id)} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  sub,
  on,
  onChange,
}: {
  title: string;
  sub: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1 pr-4">
        <span className="text-[14px] font-medium tracking-[-0.28px] text-[#1c1611]">{title}</span>
        <span className="text-[12px] text-[#6e6558]">{sub}</span>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={cn(
        "flex w-10 shrink-0 items-center rounded-full p-[2px] transition",
        on ? "justify-end bg-[#06aacf]" : "justify-start bg-[#dedede]"
      )}
    >
      <span className="size-4 rounded-full bg-white" />
    </button>
  );
}

/* ------------------------------ desktop --------------------------- */

export function TopBar({ section = "Events" }: { section?: string }) {
  const [name, setName] = useState("");
  useEffect(() => {
    setName(getSession().name || "");
  }, []);
  return (
    <header className="flex h-[89px] shrink-0 items-center border-b border-[#bdcfd3] bg-[#f6f6f6]/50">
      <div className="flex w-[251px] shrink-0 items-center justify-between px-6">
        <DoteLogo />
        <button
          type="button"
          onClick={() => {
            if (typeof document === "undefined") return;
            if (document.fullscreenElement) document.exitFullscreen?.();
            else document.documentElement.requestFullscreen?.();
          }}
          aria-label="Toggle fullscreen"
          className="text-[#1c1c1c] transition hover:opacity-60"
        >
          <MaximizeIcon className="size-[22px]" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-between pl-7 pr-6">
        <span className="text-[12px] font-medium text-teal">{section}</span>
        <Link href="/profile" className="flex items-end gap-2 transition hover:opacity-80">
          <UserAvatar className="size-12 rounded-full object-cover" />
          <span className="leading-tight">
            <span className="block text-[14px] text-[#494949]">Hello,</span>
            <span className="block text-[16px] font-medium text-black">{name || "there"}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

const NAV = [
  { key: "events", label: "Events created", icon: "/dote/sidebar/events.svg", href: "/events" },
  { key: "wallet", label: "Wallet", icon: "/dote/sidebar/wallet.svg", href: "/wallet" },
  { key: "new", label: "New celebration", icon: "/dote/sidebar/new.svg", href: "/create" },
  { key: "invites", label: "Invites received", icon: "/dote/sidebar/invites.svg", href: "/invites" },
  { key: "notification", label: "Notification", icon: "/dote/sidebar/notification.svg", href: "/notifications" },
  { key: "settings", label: "Settings", icon: "/dote/sidebar/settings.svg", href: "/profile" },
] as const;

export function Sidebar({ active = "events" }: { active?: string }) {
  return (
    <aside className="flex w-[251px] shrink-0 flex-col overflow-y-auto border-r border-[#bdcfd3] px-6 pt-[42px]">
      <p className="text-[16px] font-medium tracking-[-0.66px] text-[#878787]">Menu</p>
      <nav className="mt-6 flex flex-col">
        {NAV.map((item) => {
          const on = item.key === active;
          return (
          <Link
            key={item.key}
            href={"href" in item ? (item.href as string) : "#"}
            className={cn(
              "flex items-center gap-3 whitespace-nowrap text-[12px] font-medium",
              on
                ? "w-fit rounded-[18px] bg-teal py-[10px] pl-[18px] pr-16 text-white"
                : "px-[18px] py-4 text-[#616161]"
            )}
          >
            {on ? (
              <span
                aria-hidden
                className="size-6 bg-white"
                style={{
                  WebkitMaskImage: `url(/dote/nav-active/${item.key}.svg)`,
                  maskImage: `url(/dote/nav-active/${item.key}.svg)`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.icon} alt="" className="size-6" />
            )}
            {item.label}
          </Link>
          );
        })}
      </nav>
      <SidebarLogout />
    </aside>
  );
}

/* ------------------------------ icons ----------------------------- */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
  );
}
// maximize-3 (fullscreen), matches the Figma topbar icon
function MaximizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H6a3 3 0 0 0-3 3v2M16 3h2a3 3 0 0 1 3 3v2M8 21H6a3 3 0 0 1-3-3v-2M16 21h2a3 3 0 0 0 3-3v-2" />
    </svg>
  );
}
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="4" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
  );
}
function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
  );
}
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
  );
}
function QuickActionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2h5l5 5v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" /><path d="M13 2v5h5M8.5 13h7" /></svg>
  );
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4h6v3" /></svg>
  );
}
function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S9 2 6.5 4.5 7 7 12 7ZM12 7s3-5 5.5-2.5S17 7 12 7Z" /></svg>
  );
}
