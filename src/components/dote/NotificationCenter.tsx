"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "./Toast";
import { isAuthed } from "@/lib/auth";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
  type ApiNotification,
} from "@/lib/engagement";

/* ------------------------------------------------------------------ *
 * Live notifications for signed-in hosts. While any host page is open
 * we check the unread count every 30 seconds (and as soon as the tab
 * is back in view), keep the bell's badge current, and announce new
 * ones with a toast that opens what they're about.
 * ------------------------------------------------------------------ */

export type Kind = "contribution" | "wish" | "invite" | "wallet" | "system";
export type Notif = { id: string; kind: Kind; title: string; body: string; link?: string; at: number; read?: boolean };

export function toNotif(n: ApiNotification): Notif {
  return {
    id: n.id,
    kind: (n.kind as Kind) || "system",
    title: n.title,
    body: n.body,
    link: n.link || "",
    at: Date.parse(n.created_at) || Date.now(),
    read: n.read_at != null,
  };
}

type Ctx = {
  unread: number;
  recent: Notif[];
  loaded: boolean;
  /** Reload the list now (throws when the API can't be reached). */
  refresh: () => Promise<void>;
  /** Mark one read and go where it points (the Notifications page if nowhere). */
  open: (n: Notif) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<Ctx | null>(null);

const FALLBACK: Ctx = {
  unread: 0,
  recent: [],
  loaded: false,
  refresh: async () => {},
  open: () => {},
  markAllRead: () => {},
};

export function useNotifications(): Ctx {
  return useContext(NotificationsContext) ?? FALLBACK;
}

const POLL_MS = 30_000;
// Newest notification time already announced in this browser session, so
// moving between pages doesn't pop up the same thing twice.
const ANNOUNCED_KEY = "avela.notifAnnouncedAt";

function readAnnounced(): number | null {
  try {
    const v = sessionStorage.getItem(ANNOUNCED_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
function writeAnnounced(at: number) {
  try {
    sessionStorage.setItem(ANNOUNCED_KEY, String(at));
  } catch {
    /* storage unavailable: worst case a toast repeats */
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<Notif | null>(null);
  const lastCount = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const rows = (await listNotifications()).map(toNotif);
    setRecent(rows);
    setUnread(rows.filter((r) => !r.read).length);
    setLoaded(true);
    const newest = rows.reduce((m, r) => Math.max(m, r.at), 0);
    const announced = readAnnounced();
    if (announced === null) {
      // First look this session: what's already there isn't news.
      writeAnnounced(newest || Date.now());
      return;
    }
    const fresh = rows.filter((r) => !r.read && r.at > announced);
    if (fresh.length) setToast(fresh[0]); // newest first
    if (newest > announced) writeAnnounced(newest);
  }, []);

  const tick = useCallback(async () => {
    if (!isAuthed()) return;
    try {
      const { unread: n } = await unreadNotificationCount();
      if (lastCount.current === null || n !== lastCount.current) await refresh();
      lastCount.current = n;
      setUnread(n);
    } catch {
      /* offline or signed out: try again next time */
    }
  }, [refresh]);

  useEffect(() => {
    // Kick off the first check right away (async, so it doesn't set state
    // during this effect), then keep checking while the tab is visible.
    const first = setTimeout(tick, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, POLL_MS);
    const onShow = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [tick]);

  // A toast stays for 8 seconds unless dismissed or opened.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const open = useCallback(
    (n: Notif) => {
      if (!n.read) {
        setRecent((cur) => cur.map((r) => (r.id === n.id ? { ...r, read: true } : r)));
        setUnread((c) => Math.max(0, c - 1));
        lastCount.current = lastCount.current === null ? null : Math.max(0, lastCount.current - 1);
        markNotificationRead(n.id).catch(() => {});
      }
      router.push(n.link || "/notifications");
    },
    [router],
  );

  const markAllRead = useCallback(() => {
    setRecent((cur) => cur.map((r) => ({ ...r, read: true })));
    setUnread(0);
    lastCount.current = 0;
    markAllNotificationsRead().catch(() => {});
  }, []);

  return (
    <NotificationsContext.Provider value={{ unread, recent, loaded, refresh, open, markAllRead }}>
      {children}
      <Toast
        tone="info"
        show={!!toast}
        title={toast?.title ?? ""}
        message={toast?.body}
        onClose={() => setToast(null)}
        action={
          toast
            ? {
                label: toast.link ? "Open" : "View",
                onClick: () => {
                  const n = toast;
                  setToast(null);
                  open(n);
                },
              }
            : undefined
        }
      />
    </NotificationsContext.Provider>
  );
}

/* ------------------------------- bell ---------------------------------- */

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-[3px] -top-[3px] grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-[#e12525] px-[3px] text-[10px] font-semibold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** A small dot for menu items (side menu, tab bar) when there's news.
 *  `light` for a highlighted (teal) menu item. */
export function UnreadDot({ light = false, className = "" }: { light?: boolean; className?: string }) {
  const { unread } = useNotifications();
  if (unread <= 0) return null;
  return (
    <span
      aria-label={`${unread} unread`}
      className={`size-2 shrink-0 rounded-full ${light ? "bg-white" : "bg-[#e12525]"} ${className}`}
    />
  );
}

/**
 * The bell with its unread badge. On desktop it opens a short preview of the
 * latest notifications; with `panel={false}` (phones) it goes straight to the
 * Notifications page.
 */
export function NotificationBell({ panel = true }: { panel?: boolean }) {
  const { unread, recent, loaded, open, markAllRead, refresh } = useNotifications();
  const [show, setShow] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";

  useEffect(() => {
    if (!show) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setShow(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShow(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [show]);

  const icon = (
    <span className="relative grid size-10 place-items-center rounded-full transition hover:bg-black/[0.04]">
      {/* The same bell as the Notification item in the side menu and tab bar. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dote/sidebar/notification.svg" alt="" className="size-6" />
      <Badge count={unread} />
    </span>
  );

  if (!panel) {
    return (
      <Link href="/notifications" aria-label={label}>
        {icon}
      </Link>
    );
  }

  const latest = recent.slice(0, 5);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={show}
        onClick={() => {
          if (!show) refresh().catch(() => {});
          setShow((s) => !s);
        }}
      >
        {icon}
      </button>
      {show && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+10px)] z-50 flex w-[380px] flex-col gap-3 rounded-[20px] border border-[#e8f1f3] bg-white p-4 font-dote shadow-[0_18px_40px_-20px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center justify-between">
            <p className="text-[16px] font-medium tracking-[-0.4px] text-[#1c1611]">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-[13px] font-medium text-teal transition hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {loaded && latest.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-[#6e6558]">You&rsquo;re all caught up.</p>
          ) : (
            <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              {latest.map((n) => (
                <NotifRow
                  key={n.id}
                  n={n}
                  unread={!n.read}
                  onOpen={
                    n.link
                      ? () => {
                          setShow(false);
                          open(n);
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
          <Link
            href="/notifications"
            onClick={() => setShow(false)}
            className="flex h-[40px] items-center justify-center rounded-[50px] border border-teal text-[14px] font-medium text-teal transition hover:bg-teal/5"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- row ----------------------------------- */

export function relTime(at: number): string {
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

const STYLE: Record<Kind, { bg: string; fg: string; Icon: (p: { className?: string }) => React.ReactElement }> = {
  contribution: { bg: "#dffcff", fg: "#06aacf", Icon: GiftIcon },
  wish: { bg: "#ffe3f3", fg: "#e05b9b", Icon: HeartIcon },
  invite: { bg: "#eafaff", fg: "#529ae2", Icon: MailIcon },
  wallet: { bg: "#e7f7ec", fg: "#1a9f5a", Icon: WalletIcon },
  system: { bg: "#fff3e3", fg: "#e8872e", Icon: StarIcon },
};

/** One notification. With `onOpen` it's a button that opens what it's about. */
export function NotifRow({ n, unread, onOpen }: { n: Notif; unread: boolean; onOpen?: () => void }) {
  const s = STYLE[n.kind] ?? STYLE.system;
  const Icon = s.Icon;
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px]" style={{ background: s.bg, color: s.fg }}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold tracking-[-0.1px] text-[#1c1611]">{n.title}</span>
        <span className="mt-0.5 block text-[13px] leading-[19px] text-[#6e6e6e]">{n.body}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="whitespace-nowrap text-[12px] text-[#9a9a9a]">{relTime(n.at)}</span>
        {unread && <span className="size-2 rounded-full bg-teal" />}
      </span>
    </>
  );
  const cls = `flex w-full items-start gap-3 rounded-[16px] border p-4 text-left transition ${
    unread ? "border-[#cdeef5] bg-[#f6feff]" : "border-[#eeeeee] bg-white"
  }`;
  if (!onOpen) return <div className={cls}>{body}</div>;
  return (
    <button type="button" onClick={onOpen} className={`${cls} hover:border-teal/40`}>
      {body}
    </button>
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
export function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
