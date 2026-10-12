"use client";

import { useState } from "react";
import type {
  ContributionGoal,
  PublicEvent,
  PublicGift,
  Wish,
  WishlistItem,
} from "@/lib/types";
import { OCCASION_LABEL, OCCASION_TONE } from "@/lib/types";
import { rsvp as rsvpApi, addWish, reserveItem } from "@/lib/guest";
import { naira } from "@/lib/money";
import { formatEventDate, formatEventTime, relativeToNow } from "@/lib/date";
import { cn } from "@/lib/cn";

import { Card, CoverArt } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Seal, SealTick } from "@/components/ui/Seal";
import { WishNote } from "@/components/ui/WishNote";

import { GiftFlow } from "./GiftFlow";
import { ReserveFlow } from "./ReserveFlow";
import { RsvpFlow } from "./RsvpFlow";
import { WishForm } from "./WishForm";
import { ShareButton } from "./ShareButton";

const OCCASION_EMOJI: Record<string, string> = {
  wedding: "💍",
  birthday: "🎂",
  baby_shower: "🍼",
};

export function EventView({ event: initial }: { event: PublicEvent }) {
  const [event, setEvent] = useState(initial);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftGoal, setGiftGoal] = useState<ContributionGoal | null>(null);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [reserveItem, setReserveItem] = useState<WishlistItem | null>(null);

  const dateLabel = formatEventDate(event.starts_at);
  const timeLabel = formatEventTime(event.starts_at);
  const occasionTone = OCCASION_TONE[event.occasion];

  function openDirectGift() {
    setGiftGoal(null);
    setGiftOpen(true);
  }
  function openGoalGift(goal: ContributionGoal) {
    setGiftGoal(goal);
    setGiftOpen(true);
  }

  function handleGiftComplete(gift: PublicGift, goalId?: string) {
    setEvent((prev) => {
      const goals = goalId
        ? prev.goals.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  raised_kobo: g.raised_kobo + (gift.amount_kobo ?? 0),
                  progress_pct: Math.min(
                    100,
                    Math.round(
                      ((g.raised_kobo + (gift.amount_kobo ?? 0)) / g.target_kobo) * 1000
                    ) / 10
                  ),
                }
              : g
          )
        : prev.goals;
      return { ...prev, goals, recent_gifts: [gift, ...prev.recent_gifts] };
    });
  }

  function handleReserve(itemId: string, name: string, showName: boolean) {
    setEvent((prev) => ({
      ...prev,
      wishlist_items: prev.wishlist_items.map((it) =>
        it.id === itemId
          ? { ...it, status: "reserved", reserver_display: showName ? name : "Anonymous" }
          : it
      ),
    }));
    reserveItem(itemId, { guest_name: name, show_name: showName }).catch(() => {});
  }

  function handleRsvp(status: "yes" | "maybe" | "no", name: string) {
    if (status === "yes")
      setEvent((prev) => ({ ...prev, rsvp_yes_count: prev.rsvp_yes_count + 1 }));
    rsvpApi(event.slug, { guest_name: name, status }).catch(() => {});
  }

  function handleWish(wish: Wish) {
    setEvent((prev) => ({ ...prev, wishes: [wish, ...prev.wishes] }));
    addWish(event.slug, { guest_name: wish.guest_name, message: wish.message }).catch(() => {});
  }

  const showGifts = event.accepts_money;
  const showWishlist = event.accepts_wishlist && event.wishlist_items.length > 0;
  const showWishes = event.accepts_wishes;
  const hasGoals = showGifts && event.goals.length > 0;

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-evergreen text-[#FBF3E8]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(110% 120% at 80% -20%, rgba(231,198,144,0.5), transparent 55%), radial-gradient(90% 100% at 0% 120%, rgba(236,106,78,0.30), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[1080px] px-6 pb-12 pt-12 sm:pb-16 sm:pt-16">
          <div className="animate-rise flex flex-wrap items-center gap-3">
            <Chip tone={occasionTone} className="bg-white/15 text-[#FDF8EF]">
              {OCCASION_EMOJI[event.occasion]} {OCCASION_LABEL[event.occasion]}
            </Chip>
            <span className="rounded-pill bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold text-champagne">
              {relativeToNow(event.starts_at)}
            </span>
          </div>

          <h1 className="animate-rise mt-5 max-w-[18ch] text-[clamp(40px,7vw,68px)] text-[#FDF8EF]">
            {event.title}
          </h1>

          <div className="animate-rise mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-[#E8E0D2]">
            <span>{dateLabel}</span>
            <Dot />
            <span>{timeLabel}</span>
            {event.venue && (
              <>
                <Dot />
                <span>{event.venue}</span>
              </>
            )}
            {event.dress_code && (
              <>
                <Dot />
                <span>{event.dress_code}</span>
              </>
            )}
          </div>

          <div className="animate-rise mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            {event.host_verified && (
              <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#FDF8EF]">
                <SealTick />
                Verified host
              </span>
            )}
            <span className="text-[14px] text-[#E8E0D2]">
              {event.rsvp_yes_count} celebrating · {event.wishes.length} wishes
            </span>
          </div>

          <div className="animate-rise mt-8 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" onClick={() => setRsvpOpen(true)}>
              RSVP
            </Button>
            {showGifts && !event.gifts_paused && (
              <Button variant="secondaryLight" size="lg" onClick={openDirectGift}>
                Send a gift
              </Button>
            )}
            <ShareButton />
          </div>
        </div>
      </section>

      {/* ---------- BODY ---------- */}
      <div className="mx-auto max-w-[1080px] px-6 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_352px] lg:gap-12">
          {/* MAIN COLUMN */}
          <main className="min-w-0 space-y-14">
            {/* About */}
            {event.description && (
              <section>
                <SectionEyebrow>The celebration</SectionEyebrow>
                <p className="max-w-[60ch] text-[18px] leading-[1.65] text-ink-soft">
                  {event.description}
                </p>
              </section>
            )}

            {/* Goals */}
            {hasGoals && (
              <section id="goals">
                <SectionHead
                  eyebrow="Contribution goals"
                  title="Rally toward something together"
                />
                <div className="space-y-4">
                  {event.goals.map((goal) => {
                    const reached = goal.progress_pct >= 100;
                    return (
                      <Card key={goal.id} className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-[21px]">{goal.name}</h3>
                          {reached && (
                            <Seal kind="goal" size="sm" top="Goal" mid="reached" />
                          )}
                        </div>
                        <Progress
                          raisedKobo={goal.raised_kobo}
                          targetKobo={goal.target_kobo}
                          pct={goal.progress_pct}
                        />
                        <p className="mt-3 text-[13.5px] text-ink-soft">
                          The bar is motivational, funds reach {event.host_first_name}{" "}
                          whether or not the goal is met.
                        </p>
                        {!event.gifts_paused && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-4"
                            onClick={() => openGoalGift(goal)}
                          >
                            Contribute
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Wishlist */}
            {showWishlist && (
              <section id="wishlist">
                <SectionHead
                  eyebrow="Wishlist"
                  title="Gifts they'd love"
                  sub="Claimed items lock so two guests never buy the same thing."
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  {event.wishlist_items.map((item) => (
                    <WishlistCard
                      key={item.id}
                      item={item}
                      onReserve={() => setReserveItem(item)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Wishes */}
            {showWishes && (
              <section id="wishes">
                <SectionHead eyebrow="Well-wishes" title="Words for the day" />
                {event.wishes.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-[16px] text-ink-soft">
                      No wishes yet, be the first to say something to{" "}
                      {event.host_first_name}.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {event.wishes.map((wish) => (
                      <WishNote key={wish.id} wish={wish} hostName={event.title} />
                    ))}
                  </div>
                )}
                <div className="mt-6">
                  <WishForm onAdd={handleWish} />
                </div>
              </section>
            )}
          </main>

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="space-y-5">
              {showGifts &&
                (event.gifts_paused ? (
                  <GiftBoxFull hostName={event.host_first_name} />
                ) : (
                  <GiftCard
                    event={event}
                    onSend={openDirectGift}
                  />
                ))}

              {/* Recent gifts */}
              {showGifts && event.recent_gifts.length > 0 && (
                <Card className="p-6">
                  <SectionEyebrow className="mb-3">Recent gifts</SectionEyebrow>
                  <ul className="space-y-3.5">
                    {event.recent_gifts.slice(0, 6).map((g) => (
                      <li key={g.id} className="border-b border-line pb-3.5 last:border-0 last:pb-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{g.giver}</span>
                          <span className="money text-[14px] text-evergreen">
                            {g.amount_kobo != null ? naira(g.amount_kobo) : "🎁"}
                          </span>
                        </div>
                        {g.message && (
                          <p className="mt-1 font-display text-[14.5px] italic text-ink-soft">
                            “{g.message}”
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ---------- FLOWS ---------- */}
      <GiftFlow
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
        event={event}
        goal={giftGoal}
        onComplete={handleGiftComplete}
      />
      <ReserveFlow
        item={reserveItem}
        onClose={() => setReserveItem(null)}
        onReserve={handleReserve}
      />
      <RsvpFlow open={rsvpOpen} onClose={() => setRsvpOpen(false)} onRsvp={handleRsvp} />
    </>
  );
}

/* ---------- local pieces ---------- */

function Dot() {
  return <span className="text-[#E8E0D2]/50">·</span>;
}

function SectionEyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[12px] font-semibold uppercase tracking-[0.16em] text-coral-deep",
        className
      )}
    >
      {children}
    </p>
  );
}

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-6">
      <SectionEyebrow className="mb-2.5">{eyebrow}</SectionEyebrow>
      <h2 className="text-[clamp(26px,3.4vw,34px)]">{title}</h2>
      {sub && <p className="mt-2 max-w-[52ch] text-[15px] text-ink-soft">{sub}</p>}
    </div>
  );
}

function GiftCard({ event, onSend }: { event: PublicEvent; onSend: () => void }) {
  return (
    <Card className="overflow-visible p-6">
      <SectionEyebrow className="mb-2">Send a gift</SectionEyebrow>
      <h3 className="text-[22px]">Celebrate {event.host_first_name}</h3>
      <p className="mt-2 text-[14.5px] text-ink-soft">
        Send money directly{event.goals.length > 0 ? " or toward a goal" : ""}. Choose to
        show your name and amount, or stay anonymous.
      </p>
      <Button fullWidth size="lg" className="mt-5" onClick={onSend}>
        Send a gift
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[12.5px] text-ink-soft">
        {event.host_verified && <SealTick className="h-[18px] w-[18px] text-[8px]" />}
        {event.host_verified
          ? "Verified host · the fee is on you, the gift arrives whole"
          : "The card fee is added at checkout, not taken from the gift"}
      </p>
    </Card>
  );
}

/** Story A3, the graceful capped state. The friction is the host's to clear. */
function GiftBoxFull({ hostName }: { hostName: string }) {
  return (
    <Card className="border-champagne/60 bg-[linear-gradient(180deg,rgba(231,198,144,0.12),transparent)] p-6">
      <div className="mb-3 text-3xl">🎁</div>
      <h3 className="text-[21px]">{hostName}&apos;s gift box is full for now</h3>
      <p className="mt-2 text-[14.5px] text-ink-soft">
        They&apos;ve received so many gifts they need to confirm a quick detail before
        opening it back up. We&apos;ve let them know, your wish below is still saved.
      </p>
      <p className="mt-3 text-[13px] font-semibold text-evergreen">
        The friction is theirs to clear, never yours.
      </p>
    </Card>
  );
}

function WishlistCard({
  item,
  onReserve,
}: {
  item: WishlistItem;
  onReserve: () => void;
}) {
  const reserved = item.status === "reserved";
  return (
    <Card hover className="flex flex-col">
      <CoverArt label={item.name} className="h-36" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[19px]">{item.name}</h3>
        {item.price_kobo != null && (
          <p className="money mt-1 text-[14px] text-ink-soft">{naira(item.price_kobo)}</p>
        )}
        {item.description && (
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{item.description}</p>
        )}
        <div className="mt-auto pt-4">
          {reserved ? (
            <Chip tone="coral">
              Reserved{item.reserver_display ? ` by ${item.reserver_display}` : ""}
            </Chip>
          ) : (
            <Button variant="secondary" size="sm" onClick={onReserve}>
              Reserve this gift
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
