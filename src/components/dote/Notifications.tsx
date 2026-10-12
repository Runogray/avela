"use client";

import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { useRouter } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { TopBar, Sidebar } from "./EventsHome";
import { listNotifications, markAllNotificationsRead } from "@/lib/engagement";

/* ------------------------------------------------------------------ *
 * Dote, Notifications. No Figma for this screen; designed from the
 * product we have. Surfaces real activity from localStorage:
 *   • contributions to the user's events  (dote.contributions)
 *   • well wishes received                (dote.wellwishes)
 *   • invites the user accepted            (dote.invites)
 *   • a welcome note                       (dote.auth)
 * Grouped by time with per-item read/unread (dote.notifReadAt).
 * ------------------------------------------------------------------ */

type Kind = "contribution" | "wish" | "invite" | "wallet" | "system";
type Notif = { id: string; kind: Kind; title: string; body: string; at: number; read?: boolean };

type StoredItem = { id: string; name: string };
type StoredEvent = { id: string; title: string; items?: StoredItem[] };
type Contribution = { id: string; eventId: string; itemId: string; itemName?: string; amount: number; name: string; createdAt: number };
type WellWish = { id: string; eventId: string; name: string; message: string; createdAt: number };

const naira = (n: number) => `₦${n.toLocaleString()}`;

function buildNotifications(): Notif[] {
  const out: Notif[] = [];
  const read = <T,>(k: string): T[] => {
    try {
      return JSON.parse(localStorage.getItem(k) || "[]");
    } catch {
      return [];
    }
  };

  const events: StoredEvent[] = read("dote.events");
  const myIds = new Set(events.map((e) => e.id));
  const itemName: Record<string, string> = {};
  const eventTitle: Record<string, string> = {};
  for (const e of events) {
    eventTitle[e.id] = e.title;
    for (const it of e.items ?? []) itemName[it.id] = it.name;
  }

  // Contributions to my events
  for (const c of read<Contribution>("dote.contributions")) {
    if (!myIds.has(c.eventId)) continue;
    const gift = c.itemName || itemName[c.itemId] || "your wishlist";
    out.push({
      id: `c-${c.id}`,
      kind: "contribution",
      title: "New contribution",
      body: `${c.name} sent ${naira(c.amount)} towards ${gift}.`,
      at: c.createdAt,
    });
  }

  // Well wishes to my events
  for (const w of read<WellWish>("dote.wellwishes")) {
    if (w.eventId && !myIds.has(w.eventId)) continue;
    out.push({
      id: `w-${w.id}`,
      kind: "wish",
      title: "New well wish",
      body: `${w.name} sent you a heartfelt message.`,
      at: w.createdAt,
    });
  }

  // Wallet activity, funding & withdrawals
  type WalletTx = { id: string; kind: "topup" | "withdraw"; amount: number; at: number };
  for (const t of read<WalletTx>("dote.wallettx")) {
    if (t.kind === "topup") {
      out.push({
        id: `wt-${t.id}`,
        kind: "wallet",
        title: "Wallet funded",
        body: `${naira(t.amount)} was added to your wallet via Paystack.`,
        at: t.at,
      });
    } else {
      out.push({
        id: `wt-${t.id}`,
        kind: "wallet",
        title: "Withdrawal successful",
        body: `${naira(t.amount)} is on its way to your bank account.`,
        at: t.at,
      });
    }
  }

  // Invites accepted
  const invites: string[] = read("dote.invites");
  invites.forEach((id, i) => {
    const title = eventTitle[id];
    out.push({
      id: `i-${id}`,
      kind: "invite",
      title: "Invite added",
      body: title ? `You joined ${title}.` : "A celebration was added to your invites.",
      at: Date.now() - (i + 1) * 36e5,
    });
  });

  // Welcome
  try {
    const auth = JSON.parse(localStorage.getItem("dote.auth") || "{}");
    if (auth.at) {
      out.push({
        id: "sys-welcome",
        kind: "system",
        title: "Welcome to Dote 🎉",
        body: "Your account is ready. Create a celebration or add an invite to get started.",
        at: auth.at,
      });
    }
  } catch {
    /* ignore */
  }

  return out.sort((a, b) => b.at - a.at);
}

