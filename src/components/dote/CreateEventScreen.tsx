"use client";

import { useRef, useState } from "react";
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
};

const OCCASIONS: Occasion[] = [
  { key: "wedding", name: "Wedding", tagline: "Two hearts, one celebration.", photo: "/dote/occasions/wedding.jpg", nameColor: "#7EDFFF" },
  { key: "birthday", name: "Birthday", tagline: "Another year worth celebrating.", photo: "/dote/occasions/birthday.jpg", nameColor: "#B3FF84" },
  { key: "baby", name: "Baby shower", tagline: "A little one on the way.", photo: "/dote/occasions/baby.jpg", nameColor: "#FFB2FB" },
  { key: "graduation", name: "Graduation", tagline: "Hard work, well celebrated.", photo: "/dote/occasions/graduation.jpg", nameColor: "#FFD27A" },
  // A celebration of life: gentle wording throughout (tributes, "the family").
  { key: "farewell", name: "Farewell", tagline: "Celebrating a life well lived.", photo: "/dote/occasions/farewell.jpg", nameColor: "#D9CCFF" },
];

// Warm→cool page wash from the Figma.
const SCREEN_BG =
  "linear-gradient(150.9deg, #FFFEF7 0.85%, #F8F5FF 41.76%, #FAFEFF 74.51%)";

/** Create a new event, occasion picker. Carousel on mobile; on desktop a
 *  grid of photo cards (three, then two) with Create Event pinned below. */
export function CreateEventScreen() {
  const router = useRouter();
  const [active, setActive] = useState(1); // mobile carousel centre (Birthday)
  const [dir, setDir] = useState<1 | -1>(1); // last swipe direction (for the swap animation)
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const touchX = useRef<number | null>(null);

  const n = OCCASIONS.length;

  function go(d: 1 | -1) {
    setDir(d);
    setActive((a) => (a + d + n) % n);
  }
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 40) go(-1);
    else if (dx < -40) go(1);
    touchX.current = null;
  }
  function createEvent() {
    if (!selected) return;
    setLoading(true);
    // Into the 4-step setup flow (Event Details → Upload → Wishlist).
    setTimeout(() => router.push(`/create/details?occasion=${selected}`), 900);
  }

  const activeOcc = OCCASIONS[active];

  return (
    <div className="min-h-screen font-dote" style={{ background: SCREEN_BG }}>
      {/* ============ MOBILE ============ */}
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden lg:hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-[18px]">
          <DoteLogo />
          <AccountChip />
        </header>

        <main className="flex flex-1 flex-col items-center pb-28">
          <Heading className="px-6" size="mobile" />

          <div className="mt-8 w-full overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {/* Full-width flex + justify-center keeps the active card dead-centre
                on any width; the peeks bleed off symmetrically and are clipped
                by the overflow-hidden parent (coverflow look). */}
            <div
              key={active}
              className="animate-occ-swap flex w-full items-center justify-center gap-5"
              style={{ ["--occ-from" as string]: dir === 1 ? "32px" : "-32px" }}
            >
              <Peek occ={OCCASIONS[(active + n - 1) % n]} onClick={() => go(-1)} />
              <OccasionCard
                occ={activeOcc}
                selected={selected === activeOcc.key}
                onSelect={() => setSelected(activeOcc.key)}
              />
              <Peek occ={OCCASIONS[(active + 1) % n]} onClick={() => go(1)} />
            </div>
          </div>

          {/* Where you are among the occasions; tap to jump. */}
          <div className="mt-5 flex items-center gap-2" role="tablist" aria-label="Occasions">
            {OCCASIONS.map((o, i) => (
              <button
                key={o.key}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={o.name}
                onClick={() => {
                  if (i === active) return;
                  setDir(i > active ? 1 : -1);
                  setActive(i);
                }}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === active ? "w-6 bg-teal" : "w-2 bg-[#cbe7f0] hover:bg-[#9fd3e1]"
                )}
              />
            ))}
          </div>

          <CreateButton className="mt-7" disabled={!selected} onClick={createEvent} />
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
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[720px] flex-col items-center px-8 pb-6 pt-8">
              <Heading className="text-center" size="desktop" />
              {/* Three across, then two centred: 3 × 180px cards + 2 × 16px gaps,
                  sized so both rows and the button fit a 1440×900 laptop. */}
              <div className="mt-6 flex w-[572px] flex-wrap justify-center gap-4">
                {OCCASIONS.map((occ) => (
                  <OccasionCard
                    key={occ.key}
                    occ={occ}
                    size="md"
                    selected={selected === occ.key}
                    onSelect={() => setSelected(occ.key)}
                  />
                ))}
              </div>
            </div>
            {/* Pinned so it's in reach on a laptop screen without scrolling. */}
            <div className="sticky bottom-0 mt-auto flex justify-center bg-gradient-to-t from-[#fafeff] via-[#fafeff]/95 to-[#fafeff]/0 pb-7 pt-6">
              <CreateButton disabled={!selected} onClick={createEvent} />
            </div>
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
          size === "mobile"
            ? "max-w-[254px] text-[36px] leading-[1.05]"
            : "font-dote text-[42px] leading-[1.1]"
        )}
      >
        <span className="font-medium text-black">What are you </span>
        <span className="font-bold text-[#6a9da9]">celebrating</span>
        <span className="font-medium text-[#83adb6]">?</span>
      </h1>
      <p
        className={cn(
          "mx-auto mt-1.5 text-[16px] font-medium leading-[22px] text-[#5c5c5c]",
          size === "mobile" ? "max-w-[328px] text-center" : "max-w-[450px] text-center"
        )}
      >
        Choose the celebration you&rsquo;d love to create, invites, wishes, and gifts, all in one
        place.
      </p>
    </div>
  );
}

