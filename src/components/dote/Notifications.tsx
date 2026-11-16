"use client";

import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { useRouter } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { TopBar, Sidebar } from "./EventsHome";
import { BellIcon, NotifRow, useNotifications, type Notif } from "./NotificationCenter";

/* ------------------------------------------------------------------ *
 * Dote, Notifications. No Figma for this screen; designed from the
 * product we have. The feed comes live from the API (NotificationCenter
 * keeps it fresh and opens each one where it points). Only when the API
 * can't be reached does it fall back to the local mock stores
 * (dote.contributions, dote.wellwishes, dote.invites, dote.auth).
 * ------------------------------------------------------------------ */


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
  const { recent, refresh, open, markAllRead: markAllLive } = useNotifications();
  // Set only when the API can't be reached: the local mock feed instead.
  const [offline, setOffline] = useState<Notif[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    refresh()
      .catch(() => {
        if (!alive) return;
        let localReadAt = 0;
        try {
          localReadAt = Number(localStorage.getItem("dote.notifReadAt") || "0");
        } catch {
          /* ignore */
        }
        setOffline(buildNotifications().map((n) => ({ ...n, read: n.at <= localReadAt })));
      })
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [refresh]);

  const items = offline ?? recent;
  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const groups = useMemo(() => {
    const order: Array<"Today" | "This week" | "Earlier"> = ["Today", "This week", "Earlier"];
    const map: Record<string, Notif[]> = {};
    for (const n of items) (map[groupOf(n.at)] ||= []).push(n);
    return order.filter((g) => map[g]?.length).map((g) => ({ label: g, items: map[g] }));
  }, [items]);

  function markAllRead() {
    if (!offline) return markAllLive();
    setOffline((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    try {
      localStorage.setItem("dote.notifReadAt", String(Date.now()));
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
                  <NotifRow key={n.id} n={n} unread={!n.read} onOpen={offline || !n.link ? undefined : () => open(n)} />
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
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-6 py-[18px]">
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
                <h1 className="flex items-center gap-2 font-dote text-[22px] font-medium tracking-[-0.8px] text-[#1c1611]">
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
