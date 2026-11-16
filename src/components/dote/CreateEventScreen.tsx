"use client";

import { useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { BottomNav } from "./BottomNav";
import { DoteLogo } from "./Logo";
import { TopBar, Sidebar } from "./EventsHome";

type Occasion = {
  key: string;
  name: string;
  tagline: string;
  photo: string;
  nameColor: string;
  /** Which part of the photo stays in view when a tile crops it wide. */
  focus?: string;
};

const OCCASIONS: Occasion[] = [
  { key: "wedding", name: "Wedding", tagline: "Two hearts, one celebration.", photo: "/dote/occasions/wedding.jpg", nameColor: "#7EDFFF", focus: "50% 30%" },
  { key: "birthday", name: "Birthday", tagline: "Another year worth celebrating.", photo: "/dote/occasions/birthday.jpg", nameColor: "#B3FF84", focus: "50% 40%" },
  { key: "baby", name: "Baby shower", tagline: "A little one on the way.", photo: "/dote/occasions/baby.jpg", nameColor: "#FFB2FB", focus: "50% 35%" },
  { key: "graduation", name: "Graduation", tagline: "Hard work, well celebrated.", photo: "/dote/occasions/graduation.jpg", nameColor: "#FFD27A", focus: "50% 30%" },
  // A celebration of life: gentle wording throughout (tributes, "the family").
  { key: "farewell", name: "Farewell", tagline: "Celebrating a life well lived.", photo: "/dote/occasions/farewell.jpg", nameColor: "#D9CCFF", focus: "50% 38%" },
];

// Warm→cool page wash from the Figma.
const SCREEN_BG =
  "linear-gradient(150.9deg, #FFFEF7 0.85%, #F8F5FF 41.76%, #FAFEFF 74.51%)";

/**
 * Create a new event: pick the occasion. Every occasion is on screen at once,
 * with nothing to swipe or scroll: a tile grid on phones (two across, the last
 * one full width) and one row of five on desktop.
 */
export function CreateEventScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function createEvent() {
    if (!selected) return;
    setLoading(true);
    // Into the 4-step setup flow (Event Details → Upload → Wishlist).
    setTimeout(() => router.push(`/create/details?occasion=${selected}`), 900);
  }

  return (
    <div className="min-h-screen font-dote" style={{ background: SCREEN_BG }}>
      {/* ============ MOBILE ============ */}
      {/* Fits one screen: the tiles share whatever height the header, heading,
          button and tab bar leave (dvh, so the browser's own bars count). */}
      <div className="flex h-dvh w-full flex-col overflow-hidden lg:hidden">
        <header className="flex shrink-0 items-center justify-between px-6 pb-2 pt-4">
          <DoteLogo />
          <AccountChip />
        </header>

        <main className="flex min-h-0 flex-1 flex-col px-6 pb-[92px]">
          <Heading className="shrink-0 pt-2 text-center" size="mobile" />

          <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-3">
            {OCCASIONS.map((occ, i) => (
              <OccasionTile
                key={occ.key}
                occ={occ}
                compact
                className={i === OCCASIONS.length - 1 ? "col-span-2" : undefined}
                selected={selected === occ.key}
                onSelect={() => setSelected(occ.key)}
              />
            ))}
          </div>

          <CreateButton className="mt-4 shrink-0 self-center" disabled={!selected} onClick={createEvent} />
        </main>

        <div className="fixed inset-x-0 bottom-0">
          <BottomNav active="new" />
        </div>
      </div>

      {/* ============ DESKTOP ============ */}
      <div className="hidden h-screen flex-col overflow-hidden lg:flex">
        <TopBar section="" />
        <div className="flex min-h-0 flex-1">
          <Sidebar active="new" />
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-8">
            <Heading className="text-center" size="desktop" />
            {/* All five in one row; tiles shrink a little on narrower screens. */}
            <div className="mt-8 flex w-full max-w-[1040px] gap-4">
              {OCCASIONS.map((occ) => (
                <OccasionTile
                  key={occ.key}
                  occ={occ}
                  className="aspect-[5/7] max-h-[300px] min-w-0 flex-1"
                  selected={selected === occ.key}
                  onSelect={() => setSelected(occ.key)}
                />
              ))}
            </div>
            <CreateButton className="mt-8" disabled={!selected} onClick={createEvent} />
          </main>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-white/55 backdrop-blur-sm">
          <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-teal/25 border-t-teal" />
          <span className="text-[14px] font-medium text-teal">Loading&hellip;</span>
        </div>
      )}
    </div>
  );
}