function OccasionCard({
  occ,
  selected,
  onSelect,
  size = "lg",
}: {
  occ: Occasion;
  selected: boolean;
  onSelect: () => void;
  /** "lg" for the phone carousel, "md" for the desktop grid. */
  size?: "lg" | "md";
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      className={cn(
        "relative shrink-0 cursor-pointer overflow-hidden rounded-[26px] transition hover:brightness-[1.03]",
        size === "lg" ? "h-[335px] w-[234px]" : "h-[256px] w-[180px]",
        selected && "ring-[3px] ring-teal ring-offset-2 ring-offset-[#fafeff]"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={occ.photo} alt={occ.name} className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-0"
        style={{
          background: selected
            ? "linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.8) 85%)"
            : "linear-gradient(to bottom, rgba(0,0,0,0) 15%, rgba(0,0,0,0.8) 85%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-[18px] flex flex-col items-center gap-[10px] px-4">
        <div className="text-center tracking-[-0.66px]">
          <p className="text-[20px] leading-tight" style={{ color: occ.nameColor }}>
            {occ.name}
          </p>
          <p className="text-[12px] text-[#e6e6e6]">{occ.tagline}</p>
        </div>
        {selected ? (
          <span className="flex items-center gap-2 rounded-[14px] border-[0.5px] border-[#5d6061] bg-white px-3 py-2">
            <span className="text-[12px] tracking-[-0.2px] text-[#00729f]">Selected</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dote/tick-square.svg" alt="" className="h-[18px] w-[18px]" />
          </span>
        ) : (
          <span className="rounded-[14px] border-[0.5px] border-[#5d6061] bg-[#191919]/[0.23] px-3 py-2 text-[12px] tracking-[-0.2px] text-white backdrop-blur-sm">
            Select event type
          </span>
        )}
      </div>
    </div>
  );
}

function Peek({ occ, onClick }: { occ: Occasion; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Show ${occ.name}`}
      className="relative h-[239px] w-[162px] shrink-0 overflow-hidden rounded-[14px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={occ.photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
        "h-[56px] w-[354px] max-w-[calc(100%-48px)] rounded-[50px] text-[14px] tracking-[0.35px] transition",
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
      <UserAvatar className="h-[50px] w-[50px] rounded-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dote/arrow-down.svg" alt="" className="h-4 w-4" />
    </Link>
  );
}

