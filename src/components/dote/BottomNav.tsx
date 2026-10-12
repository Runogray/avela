import Link from "next/link";
import { cn } from "@/lib/cn";

/** Dote host-app bottom tab bar (mobile). "New" is the create-event tab. */
const TABS = [
  { key: "events", label: "Events", icon: "/dote/nav/events.svg", href: "/events" },
  { key: "wallet", label: "Wallet", icon: "/dote/nav/wallet.svg", href: "/wallet" },
  { key: "new", label: "New", icon: "/dote/nav/new.svg", href: "/create" },
  { key: "invites", label: "Invites", icon: "/dote/nav/invites.svg", href: "/invites" },
  { key: "notification", label: "Notification", icon: "/dote/nav/notification.svg", href: "/notifications" },
] as const;

export function BottomNav({ active = "new" }: { active?: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="flex items-stretch justify-around border-t border-[#dff3f8] bg-white pb-[env(safe-area-inset-bottom,0px)]">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-[2px] px-2 pb-4 pt-3"
          >
            {on ? (
              // active tab: filled icon tinted teal (mask preserves the bulk shape)
              <span
                aria-hidden
                className="h-6 w-6 bg-teal"
                style={{
                  WebkitMaskImage: `url(/dote/nav-active/${t.key}.svg)`,
                  maskImage: `url(/dote/nav-active/${t.key}.svg)`,
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
            ) : (
              // rest: outline icon
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.icon} alt="" className="h-6 w-6" />
            )}
            <span
              className={cn(
                "font-dote text-[10px] leading-none",
                on ? "text-teal" : "text-[#747474]"
              )}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