/* ---------- shared pieces ---------- */

function Heading({ className, size }: { className?: string; size: "mobile" | "desktop" }) {
  return (
    <div className={className}>
      <h1
        className={cn(
          "mx-auto tracking-[-0.66px]",
          size === "mobile" ? "text-[28px] leading-[1.15]" : "font-dote text-[42px] leading-[1.1]"
        )}
      >
        <span className="font-medium text-black">What are you </span>
        <span className="font-bold text-[#6a9da9]">celebrating</span>
        <span className="font-medium text-[#83adb6]">?</span>
      </h1>
      <p
        className={cn(
          "mx-auto mt-1.5 font-medium text-[#5c5c5c]",
          size === "mobile"
            ? "max-w-[320px] text-[14px] leading-[20px]"
            : "max-w-[450px] text-[16px] leading-[22px]"
        )}
      >
        Choose the celebration you&rsquo;d love to create, invites, wishes, and gifts, all in one
        place.
      </p>
    </div>
  );
}

function OccasionTile({
  occ,
  selected,
  onSelect,
  compact = false,
  className,
}: {
  occ: Occasion;
  selected: boolean;
  onSelect: () => void;
  /** Phone tiles: shorter, so the name and line sit low with no button. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${occ.name}: ${occ.tagline}`}
      className={cn(
        "relative min-h-0 overflow-hidden text-left transition hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/60",
        compact ? "rounded-[20px]" : "rounded-[26px]",
        selected && "ring-[3px] ring-teal ring-offset-2 ring-offset-[#fafeff]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={occ.photo}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: occ.focus }}
      />
      <span
        className="absolute inset-0"
        style={{
          background: selected
            ? "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.8) 90%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.78) 92%)",
        }}
      />

      {selected && (
        <span className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/dote/tick-square.svg" alt="" className="size-[18px]" />
        </span>
      )}

      <span
        className={cn(
          "absolute inset-x-0 flex flex-col tracking-[-0.66px]",
          compact ? "bottom-3 px-3" : "bottom-[18px] items-center gap-[10px] px-4 text-center"
        )}
      >
        <span className="flex flex-col">
          <span className={cn("leading-tight", compact ? "text-[17px]" : "text-[20px]")} style={{ color: occ.nameColor }}>
            {occ.name}
          </span>
          <span className={cn("text-[#e6e6e6]", compact ? "text-[11px] leading-[14px]" : "text-[12px]")}>
            {occ.tagline}
          </span>
        </span>
        {!compact &&
          (selected ? (
            <span className="rounded-[14px] border-[0.5px] border-[#5d6061] bg-white px-3 py-2 text-[12px] tracking-[-0.2px] text-[#00729f]">
              Selected
            </span>
          ) : (
            <span className="rounded-[14px] border-[0.5px] border-[#5d6061] bg-[#191919]/[0.23] px-3 py-2 text-[12px] tracking-[-0.2px] text-white backdrop-blur-sm">
              Select event type
            </span>
          ))}
      </span>
    </button>
  );
}

function CreateButton({
  className,
  disabled,
  onClick,
}: {
  className?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-[52px] w-[354px] max-w-full rounded-[50px] text-[14px] tracking-[0.35px] transition",
        disabled
          ? "cursor-not-allowed bg-teal/30 text-white/80"
          : "bg-teal text-teal-ink hover:brightness-95",
        className
      )}
    >
      Create Event
    </button>
  );
}

function AccountChip() {
  return (
    <Link href="/profile" className="flex items-center gap-1 transition hover:opacity-80" aria-label="Settings">
      <UserAvatar className="h-[44px] w-[44px] rounded-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dote/arrow-down.svg" alt="" className="h-4 w-4" />
    </Link>
  );
}