function relTime(at: number): string {
  const diff = Date.now() - at;
  const m = Math.round(diff / 6e4);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  const date = new Date(at);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function groupOf(at: number): "Today" | "This week" | "Earlier" {
  const d = new Date(at);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today";
  if (Date.now() - at < 7 * 864e5) return "This week";
  return "Earlier";
}

export function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [readAt, setReadAt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    let localReadAt = 0;
    try {
      localReadAt = Number(localStorage.getItem("dote.notifReadAt") || "0");
    } catch {
      /* ignore */
    }
    setReadAt(localReadAt);
    (async () => {
      try {
        const api = await listNotifications();
        if (!alive) return;
        setItems(
          api.map((n) => ({
            id: n.id,
            kind: n.kind as Kind,
            title: n.title,
            body: n.body,
            at: Date.parse(n.created_at) || Date.now(),
            read: n.read_at != null,
          })),
        );
      } catch {
        // offline → derive from local mock, read state from the stored ts
        if (alive)
          setItems(buildNotifications().map((n) => ({ ...n, read: n.at <= localReadAt })));
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const groups = useMemo(() => {
    const order: Array<"Today" | "This week" | "Earlier"> = ["Today", "This week", "Earlier"];
    const map: Record<string, Notif[]> = {};
    for (const n of items) (map[groupOf(n.at)] ||= []).push(n);
    return order.filter((g) => map[g]?.length).map((g) => ({ label: g, items: map[g] }));
  }, [items]);

  function markAllRead() {
    const now = Date.now();
    setReadAt(now);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead().catch(() => {});
    try {
      localStorage.setItem("dote.notifReadAt", String(now));
    } catch {
      /* ignore */
    }
  }

  const list = (
    <>
      {loaded && items.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-3">
              <p className="px-1 text-[12px] font-semibold uppercase tracking-[0.4px] text-[#8a8a8a]">{g.label}</p>
              <div className="flex flex-col gap-[10px]">
                {g.items.map((n) => (
                  <NotifRow key={n.id} n={n} unread={!n.read} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div
      className="min-h-screen font-dote text-black"
      style={{ backgroundImage: "linear-gradient(160deg, #fffef7 1%, #f8f5ff 42%, #fafeff 75%)" }}
    >
      {/* ============================ MOBILE ============================ */}
      <div className="flex min-h-screen flex-col lg:hidden">
        <header className="flex items-center justify-between bg-white px-6 py-[18px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              aria-label="Profile"
              className="transition hover:opacity-80"
            >
              <UserAvatar className="size-[50px] rounded-full object-cover" />
            </button>
            <p className="flex items-center gap-2 text-[20px] font-medium tracking-[-0.4px] text-black">
              Notifications
              {unread > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-teal px-1.5 text-[11px] font-semibold text-teal-ink">
                  {unread}
                </span>
              )}
            </p>
          </div>
          {unread > 0 && (
            <button type="button" onClick={markAllRead} className="text-[13px] font-medium text-teal transition hover:underline">
              Mark all read
            </button>
          )}
        </header>
        <div className="flex-1 px-6 pb-28 pt-6">{list}</div>
        <div className="fixed inset-x-0 bottom-0">
          <BottomNav active="notification" />
        </div>
      </div>

      {/* ============================ DESKTOP =========================== */}
      <div className="hidden h-screen flex-col overflow-hidden bg-[#f8f8f8] lg:flex">
        <TopBar section="Notifications" />
        <div className="flex min-h-0 flex-1">
          <Sidebar active="notification" />
          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-10">
            <div className="mx-auto w-full max-w-[720px]">
              <div className="mb-6 flex items-center justify-between">
                <h1 className="flex items-center gap-2 text-[22px] font-medium tracking-[-0.8px] text-[#1c1611]">
                  Notifications
                  {unread > 0 && (
                    <span className="grid min-w-5 place-items-center rounded-full bg-teal px-1.5 text-[11px] font-semibold text-teal-ink">
                      {unread}
                    </span>
                  )}
                </h1>
                {unread > 0 && (
                  <button type="button" onClick={markAllRead} className="text-[13px] font-medium text-teal transition hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              {list}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- row ----------------------------------- */
const STYLE: Record<Kind, { bg: string; fg: string; Icon: (p: { className?: string }) => React.ReactElement }> = {
  contribution: { bg: "#dffcff", fg: "#06aacf", Icon: GiftIcon },
  wish: { bg: "#ffe3f3", fg: "#e05b9b", Icon: HeartIcon },
  invite: { bg: "#eafaff", fg: "#529ae2", Icon: MailIcon },
  wallet: { bg: "#e7f7ec", fg: "#1a9f5a", Icon: WalletIcon },
  system: { bg: "#fff3e3", fg: "#e8872e", Icon: StarIcon },
};

function NotifRow({ n, unread }: { n: Notif; unread: boolean }) {
  const s = STYLE[n.kind];
  const Icon = s.Icon;
  return (
    <div
      className={`flex items-start gap-3 rounded-[16px] border p-4 transition ${
        unread ? "border-[#cdeef5] bg-[#f6feff]" : "border-[#eeeeee] bg-white"
      }`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px]" style={{ background: s.bg, color: s.fg }}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold tracking-[-0.1px] text-[#1c1611]">{n.title}</p>
        <p className="mt-0.5 text-[13px] leading-[19px] text-[#6e6e6e]">{n.body}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="whitespace-nowrap text-[12px] text-[#9a9a9a]">{relTime(n.at)}</span>
        {unread && <span className="size-2 rounded-full bg-teal" />}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-[#cddde0] bg-white/60 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-teal/10 text-teal">
        <BellIcon className="size-7" />
      </span>
      <p className="mt-1 text-[15px] font-medium text-[#1c1611]">You&rsquo;re all caught up</p>
      <p className="max-w-[300px] text-[13px] text-[#6e6558]">
        Contributions, well wishes and invites will show up here.
      </p>
    </div>
  );
}

/* ------------------------------- icons --------------------------------- */
function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      <path d="M12 8S10.5 3.5 8 4.5 9.5 8 12 8Zm0 0s1.5-4.5 4-3.5S14.5 8 12 8Z" />
    </svg>
  );
}
function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7-4.5-9.5-9A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
    </svg>
  );
}
function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}
function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18M16 14h2" />
    </svg>
  );
}
function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.9 5.9 6.6 1-4.7 4.6 1.1 6.5L12 17.9 6.1 20.5l1.1-6.5L2.5 9.4l6.6-1L12 2.5Z" />
    </svg>
  );
}
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
