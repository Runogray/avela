"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { DoteLogo } from "./Logo";
import { BackArrow } from "./BackArrow";
import { Toast } from "./Toast";
import {
  getHostEvent,
  hostEventToFlow,
  getPublicEvent,
  publicEventToFlow,
  reserveWishlistItem,
  startTransferGift,
  markTransferSent,
  listTransfers,
  deleteGoal,
  deleteWishlistItem,
  confirmBought,
  releaseHold,
  releaseWishlistItem,
  confirmTransfer,
  declineTransfer,
  type TransferDetails,
} from "@/lib/host-events";
import { apiErrorMessage } from "@/lib/api";
import { thankYouFor } from "@/lib/thanks";
import { getBankAccount, type BankAccount } from "@/lib/wallet";

/* ------------------------------------------------------------------ *
 * Dote, Event Overview (the published celebration page; host reaches
 * it from "Manage"). Figma: Desktop overview 14549:14188. Elegant
 * Italiana serif headings over a full-bleed hero, welcome + details,
 * gallery, a contribution-progress wishlist, and a thank-you band.
 * ------------------------------------------------------------------ */

type StoredItem = {
  id: string;
  type: "monetary" | "physical";
  name: string;
  emoji: string;
  image: string | null;
  link?: string; // store/vendor link (physical gifts)
  anyAmount: boolean;
  amount: number;
  raised?: number;
  remaining?: number | null; // left to fully fund (physical gifts with a price)
  // "held": a guest has it for 10 minutes while they buy it; "bought" /
  // "funded": off the list for good.
  taken?: "held" | "bought" | "funded";
  reservedBy?: string; // host view: who reserved or bought it
  purchasedAt?: string | null; // host view: when the guest confirmed buying it
  hideContrib?: boolean; // guests don't see per-person contribution amounts
  hideTotal?: boolean; // guests don't see the total raised
};

// Who guests are sending wishes to, by occasion.
const RECIPIENT: Record<string, string> = {
  wedding: "the couple",
  birthday: "the celebrant",
  baby: "the parents",
};
type StoredEvent = {
  id: string;
  slug?: string;
  title: string;
  occasion: string;
  category?: string;
  description?: string;
  dress?: string;
  date?: string;
  time?: string;
  venue?: string;
  cover?: string | null;
  gallery?: string[];
  items?: StoredItem[];
  acceptsTransfers?: boolean; // host added a bank account (guest view)
  coverPos?: string; // cover focus point (object-position)
};

const OCC: Record<string, { label: string; cover: string }> = {
  wedding: { label: "White Wedding", cover: "linear-gradient(135deg, #7EDFFF 0%, #00829f 100%)" },
  birthday: { label: "Birthday", cover: "linear-gradient(135deg, #B3FF84 0%, #63991e 100%)" },
  baby: { label: "Baby Shower", cover: "linear-gradient(135deg, #FFB2FB 0%, #d4537e 100%)" },
};

const DESC_FALLBACK: Record<string, string> = {
  wedding:
    "Join us as we say “I do” and begin our forever. Surrounded by the people we love most, we’re celebrating the start of our journey as husband and wife, with vows, laughter, good food, and dancing well into the night.",
  birthday:
    "Another year, another reason to celebrate! Join me as I mark a brand new chapter surrounded by the people who make life sweeter, with good vibes, great music, and a whole lot of cake.",
  baby:
    "A little miracle is on the way, and we can’t wait to celebrate! Join us for an afternoon of love, laughter, and sweet anticipation as we shower our little bundle of joy with all the good wishes in the world.",
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

const DRESS_COLORS: Record<string, string> = {
  black: "#000000", white: "#ffffff", blue: "#5f7eef", navy: "#1f2a63", red: "#d8392f",
  green: "#2f8f4e", gold: "#d4af37", cream: "#f3e6cf", brown: "#6b4423", pink: "#f06ba8",
  purple: "#8a4bd6", grey: "#8a8a8a", gray: "#8a8a8a", silver: "#c7c7c7", orange: "#e8872e",
  yellow: "#f2c744", teal: "#00829f", burgundy: "#6a1b2a", maroon: "#6a1b2a", ivory: "#fffff0",
  peach: "#ffcba4", lavender: "#b9a7e6", beige: "#e8dcc4",
};
function dressSwatches(dress?: string): { label: string; hex: string }[] {
  if (!dress) return [];
  return dress
    .split(/[&,/]|\band\b/i)
    .map((s) => s.trim().toLowerCase())
    .map((s) => (DRESS_COLORS[s] ? { label: s, hex: DRESS_COLORS[s] } : null))
    .filter(Boolean) as { label: string; hex: string }[];
}

// per-item colour themes (cycled), matching the Figma
const THEMES = [
  { bg: "#f4fdff", border: "#d5eaef", track: "#d7f1f6", fill: "#06aacf", raised: "#00829f", iconBg: "#caf5ff" },
  { bg: "#fef4ff", border: "#ead5ef", track: "#f6d7f6", fill: "#be06cf", raised: "#9f009c", iconBg: "#f6d7f6" },
  { bg: "#f4fff5", border: "#d5eaef", track: "#daf6d7", fill: "#06cf09", raised: "#009f00", iconBg: "#daf6d7" },
];

export function EventOverview({ guest = false }: { guest?: boolean } = {}) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const [savedBanner, setSavedBanner] = useState(false);
  const [ev, setEv] = useState<StoredEvent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contribute, setContribute] = useState<StoredItem | null>(null);
  // Bumped after a guest reserves or gives, to reload what's still available.
  const [reloadKey, setReloadKey] = useState(0);
  const [viewGift, setViewGift] = useState<StoredItem | null>(null);
  // Host view: the account guests transfer cash gifts into (undefined = loading).
  const [bankAcct, setBankAcct] = useState<BankAccount | null | undefined>(undefined);
  useEffect(() => {
    if (guest) return;
    getBankAccount()
      .then((b) => setBankAcct(b))
      .catch(() => setBankAcct(undefined));
  }, [guest]);
  // Sum of contributions per gift (dote.contributions is kept separately
  // from the event's items, so progress is derived here).
  const [contribTotals, setContribTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      // Host "Manage" (non-guest): the dashboard list is API-backed, so load
      // the live event by id from the host API.
      if (!guest) {
        try {
          const e = await getHostEvent(id);
          if (alive) {
            setEv({ id: e.id, slug: e.slug, ...hostEventToFlow(e) });
            setLoaded(true);
          }
          return;
        } catch {
          /* fall through to local storage */
        }
      } else {
        // Guest invite page: the route param is the event slug. Load the
        // published event from the public API (works with no login).
        try {
          const e = await getPublicEvent(id);
          if (alive) {
            setEv({ id: e.id, slug: e.slug, ...publicEventToFlow(e) });
            setLoaded(true);
          }
          return;
        } catch {
          /* fall through to local storage */
        }
      }
      // Fallback for offline / local mock events.
      try {
        const all: StoredEvent[] = JSON.parse(localStorage.getItem("dote.events") || "[]");
        if (alive) setEv(all.find((e) => e.id === id) ?? null);
      } catch {
        if (alive) setEv(null);
      }
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [id, guest, reloadKey]);

  // Show a success toast after an edit saved (CreateEventFlow redirects here
  // with ?updated=1), then strip the flag from the URL.
  useEffect(() => {
    if (guest || params.get("updated") !== "1") return;
    setSavedBanner(true);
    window.history.replaceState(null, "", `/events/${id}`);
    const t = setTimeout(() => setSavedBanner(false), 5000);
    return () => clearTimeout(t);
  }, [params, guest, id]);

  // When a signed-in user opens an invite link, record it in their
  // Invites list so the event shows up there automatically (no need to
  // paste the link manually). Guests who aren't signed in are untouched.
  useEffect(() => {
    if (!guest || !ev) return;
    try {
      if (!localStorage.getItem("dote.auth")) return;
      const inv: string[] = JSON.parse(localStorage.getItem("dote.invites") || "[]");
      if (!inv.includes(ev.id)) {
        localStorage.setItem("dote.invites", JSON.stringify([ev.id, ...inv]));
      }
    } catch {
      /* storage unavailable */
    }
  }, [guest, ev]);

  // Re-read contribution totals on load and whenever a contribute/view
  // modal closes (so a fresh contribution moves the progress bar).
  useEffect(() => {
    try {
      const all: Contribution[] = JSON.parse(localStorage.getItem("dote.contributions") || "[]");
      const map: Record<string, number> = {};
      for (const c of all) {
        if (c.eventId === id) map[c.itemId] = (map[c.itemId] ?? 0) + (c.amount || 0);
      }
      setContribTotals(map);
    } catch {
      setContribTotals({});
    }
  }, [id, contribute, viewGift]);

  if (!loaded) return null;
  if (!ev) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FFFEF7] px-6 text-center font-dote">
        <DoteLogo />
        <p className="text-[16px] text-[#6e6558]">We couldn&rsquo;t find that celebration.</p>
        <button
          type="button"
          onClick={() => router.push("/events")}
          className="rounded-[50px] bg-teal px-6 py-3 text-[14px] font-medium text-teal-ink"
        >
          Back to Events
        </button>
      </div>
    );
  }

  const occ = OCC[ev.occasion] ?? OCC.wedding;
  const cover = ev.cover || null;
  const when = [fmtDate(ev.date), fmtTime(ev.time)].filter(Boolean);
  const swatches = dressSwatches(ev.dress);
  const gallery = (ev.gallery ?? []).slice(0, 4);
  const items = ev.items ?? [];
  // The shareable guest page is the Avela guest view at /i/<slug>, which loads
  // the published event from the public API. Fall back to /i/<id> only for
  // local/mock events that have no server slug.
  const inviteHref = ev.slug ? `/i/${ev.slug}` : `/i/${ev.id}`;

  // Host: remove a gift from the wishlist (persist + live update).
  /** Remove a gift from the list. Live events delete it on the server (which
   * refuses if guests have contributed); returns an error message, if any. */
  async function deleteGift(itemId: string): Promise<string | null> {
    const target = ev?.items?.find((it) => it.id === itemId);
    if (ev?.slug && target) {
      try {
        if (target.type === "monetary") await deleteGoal(itemId);
        else await deleteWishlistItem(itemId);
      } catch (err) {
        return apiErrorMessage(err, "We couldn’t remove this gift. Please try again.");
      }
    } else {
      try {
        const all: StoredEvent[] = JSON.parse(localStorage.getItem("dote.events") || "[]");
        const next = all.map((e) =>
          e.id === id ? { ...e, items: (e.items ?? []).filter((it) => it.id !== itemId) } : e
        );
        localStorage.setItem("dote.events", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
    }
    setEv((prev) => (prev ? { ...prev, items: (prev.items ?? []).filter((it) => it.id !== itemId) } : prev));
    setViewGift(null);
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FFFEF7] font-dote text-black">
      <Toast
        show={savedBanner}
        onClose={() => setSavedBanner(false)}
        title="Changes saved"
        message="Your event has been updated."
      />
      {/* ============================ HERO ============================ */}
      <section className="relative h-[560px] w-full overflow-hidden">
        <div className="absolute inset-0" style={{ background: occ.cover }} />
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: ev.coverPos || undefined }} />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.75) 100%)" }}
        />

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5">
          {/* Guests land here from an invite link, so there's nowhere to go back to. */}
          {guest ? (
            <span aria-hidden="true" />
          ) : (
            <button
              type="button"
              onClick={() => router.push("/events")}
              aria-label="Back"
              className="grid place-items-center rounded-[10px] border border-[#b7dee7] bg-white p-[6px]"
            >
              <BackArrow className="size-4 text-teal" />
            </button>
          )}
          {guest ? (
            <button
              type="button"
              onClick={() => router.push("/signup")}
              aria-label="Create account"
              className="grid place-items-center rounded-[10px] border border-[#b7dee7] bg-white p-[6px]"
            >
              <UserPlusIcon className="size-4 text-teal" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push(`/events/${ev.id}/edit`)}
              className="flex items-center gap-[6px] text-white transition hover:opacity-80"
            >
              <span className="text-[16px] font-medium tracking-[-0.8px]">Event settings</span>
              <SettingsGear className="size-[30px]" />
            </button>
          )}
        </div>

        {/* hero content */}
        <div className="relative flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <h1 className="font-kyiv text-[40px] font-light tracking-[-0.8px] text-white sm:text-[48px]">
              {ev.title}
            </h1>
            <p className="text-[20px] font-semibold text-white">{ev.category || occ.label}</p>
          </div>
          {guest ? (
            <button
              type="button"
              onClick={() => document.getElementById("well-wishes")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-teal px-[42px] py-[14px] text-[16px] tracking-[0.35px] text-teal-ink transition hover:brightness-95"
            >
              Send well wishes
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                try {
                  navigator.clipboard?.writeText(`${window.location.origin}${inviteHref}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* clipboard unavailable */
                }
              }}
              className="rounded-[8px] border border-[#6fe0f9] bg-black/40 px-3 py-[15px] transition hover:bg-black/55"
            >
              <p className="text-[15px] tracking-[-0.4px] text-white sm:text-[16px]">
                {copied ? "Invite link copied" : "Copy invite link"}
              </p>
            </button>
          )}
        </div>
      </section>

      {/* ========================== WELCOME ========================== */}
      <section className="mx-auto flex max-w-[760px] flex-col items-center gap-[38px] px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <h2 className="font-italiana text-[28px] tracking-[-0.8px] sm:text-[32px]">Welcome to my event</h2>
          <p className="max-w-[704px] text-[17px] leading-relaxed sm:text-[20px]">
            {ev.description?.trim() || DESC_FALLBACK[ev.occasion] || DESC_FALLBACK.wedding}
          </p>
        </div>

        <div className="flex w-[328px] max-w-full flex-col gap-[30px]">
          {swatches.length > 0 && (
            <DetailBlock label="Dress code">
              <p className="text-[18px] tracking-[-0.8px]">{ev.dress}</p>
              <div className="flex items-center gap-2">
                {swatches.map((s, i) => (
                  <span
                    key={i}
                    className="h-[12px] w-[32px] rounded-[3px] border border-black/5"
                    style={{ background: s.hex }}
                  />
                ))}
              </div>
            </DetailBlock>
          )}
          {when.length > 0 && (
            <DetailBlock label="Date">
              <div className="flex items-center gap-3 text-[18px] tracking-[-0.8px]">
                <span>{when[0]}</span>
                {when[1] && (
                  <>
                    <span className="text-[14px] leading-none">·</span>
                    <span>{when[1]}</span>
                  </>
                )}
              </div>
            </DetailBlock>
          )}
          {ev.venue && (
            <DetailBlock label="Venue">
              <p className="text-[18px] tracking-[-0.8px]">{ev.venue}</p>
            </DetailBlock>
          )}
        </div>
      </section>

      {/* ========================== GALLERY ========================== */}
      {gallery.length > 0 && (
        <section className="bg-black px-3 py-3">
          <div className="mx-auto flex max-w-[1240px] flex-wrap justify-center gap-1">
            {gallery.map((g, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={g}
                alt=""
                className="h-[260px] w-full max-w-[305px] flex-1 object-cover sm:h-[336px]"
              />
            ))}
          </div>
          <div className="flex justify-center py-8">
            <button
              type="button"
              onClick={() => router.push(`${guest ? `/i/${ev.slug ?? ev.id}` : `/events/${ev.id}`}/gallery`)}
              className="bg-teal px-[42px] py-[14px] text-[16px] tracking-[0.35px] text-teal-ink transition hover:brightness-95"
            >
              Gallery
            </button>
          </div>
        </section>
      )}

      {/* ===================== A LIST OF WISHES ====================== */}
      {items.length > 0 && (
        <section className="flex flex-col items-center gap-[26px] px-6 py-16">
          <h2 className="font-italiana text-[28px] tracking-[-0.8px] sm:text-[32px]">A List of Little Wishes</h2>
          {!guest && ev.slug && bankAcct !== undefined && (
            <CashGiftAccount
              account={bankAcct}
              href={`/wallet/withdraw?setup=bank&next=${encodeURIComponent(`/events/${ev.id}`)}`}
            />
          )}
          <div className="flex w-full max-w-[756px] flex-col gap-4">
            {items.map((it, i) => (
              <WishRow
                key={it.id}
                item={{ ...it, raised: (it.raised ?? 0) + (ev.slug ? 0 : contribTotals[it.id] ?? 0) }}
                theme={THEMES[i % THEMES.length]}
                guest={guest}
                onOpen={guest ? (it.taken ? undefined : () => setContribute(it)) : () => setViewGift(it)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ===================== SEND WELL WISHES ====================== */}
      {guest && (
        <WellWishesCard eventId={ev.id} recipient={RECIPIENT[ev.occasion] ?? "the celebrant"} />
      )}

      {/* ============== WELL WISHES RECEIVED (host view) ============= */}
      {!guest && <WellWishesReceived eventId={ev.id} />}

      {/* ========================== THANK YOU ======================== */}
      <section className="flex flex-col items-center gap-14 border-t border-[#8eeaff] bg-[#ecfcff] px-10 pb-[42px] pt-[62px] text-center">
        <div className="flex flex-col items-center gap-[14px]">
          <h2 className="font-italiana text-[28px] tracking-[-0.8px] sm:text-[32px]">Thank you</h2>
          <p className="max-w-[545px] text-[17px] leading-relaxed sm:text-[20px]">{thankYouFor(ev.occasion)}</p>
        </div>
        <p className="font-dote text-[18px] font-extralight tracking-[-0.4px]">{ev.title}</p>
      </section>

      {/* ===================== CONTRIBUTE MODAL ====================== */}
      {contribute && (
        <ContributeModal
          slug={ev.slug}
          acceptsTransfers={!!ev.acceptsTransfers}
          item={contribute}
          recipient={RECIPIENT[ev.occasion] ?? "the celebrant"}
          onClose={() => setContribute(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}

      {/* ============== GIFT CONTRIBUTIONS (host view) =============== */}
      {viewGift && (
        <GiftContributionsModal
          eventId={ev.id}
          live={!!ev.slug}
          item={viewGift}
          eventTitle={ev.title}
          occasion={ev.occasion}
          onConfirmed={(naira) =>
            // A confirmed transfer moves this gift's progress bar right away.
            setEv((cur) =>
              cur && {
                ...cur,
                items: cur.items?.map((x) => (x.id === viewGift.id ? { ...x, raised: (x.raised ?? 0) + naira } : x)),
              },
            )
          }
          onReleased={() => {
            // Back on the list: update both the list and the open gift screen.
            const clear = (x: StoredItem) => ({ ...x, taken: undefined, reservedBy: "", purchasedAt: null });
            setEv((cur) => cur && { ...cur, items: cur.items?.map((x) => (x.id === viewGift.id ? clear(x) : x)) });
            setViewGift((cur) => cur && clear(cur));
          }}
          onClose={() => setViewGift(null)}
          onDelete={() => deleteGift(viewGift.id)}
        />
      )}
    </div>
  );
}

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];

function ContributeModal({
  slug,
  acceptsTransfers,
  item,
  recipient,
  onClose,
  onChanged,
}: {
  slug?: string;
  acceptsTransfers: boolean;
  item: StoredItem;
  recipient: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  // What's still needed for a priced physical gift (confirmed gifts only).
  const remaining =
    item.type === "physical" && item.amount > 0 ? Math.max(0, item.remaining ?? item.amount - (item.raised ?? 0)) : null;
  // Physical gifts can be bought (reserved) outright or contributed toward —
  // but once friends are chipping in, buying it outright would double up.
  const chippedIn = (item.raised ?? 0) > 0;
  const canBuy = item.type === "physical" && !chippedIn;
  const [mode, setMode] = useState<"contribute" | "buy">("contribute");
  const [amount, setAmount] = useState<number>(
    item.anyAmount ? 0 : remaining ?? item.amount ?? 0,
  );
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  // Cash gifts: after Submit the guest sees the host's account to transfer into.
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  // Buy the gift: the 10-minute hold this guest has on the item.
  const [hold, setHold] = useState<{ token: string; until: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const buying = canBuy && mode === "buy";
  const cashUnavailable = !buying && (!acceptsTransfers || !slug);
  const overRemaining = !buying && remaining !== null && amount > remaining;
  const valid = buying
    ? name.trim().length > 0
    : amount > 0 && name.trim().length > 0 && !cashUnavailable && !overRemaining;

  async function submit() {
    if (!valid || busy) return;
    if (buying) {
      // Lock the item to this guest so no one else buys the same thing. If
      // someone got there first, say so instead of pretending it worked.
      setBusy(true);
      setError("");
      try {
        const h = await reserveWishlistItem(item.id, { guest_name: name.trim(), show_name: true });
        setHold({ token: h.hold_token, until: new Date(h.reserved_until).getTime() });
        onChanged();
      } catch (err) {
        setError(apiErrorMessage(err, "We couldn’t reserve this gift. Please try again."));
        onChanged();
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    setError("");
    try {
      const t = await startTransferGift(slug!, {
        amount_kobo: amount * 100,
        giver_name: name.trim(),
        goal_id: item.type === "monetary" ? item.id : null,
        wishlist_item_id: item.type === "physical" ? item.id : null,
      });
      setTransfer(t);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn’t start your gift. Please try again."));
      onChanged(); // e.g. it was just bought or fully funded: refresh the list
    } finally {
      setBusy(false);
    }
  }

  async function boughtIt() {
    if (!hold || busy) return;
    setBusy(true);
    setError("");
    try {
      await confirmBought(item.id, hold.token);
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn’t mark this gift as bought. Please try again."));
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  async function cancelHold() {
    if (!hold || busy) return;
    setBusy(true);
    await releaseHold(item.id, hold.token).catch(() => {});
    setBusy(false);
    onChanged();
    onClose();
  }

  async function sent() {
    if (!transfer || busy) return;
    setBusy(true);
    // Best effort: the gift is already recorded; this just nudges the host.
    await markTransferSent(slug!, transfer.gift_id).catch(() => {});
    setBusy(false);
    setDone(true);
    onChanged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[460px] flex-col gap-6 overflow-y-auto rounded-t-[26px] bg-white px-6 py-7 font-dote sm:rounded-[24px] sm:px-8"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-teal/10 text-[28px]">🎁</span>
            <h3 className="font-italiana text-[24px] tracking-[-0.8px]">Thank you, {name.trim().split(" ")[0]}!</h3>
            <p className="max-w-[340px] text-[15px] leading-relaxed text-[#5c5c5c]">
              {buying ? (
                <>
                  <b>{item.name}</b> is marked as bought, so nobody else will buy it.
                  {` ${recipient[0].toUpperCase() + recipient.slice(1)} will be so grateful.`}
                </>
              ) : (
                <>
                  Your &#8358;{amount.toLocaleString()} gift toward <b>{item.name}</b> is on its way.
                  {` ${recipient[0].toUpperCase() + recipient.slice(1)} will confirm it once it lands, and they’ll be so grateful.`}
                </>
              )}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 h-[48px] w-full rounded-[50px] bg-teal text-[15px] font-medium text-teal-ink transition hover:brightness-95"
            >
              Done
            </button>
          </div>
        ) : hold ? (
          <HoldStep
            item={item}
            until={hold.until}
            busy={busy}
            error={error}
            onBought={boughtIt}
            onCancel={cancelHold}
            onClose={onClose}
          />
        ) : transfer ? (
          <TransferStep
            details={transfer}
            itemName={item.name}
            recipient={recipient}
            busy={busy}
            onSent={sent}
            onBack={() => setTransfer(null)}
            onClose={onClose}
          />
        ) : (
          <>
            {/* header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="size-[46px] shrink-0 rounded-[10px] object-cover" />
                ) : (
                  <span className="grid size-[46px] shrink-0 place-items-center rounded-[10px] bg-[#f0f7f9] text-[22px]">
                    {item.emoji}
                  </span>
                )}
                <div>
                  <p className="text-[17px] font-medium tracking-[-0.3px] text-black">{item.name}</p>
                  <p className="text-[13px] text-[#7a7266]">
                    {item.anyAmount
                      ? "Any amount"
                      : remaining !== null && chippedIn
                        ? `₦${remaining.toLocaleString()} left of ₦${item.amount.toLocaleString()}`
                        : `Target · ₦${item.amount.toLocaleString()}`}
                  </p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full text-[#9a9a9a] transition hover:bg-black/5">
                <CloseIcon className="size-5" />
              </button>
            </div>

            {/* buy vs contribute — physical gifts only */}
            {canBuy && (
              <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#f0f7f9] p-1">
                <ModeTab active={mode === "contribute"} onClick={() => setMode("contribute")}>
                  Contribute
                </ModeTab>
                <ModeTab active={mode === "buy"} onClick={() => setMode("buy")}>
                  Buy the gift
                </ModeTab>
              </div>
            )}

            {buying && (
              <div className="flex flex-col gap-3 rounded-[14px] border border-[#e8f1f3] bg-[#fbfbfb] px-4 py-4">
                <p className="text-[14px] leading-relaxed text-[#5c5c5c]">
                  We&rsquo;ll hold this gift for you for 10 minutes so nobody else buys it while you do.
                </p>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-[48px] items-center justify-center gap-2 rounded-[12px] border border-teal bg-teal/5 text-[14px] font-semibold text-teal transition hover:bg-teal/10"
                  >
                    <StoreIcon className="size-[18px]" />
                    View in store ↗
                  </a>
                )}
              </div>
            )}

            {/* amount */}
            {!buying && (
            <div className="flex flex-col gap-3">
              <span className="text-[13px] font-medium tracking-[-0.2px] text-[#221a10]">How much would you like to give?</span>
              <div className="flex items-center rounded-[14px] border border-[#e8f1f3] bg-[#fbfbfb] px-4 focus-within:border-teal">
                <span className="text-[20px] font-semibold text-[#1c1611]">&#8358;</span>
                <input
                  type="number"
                  min={0}
                  value={amount || ""}
                  onChange={(e) => setAmount(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  placeholder="0"
                  className="h-[56px] w-full bg-transparent px-2 text-[20px] font-semibold text-[#1c1611] outline-none placeholder:text-[#cccccc]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  // Show at most 4 amount chips. When the "Full" chip is shown,
                  // leave room for it by trimming the quick amounts to 3.
                  const full = remaining ?? item.amount;
                  const showFull = !item.anyAmount && full > 0;
                  // Never offer a quick amount bigger than what's left.
                  const quick = (showFull ? QUICK_AMOUNTS.slice(0, 3) : QUICK_AMOUNTS).filter(
                    (a) => remaining === null || a < remaining,
                  );
                  return (
                    <>
                      {showFull && (
                        <AmountChip
                          label={`${chippedIn && remaining !== null ? "Remaining" : "Full"} ₦${full.toLocaleString()}`}
                          active={amount === full}
                          onClick={() => setAmount(full)}
                        />
                      )}
                      {quick.map((a) => (
                        <AmountChip key={a} label={`₦${a.toLocaleString()}`} active={amount === a} onClick={() => setAmount(a)} />
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
            )}

            {/* details */}
            <WishField label="Your name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ada Obi"
                className="h-[52px] w-full rounded-[14px] border border-[#e8f1f3] bg-[#fbfbfb] px-4 text-[15px] text-[#1c1611] outline-none transition placeholder:text-[#cccccc] focus:border-teal"
              />
            </WishField>

            {overRemaining && remaining !== null && (
              <p className="rounded-[14px] border border-[#f3e3c3] bg-[#fffaf0] px-4 py-3 text-[13px] leading-relaxed text-[#7a5a1e]">
                Only &#8358;{remaining.toLocaleString()} is left to fully fund this gift.
              </p>
            )}
            {chippedIn && item.type === "physical" && (
              <p className="-mt-2 text-[12px] leading-relaxed text-[#7a7266]">
                Friends are already chipping in on this gift, so it can only be contributed to now.
              </p>
            )}
            {cashUnavailable && (
              <p className="rounded-[14px] border border-[#f3e3c3] bg-[#fffaf0] px-4 py-3 text-[13px] leading-relaxed text-[#7a5a1e]">
                Cash gifts aren&rsquo;t open yet. The host still needs to add the bank account to send them to. Please
                check back soon.
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-[14px] border border-[#f5d0c9] bg-[#fff5f3] px-4 py-3 text-[13px] leading-relaxed text-[#a3321f]">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={!valid || busy}
              className="h-[54px] w-full rounded-[50px] text-[15px] font-medium tracking-[0.35px] text-teal-ink transition disabled:cursor-not-allowed disabled:bg-[#d0ebf1] enabled:bg-teal enabled:hover:brightness-95"
            >
              {buying
                ? busy
                  ? "Just a moment…"
                  : `Reserve ${item.name}`
                : busy
                  ? "Just a moment…"
                  : `Contribute${amount > 0 ? ` ₦${amount.toLocaleString()}` : ""}`}
            </button>
            {!cashUnavailable && (
              <p className="-mt-2 text-center text-[12px] text-[#9a9a9a]">
                {buying
                  ? "Tap “I’ve bought it” once you’ve ordered it."
                  : "Next, you’ll see the account to send your gift to."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* Host view: where guests' cash gifts go, or a prompt to add the account. */
function CashGiftAccount({ account, href }: { account: BankAccount | null; href: string }) {
  if (!account) {
    return (
      <div className="flex w-full max-w-[756px] flex-col gap-3 rounded-[18px] border border-[#f3e3c3] bg-[#fffaf0] p-[18px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-dote text-[16px] font-medium tracking-[-0.4px] text-[#1c1611]">Add where cash gifts should go</p>
          <p className="font-dote text-[14px] leading-relaxed text-[#7a5a1e]">
            Guests can&rsquo;t send cash gifts until you add the bank account they&rsquo;ll transfer to.
          </p>
        </div>
        <a
          href={href}
          className="flex h-[44px] shrink-0 items-center justify-center rounded-[50px] bg-teal px-5 font-dote text-[14px] font-medium text-teal-ink transition hover:brightness-95"
        >
          Add bank account
        </a>
      </div>
    );
  }
  return (
    <p className="font-dote text-[14px] text-[#5c5c5c]">
      Cash gifts go to {account.bank_name} ••{account.account_number.slice(-4)}
      {account.account_name ? ` · ${account.account_name}` : ""} ·{" "}
      <a href={href} className="font-medium text-teal underline-offset-2 hover:underline">
        Change
      </a>
    </p>
  );
}

/* Buy the gift: the item is held for this guest for 10 minutes. */
function HoldStep({
  item,
  until,
  busy,
  error,
  onBought,
  onCancel,
  onClose,
}: {
  item: StoredItem;
  until: number;
  busy: boolean;
  error: string;
  onBought: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  const expired = left === 0;
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[17px] font-medium tracking-[-0.3px] text-black">{item.name} is yours for now</p>
          <p className="text-[13px] text-[#7a7266]">Nobody else can buy it while we hold it for you.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full text-[#9a9a9a] transition hover:bg-black/5">
          <CloseIcon className="size-5" />
        </button>
      </div>

      <div
        role="timer"
        aria-live="off"
        className={`flex flex-col items-center gap-1 rounded-[14px] px-4 py-5 ${expired ? "bg-[#fffaf0]" : "bg-[#f0f7f9]"}`}
      >
        <span className={`text-[40px] font-semibold tabular-nums tracking-[1px] ${expired ? "text-[#7a5a1e]" : "text-teal"}`}>
          {mm}:{ss}
        </span>
        <span className={`text-[13px] ${expired ? "text-[#7a5a1e]" : "text-[#5c5c5c]"}`}>
          {expired
            ? "Your hold has ended. If you’ve already bought it, you can still tell us."
            : "left to buy it before it goes back on the list"}
        </span>
      </div>

      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[48px] items-center justify-center gap-2 rounded-[12px] border border-teal bg-teal/5 text-[14px] font-semibold text-teal transition hover:bg-teal/10"
        >
          <StoreIcon className="size-[18px]" />
          View in store ↗
        </a>
      )}

      {error && (
        <p role="alert" className="rounded-[14px] border border-[#f5d0c9] bg-[#fff5f3] px-4 py-3 text-[13px] leading-relaxed text-[#a3321f]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onBought}
        disabled={busy}
        className="h-[54px] w-full rounded-[50px] bg-teal text-[15px] font-medium tracking-[0.35px] text-teal-ink transition hover:brightness-95 disabled:opacity-70"
      >
        {busy ? "Just a moment…" : "I’ve bought it"}
      </button>
      <button type="button" onClick={onCancel} disabled={busy} className="-mt-3 text-center text-[13px] font-medium text-[#7a7266] transition hover:text-[#1c1611]">
        I changed my mind
      </button>
    </>
  );
}

/* Guest pays the host's own account: show where to send it + a reference. */
function TransferStep({
  details,
  itemName,
  recipient,
  busy,
  onSent,
  onBack,
  onClose,
}: {
  details: TransferDetails;
  itemName: string;
  recipient: string;
  busy: boolean;
  onSent: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const naira = Math.round(details.amount_kobo / 100);
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[17px] font-medium tracking-[-0.3px] text-black">Send &#8358;{naira.toLocaleString()} by transfer</p>
          <p className="text-[13px] text-[#7a7266]">Your gift toward {itemName}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full text-[#9a9a9a] transition hover:bg-black/5">
          <CloseIcon className="size-5" />
        </button>
      </div>

      <div className="flex flex-col divide-y divide-[#eef3f4] rounded-[14px] border border-[#e8f1f3] bg-[#fbfbfb] px-4">
        <TransferRow label="Bank" value={details.bank_name} />
        <TransferRow label="Account number" value={details.account_number} copy mono />
        <TransferRow label="Account name" value={details.account_name || "—"} />
        <TransferRow label="Amount" value={`₦${naira.toLocaleString()}`} copy={String(naira)} />
        <TransferRow label="Reference" value={details.reference} copy mono highlight />
      </div>

      <p className="-mt-2 text-[13px] leading-relaxed text-[#5c5c5c]">
        Add the <b className="font-semibold text-[#1c1611]">reference</b> to your transfer narration
        {` so ${recipient} knows it’s from you. They’ll confirm your gift once it lands.`}
      </p>

      <button
        type="button"
        onClick={onSent}
        disabled={busy}
        className="h-[54px] w-full rounded-[50px] bg-teal text-[15px] font-medium tracking-[0.35px] text-teal-ink transition hover:brightness-95 disabled:opacity-70"
      >
        {busy ? "Just a moment…" : "I’ve sent it"}
      </button>
      <button type="button" onClick={onBack} className="-mt-3 text-center text-[13px] font-medium text-[#7a7266] transition hover:text-[#1c1611]">
        Change amount
      </button>
    </>
  );
}

function TransferRow({
  label,
  value,
  copy,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  copy?: boolean | string; // true = copy `value`; a string = copy that instead
  mono?: boolean;
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(typeof copy === "string" ? copy : value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; the value is still visible to copy by hand */
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-[12px] text-[#7a7266]">{label}</p>
        <p
          className={`truncate text-[16px] font-semibold ${highlight ? "text-teal" : "text-[#1c1611]"} ${
            mono ? "tracking-[1px] tabular-nums" : "tracking-[-0.2px]"
          }`}
        >
          {value}
        </p>
      </div>
      {copy && (
        <button
          type="button"
          onClick={doCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className={`h-[32px] shrink-0 rounded-[50px] border px-3 text-[12px] font-medium transition ${
            copied ? "border-teal bg-teal text-teal-ink" : "border-teal/40 bg-white text-teal hover:bg-teal/5"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

function AmountChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[10px] border px-3 py-2 text-[13px] font-medium transition ${
        active ? "border-teal bg-teal/10 text-teal" : "border-[#e5e5e5] bg-[#f5f5f5] text-[#4a4a4a] hover:border-[#cfcfcf]"
      }`}
    >
      {label}
    </button>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-[10px] py-2.5 text-[14px] font-medium transition ${
        active ? "bg-white text-[#1c1611] shadow-sm" : "text-[#7a7266] hover:text-[#1c1611]"
      }`}
    >
      {children}
    </button>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4h6v3" />
    </svg>
  );
}

type Contribution = {
  id: string;
  eventId: string;
  itemId: string;
  itemName: string;
  amount: number;
  name: string;
  email?: string;
  status?: string;
  reference?: string;
  markedSent?: boolean; // guest tapped "I've sent it"
  createdAt: number;
};

// "Bola Ade" → "BA"; single word → first two letters.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function fmtContribDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
function fmtContribTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m}${ap}`;
}

/* Gift contribution overview, full-screen takeover (Figma 14557:19526
 * mobile / 14557:19628 desktop "Wishes list Contribution"). Replaces the
 * old table modal. Opened when the host taps a wishlist gift. */
function GiftContributionsModal({
  eventId,
  live,
  item,
  eventTitle,
  occasion,
  onConfirmed,
  onReleased,
  onClose,
  onDelete,
}: {
  eventId: string;
  live: boolean; // server-backed event (bank-transfer gifts come from the API)
  item: StoredItem;
  eventTitle: string;
  occasion?: string;
  onConfirmed: (naira: number) => void;
  onReleased: () => void;
  onClose: () => void;
  onDelete: () => Promise<string | null>;
}) {
  // Local/mock events keep pledges in localStorage; live events load the
  // bank-transfer gifts from the API below.
  const [rows, setRows] = useState<Contribution[]>(() => (live ? [] : localContributions(eventId, item.id)));
  const [loaded, setLoaded] = useState(!live);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    listTransfers(eventId)
      .then((list) => {
        if (cancelled) return;
        const mine = list.filter((t) =>
          item.type === "monetary" ? t.goal_id === item.id : t.wishlist_item_id === item.id,
        );
        setRows(
          mine.map((t) => ({
            id: t.id,
            eventId,
            itemId: item.id,
            itemName: item.name,
            amount: Math.round(t.amount_kobo / 100),
            name: t.giver_name || "Guest",
            status: t.status,
            reference: t.reference,
            markedSent: !!t.marked_sent_at,
            createdAt: new Date(t.created_at).getTime(),
          })),
        );
      })
      .catch(() => !cancelled && setRows([]))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [eventId, item.id, item.name, item.type, live]);

  async function confirm(r: Contribution) {
    setActing(r.id);
    try {
      await confirmTransfer(eventId, r.id);
      setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, status: "paid" } : x)));
      onConfirmed(r.amount);
    } catch {
      /* leave it pending; the host can retry */
    } finally {
      setActing(null);
    }
  }

  async function decline(r: Contribution) {
    setActing(r.id);
    try {
      await declineTransfer(eventId, r.id);
      setRows((cur) => cur.filter((x) => x.id !== r.id));
    } catch {
      /* leave it; the host can retry */
    } finally {
      setActing(null);
    }
  }

  // Only confirmed money counts; pending transfers are listed for the host to check.
  const received = rows.filter((r) => r.status === "paid");
  // A gift with confirmed or pending money can't be removed (it would orphan them).
  const canRemove = !live || (loaded && rows.length === 0);
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);
  async function remove() {
    setRemoving(true);
    setRemoveError("");
    const err = await onDelete();
    setRemoving(false);
    if (err) setRemoveError(err);
  }
  const total = received.reduce((s, r) => s + (r.amount || 0), 0);
  const subtitle = item.anyAmount ? "Any amount" : `₦${item.amount.toLocaleString()}`;
  const count = received.length;

  const Thumb = ({ size, radius }: { size: number; radius: number }) =>
    item.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.image} alt="" className="shrink-0 object-cover" style={{ width: size, height: size, borderRadius: radius }} />
    ) : (
      <span
        className="grid shrink-0 place-items-center bg-[#f0f7f9]"
        style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.5 }}
      >
        {item.emoji}
      </span>
    );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#fcf9eb] font-dote">
      {/* ======================= MOBILE ======================= */}
      <div className="flex min-h-full flex-col lg:hidden">
        {/* header */}
        <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-6 pt-[26px] pb-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="grid place-items-center rounded-[10px] border border-white bg-black p-[6px]"
          >
            <BackArrow className="size-4 text-white" />
          </button>
          <h2 className="text-center font-italiana text-[24px] tracking-[-0.8px]">Contribution</h2>
          {canRemove ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Remove from list"
              className="grid size-8 place-items-center justify-self-end text-[#ef5a43] transition hover:opacity-70"
            >
              <TrashIcon className="size-6" />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
        </header>

        <div className="flex flex-col items-center gap-6 px-6 pt-4 pb-10">
          {/* gift card */}
          <div className="flex w-full items-center gap-3 rounded-[18px] bg-white p-[18px]">
            <Thumb size={38} radius={8} />
            <div className="flex flex-col gap-0.5">
              <p className="text-[16px] font-medium leading-[1.4] tracking-[-1px] text-black">{item.name}</p>
              <div className="flex items-center gap-[4px] text-[12px] leading-[1.4] tracking-[-1px]">
                <span className="text-[#636363]">Target</span>
                <span className="text-[#636363]">·</span>
                <span className="text-[#101010]">{subtitle}</span>
              </div>
            </div>
          </div>

          {live && (item.taken === "bought" || item.taken === "held") && (
            <ReservationCard item={item} onReleased={onReleased} />
          )}

          {/* stat cards */}
          <div className="flex w-full gap-3">
            <StatBox label="Total Contribution Received" naira value={total.toLocaleString()} />
            <StatBox label="Number of Contributors" value={String(count).padStart(2, "0")} />
          </div>

          {/* contributors */}
          <div className="flex w-full flex-col gap-3">
            <p className="text-[18px] tracking-[-0.8px] text-black">Contributors</p>
            {loaded && rows.length === 0 ? (
              <EmptyContrib />
            ) : (
              <div className="flex flex-col gap-[14px]">
                {rows.map((r) => (
                  <div key={r.id} className="flex flex-col gap-3 rounded-[20px] border border-[#f0f0f0] bg-white/60 p-[14px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar name={r.name} />
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[16px] font-medium leading-[1.4] tracking-[-1px] text-black">{r.name}</p>
                          <div className="flex gap-[3px] text-[12px] leading-[1.4] tracking-[-1px] text-[#636363]">
                            <span>{fmtContribDate(r.createdAt)}</span>
                            <span>{fmtContribTime(r.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 tracking-[-1px]">
                        <p className="text-[16px] font-medium text-black">₦{r.amount.toLocaleString()}</p>
                        <ContribStatus status={r.status} />
                      </div>
                    </div>
                    {r.status !== "paid" && (
                      <PendingTransfer r={r} busy={acting === r.id} onConfirm={() => confirm(r)} onDecline={() => decline(r)} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <ThankYouBand eventTitle={eventTitle} occasion={occasion} />
      </div>

      {/* ======================= DESKTOP ======================= */}
      <div className="hidden min-h-full flex-col lg:flex">
        {/* header */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-6 pt-[42px] pb-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="grid w-fit place-items-center rounded-[10px] border border-white bg-black p-[6px]"
          >
            <BackArrow className="size-4 text-white" />
          </button>
          <h2 className="font-italiana text-[32px] tracking-[-0.8px] text-black">Wishes list Contribution</h2>
          {canRemove ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-[6px] justify-self-end text-[#ef5a43] transition hover:opacity-70"
            >
              <span className="text-[16px] font-medium tracking-[-0.8px] text-black">Remove from list</span>
              <TrashIcon className="size-[26px]" />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
        </header>

        {/* card */}
        <div className="flex justify-center px-6 pb-14">
          <div className="flex w-full max-w-[876px] flex-col gap-8 rounded-[50px] bg-white p-8">
            {/* gift card */}
            <div className="flex items-center gap-[18px] rounded-[42px] bg-[#f8f8f8] p-8">
              <Thumb size={75} radius={20} />
              <div className="flex flex-col gap-2">
                <p className="text-[28px] font-semibold leading-[1.4] tracking-[-1px] text-black">{item.name}</p>
                <div className="flex items-center gap-[4px] text-[18px] leading-[1.4] tracking-[-1px]">
                  <span className="text-[#636363]">Target</span>
                  <span className="text-[#636363]">·</span>
                  <span className="text-[#101010]">{subtitle}</span>
                </div>
              </div>
            </div>

            {live && (item.taken === "bought" || item.taken === "held") && (
              <ReservationCard item={item} onReleased={onReleased} />
            )}

            {/* stat cards */}
            <div className="flex gap-8">
              <StatBoxLg label="Total Contribution Received" naira value={total.toLocaleString()} />
              <StatBoxLg label="Number of Contributors" value={String(count).padStart(2, "0")} />
            </div>

            {/* contributors */}
            <div className="flex flex-col gap-3">
              <p className="text-[20px] tracking-[-0.8px] text-black">Contributors</p>
              {loaded && rows.length === 0 ? (
                <EmptyContrib />
              ) : (
                <div className="flex flex-col gap-[14px]">
                  {rows.map((r) => (
                    <div key={r.id} className="flex flex-col gap-3 rounded-[18px] border border-[#f0f0f0] bg-white p-[18px]">
                    <div className="flex items-center justify-between">
                      <div className="flex w-[280px] items-center gap-3">
                        <Avatar name={r.name} />
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[16px] font-medium leading-[1.4] tracking-[-1px] text-black">{r.name}</p>
                          {r.email ? (
                            <p className="text-[12px] leading-[1.4] tracking-[-1px] text-[#636363]">{r.email}</p>
                          ) : (
                            <p className="text-[12px] leading-[1.4] tracking-[-1px] text-[#636363]">
                              {fmtContribTime(r.createdAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="w-[90px] text-[16px] font-medium tracking-[-1px] text-black">
                        ₦{r.amount.toLocaleString()}
                      </p>
                      <div className="flex w-[180px] gap-3 text-[16px] font-medium tracking-[-1px]">
                        <span className="text-black">{fmtContribDate(r.createdAt)}</span>
                        <span className="text-[#5e5e5e]">{fmtContribTime(r.createdAt)}</span>
                      </div>
                      <div className="w-[90px] text-right tracking-[-1px]">
                        <ContribStatus status={r.status} />
                      </div>
                    </div>
                    {r.status !== "paid" && (
                      <PendingTransfer r={r} busy={acting === r.id} onConfirm={() => confirm(r)} onDecline={() => decline(r)} />
                    )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <ThankYouBand eventTitle={eventTitle} occasion={occasion} desktop />
      </div>

      {/* delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="flex w-full max-w-[380px] flex-col gap-3 rounded-[20px] bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[15px] text-[#8a2b1e]">
              Remove <b>{item.name}</b> from the wishlist? This can&rsquo;t be undone.
            </p>
            {removeError && <p role="alert" className="text-[13px] text-[#a3321f]">{removeError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={removing}
                className="h-[44px] flex-1 rounded-[50px] bg-[#bc1b06] text-[14px] font-medium text-white transition hover:brightness-110"
              >
                Remove gift
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-[44px] flex-1 rounded-[50px] border border-[#e0dccf] text-[14px] font-medium text-[#5c5c5c] transition hover:bg-black/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Host: who bought (or is holding) a gift, with a way to put it back. */
function ReservationCard({ item, onReleased }: { item: StoredItem; onReleased: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const who = item.reservedBy || "A guest";
  const when = item.purchasedAt
    ? new Date(item.purchasedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "";
  async function release() {
    setBusy(true);
    setError("");
    try {
      await releaseWishlistItem(item.id);
      onReleased();
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn’t put this gift back on the list. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex w-full flex-col gap-3 rounded-[18px] border border-[#f0f0f0] bg-white p-[18px] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-[16px] font-medium tracking-[-0.6px] text-black">
          {item.taken === "bought" ? `Bought by ${who}` : `Reserved by ${who}`}
        </p>
        <p className="text-[13px] leading-relaxed tracking-[-0.2px] text-[#636363]">
          {item.taken === "bought"
            ? `${when ? `Marked as bought on ${when}. ` : ""}It’s off your list so nobody buys it twice. If they didn’t actually buy it, put it back.`
            : "They have a few minutes to buy it. If they don’t confirm, it goes back on your list on its own."}
        </p>
        {error && <p role="alert" className="text-[13px] text-[#a3321f]">{error}</p>}
      </div>
      <button
        type="button"
        onClick={release}
        disabled={busy}
        className="h-[40px] shrink-0 rounded-[50px] border border-[#e0dccf] bg-white px-5 text-[13px] font-medium text-[#5c5c5c] transition hover:bg-black/5 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Put back on list"}
      </button>
    </div>
  );
}

function localContributions(eventId: string, itemId: string): Contribution[] {
  try {
    const all: Contribution[] = JSON.parse(localStorage.getItem("dote.contributions") || "[]");
    return all
      .filter((c) => c.eventId === eventId && c.itemId === itemId)
      .map((c) => ({ ...c, status: "paid" }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function ContribStatus({ status }: { status?: string }) {
  return status === "paid" ? (
    <p className="text-[16px] font-medium text-[#079e07]">Received</p>
  ) : (
    <p className="text-[16px] font-medium text-[#c27a00]">Pending</p>
  );
}

/* A bank transfer the host still has to check against their account. */
function PendingTransfer({
  r,
  busy,
  onConfirm,
  onDecline,
}: {
  r: Contribution;
  busy: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-[#fffaf0] px-[14px] py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] leading-relaxed tracking-[-0.2px] text-[#7a5a1e]">
        {r.markedSent ? "Guest says it’s sent. " : "Waiting for the transfer. "}
        Look for ref <b className="font-semibold tracking-[0.5px] text-[#1c1611]">{r.reference}</b> in your account.
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="h-[36px] rounded-[50px] border border-[#e0dccf] bg-white px-4 text-[13px] font-medium text-[#5c5c5c] transition hover:bg-black/5 disabled:opacity-60"
        >
          Not received
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="h-[36px] rounded-[50px] bg-teal px-4 text-[13px] font-medium text-teal-ink transition hover:brightness-95 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Confirm received"}
        </button>
      </div>
    </div>
  );
}

/* contributor avatar, teal circle with initials */
function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-[20px] bg-[#00c0e8] text-[16px] font-semibold tracking-[-0.8px] text-white">
      {initials(name)}
    </span>
  );
}

/* mobile stat box */
function StatBox({ label, value, naira }: { label: string; value: string; naira?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-[14px] rounded-[18px] border-2 border-white bg-[#fffefc] p-[18px]">
      <p className="text-[12px] leading-[1.4] tracking-[-1px] text-black">{label}</p>
      <p className="flex items-center gap-1 text-[20px] font-semibold leading-[1.4] tracking-[-1px]">
        {naira && <span className="text-[#a6a6a6]">₦</span>}
        <span className="text-black">{value}</span>
      </p>
    </div>
  );
}

/* desktop stat box */
function StatBoxLg({ label, value, naira }: { label: string; value: string; naira?: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-4 rounded-[28px] border-2 border-white bg-[#f9f8f4] p-7">
      <p className="text-[18px] leading-[1.4] tracking-[-1px] text-black">{label}</p>
      <p className="flex items-center gap-[10px] text-[42px] font-semibold leading-[1.4] tracking-[-1px]">
        {naira && <span className="text-[#a6a6a6]">₦</span>}
        <span className="text-black">{value}</span>
      </p>
    </div>
  );
}

function EmptyContrib() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-[#e0dccf] bg-white/60 px-6 py-12 text-center">
      <span className="text-[26px]">🎁</span>
      <p className="text-[14px] text-[#6e6558]">No contributions yet for this gift.</p>
    </div>
  );
}

function ThankYouBand({ eventTitle, occasion, desktop }: { eventTitle: string; occasion?: string; desktop?: boolean }) {
  return (
    <section
      className={`mt-auto flex flex-col items-center gap-16 border-t border-[#8eeaff] bg-[#ecfcff] text-center ${
        desktop ? "px-10 pb-[42px] pt-[62px]" : "px-10 pb-6 pt-[38px]"
      }`}
    >
      <div className="flex flex-col items-center gap-[14px]">
        <h3 className={`font-italiana tracking-[-0.8px] ${desktop ? "text-[32px]" : "text-[24px]"}`}>Thank you</h3>
        <p className={`${desktop ? "max-w-[545px] text-[20px]" : "max-w-[319px] text-[16px]"} leading-relaxed`}>
          {thankYouFor(occasion)}
        </p>
      </div>
      <p className={`font-dote font-extralight tracking-[-0.4px] ${desktop ? "text-[18px]" : "text-[16px]"}`}>
        {eventTitle}
      </p>
    </section>
  );
}

function WellWishesCard({ eventId, recipient }: { eventId: string; recipient: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valid = name.trim().length > 0 && message.trim().length > 0 && emailOk;

  function submit() {
    if (!valid) return;
    try {
      const all = JSON.parse(localStorage.getItem("dote.wellwishes") || "[]");
      all.push({
        id: Math.random().toString(36).slice(2),
        eventId,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        createdAt: Date.now(),
      });
      localStorage.setItem("dote.wellwishes", JSON.stringify(all));
    } catch {
      /* storage unavailable, still show the thank-you */
    }
    setSent(true);
  }

  return (
    <section id="well-wishes" className="flex scroll-mt-6 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-[520px] flex-col gap-6 rounded-[24px] border border-[#e6e2d6] bg-white p-6 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)] sm:p-8">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-teal/10 text-[28px]">💌</span>
            <h3 className="font-italiana text-[24px] tracking-[-0.8px]">Thank you, {name.trim().split(" ")[0]}!</h3>
            <p className="max-w-[360px] text-[15px] leading-relaxed text-[#5c5c5c]">
              Your well wishes are on their way to {recipient}. It means the world.
            </p>
            <button
              type="button"
              onClick={() => {
                setName("");
                setEmail("");
                setMessage("");
                setSent(false);
              }}
              className="mt-2 text-[14px] font-medium text-teal transition hover:underline"
            >
              Send another
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 text-center">
              <h3 className="font-italiana text-[26px] tracking-[-0.8px]">Send well wishes</h3>
              <p className="text-[14px] text-[#5c5c5c]">Leave a heartfelt note for {recipient}.</p>
            </div>

            <div className="flex flex-col gap-4">
              <WishField label="Your name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ada Obi"
                  className="h-[52px] w-full rounded-[14px] border border-[#e8f1f3] bg-[#fbfbfb] px-4 text-[15px] text-[#1c1611] outline-none transition placeholder:text-[#cccccc] focus:border-teal"
                />
              </WishField>
              <WishField label="Email address">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-[52px] w-full rounded-[14px] border border-[#e8f1f3] bg-[#fbfbfb] px-4 text-[15px] text-[#1c1611] outline-none transition placeholder:text-[#cccccc] focus:border-teal"
                />
              </WishField>
              <WishField label="Your message">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Share a warm message…"
                  className="w-full resize-none rounded-[14px] border border-[#e8f1f3] bg-[#fbfbfb] px-4 py-3 text-[15px] leading-relaxed text-[#1c1611] outline-none transition placeholder:text-[#cccccc] focus:border-teal"
                />
              </WishField>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!valid}
              className="h-[52px] w-full rounded-[50px] text-[15px] font-medium tracking-[0.35px] text-teal-ink transition disabled:cursor-not-allowed disabled:bg-[#d0ebf1] enabled:bg-teal enabled:hover:brightness-95"
            >
              Send well wishes
            </button>
          </>
        )}
      </div>
    </section>
  );
}

type WellWish = { id: string; eventId: string; name: string; email: string; message: string; createdAt: number };

function fmtWhen(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

const WISHES_PREVIEW = 3;

function WellWishesReceived({ eventId }: { eventId: string }) {
  const [wishes, setWishes] = useState<WellWish[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const all: WellWish[] = JSON.parse(localStorage.getItem("dote.wellwishes") || "[]");
      setWishes(all.filter((w) => w.eventId === eventId).sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      setWishes([]);
    }
    setLoaded(true);
  }, [eventId]);

  if (!loaded) return null;

  const shown = expanded ? wishes : wishes.slice(0, WISHES_PREVIEW);
  const extra = wishes.length - WISHES_PREVIEW;

  return (
    <section className="flex flex-col items-center gap-[26px] px-6 py-16">
      <div className="flex flex-col items-center gap-[6px] text-center">
        <h2 className="font-italiana text-[28px] tracking-[-0.8px] sm:text-[32px]">Well wishes</h2>
        <p className="text-[14px] text-[#5c5c5c]">
          {wishes.length > 0
            ? `${wishes.length} heartfelt ${wishes.length === 1 ? "note" : "notes"} from your guests`
            : "Notes from your guests will appear here"}
        </p>
      </div>

      {wishes.length === 0 ? (
        <div className="flex w-full max-w-[520px] flex-col items-center gap-2 rounded-[20px] border border-dashed border-[#e0dccf] bg-white/60 px-6 py-12 text-center">
          <span className="text-[28px]">💌</span>
          <p className="text-[15px] text-[#6e6558]">No well wishes yet. Share your invite link to start receiving them.</p>
        </div>
      ) : (
        <>
          <div className="grid w-full max-w-[940px] items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((w) => (
              <WishCard key={w.id} w={w} />
            ))}
          </div>
          {extra > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="rounded-[50px] border border-teal px-[32px] py-[12px] text-[14px] font-medium tracking-[0.2px] text-teal transition hover:bg-teal/5"
            >
              {expanded ? "Show less" : `Show all ${wishes.length} well wishes`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function WishCard({ w }: { w: WellWish }) {
  return (
    <article className="flex flex-col gap-4 rounded-[18px] border border-[#ece3d2] bg-white p-5 text-left">
      <QuoteIcon className="size-6 text-teal/60" />
      <p className="flex-1 text-[15px] leading-relaxed text-[#1c1611]">{w.message}</p>
      <div className="border-t border-black/[0.06] pt-3">
        <p className="text-[15px] font-medium tracking-[-0.3px] text-black">{w.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-[#7a7266]">
          <span>{w.email}</span>
          <span className="text-[#c4bdae]">·</span>
          <span>{fmtWhen(w.createdAt)}</span>
        </p>
      </div>
    </article>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 19a6 6 0 0 0-12 0" />
      <circle cx="9" cy="7" r="4" />
      <path d="M18 8v6M21 11h-6" />
    </svg>
  );
}

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7.5 6C5.57 6 4 7.57 4 9.5c0 1.93 1.57 3.5 3.5 3.5.28 0 .55-.03.81-.1-.36 1.4-1.52 2.5-2.96 2.84a.75.75 0 0 0 .3 1.47c2.86-.58 5.05-3.12 5.05-6.18V9.5C10.7 7.57 9.43 6 7.5 6Zm9 0C14.57 6 13 7.57 13 9.5c0 1.93 1.57 3.5 3.5 3.5.28 0 .55-.03.81-.1-.36 1.4-1.52 2.5-2.96 2.84a.75.75 0 0 0 .3 1.47c2.86-.58 5.05-3.12 5.05-6.18V9.5C19.7 7.57 18.43 6 16.5 6Z" />
    </svg>
  );
}

function WishField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-medium tracking-[-0.2px] text-[#221a10]">{label}</span>
      {children}
    </label>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-[14px] px-6">
      <div className="h-px w-full bg-[#e6e2d6]" />
      <div className="flex flex-col items-center gap-[18px]">
        <p className="font-italiana text-[22px] tracking-[-0.8px] sm:text-[24px]">{label}</p>
        <div className="flex flex-col items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

function WishRow({
  item,
  theme,
  guest,
  onOpen,
}: {
  item: StoredItem;
  theme: (typeof THEMES)[number];
  guest?: boolean;
  onOpen?: () => void;
}) {
  const raised = item.raised ?? 0;
  const pct = item.amount > 0 ? Math.min(100, Math.round((raised / item.amount) * 100)) : 0;
  // When the host hides contribution amounts / the running total for this wish,
  // the progress bar is hidden for everyone — host and guests — so the host can
  // clearly see it's hidden.
  // A bought gift has no contributions to show, so its bar is hidden too.
  const showProgress = !(item.hideContrib || item.hideTotal) && item.taken !== "bought" && item.taken !== "held";
  // Bought outright or fully paid for by confirmed gifts: both read "Bought".
  const takenLabel =
    item.taken === "bought" || item.taken === "funded" ? "Bought" : item.taken === "held" ? "Reserved" : null;
  // Reserved is temporary (a guest has 10 minutes to buy it), so it isn't crossed out.
  const crossedOut = item.taken === "bought" || item.taken === "funded";
  return (
    <div
      aria-disabled={takenLabel && !onOpen ? true : undefined}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={`flex items-center gap-4 rounded-[18px] border p-[18px] sm:gap-10 ${
        onOpen ? "cursor-pointer transition hover:brightness-[0.98]" : ""
      } ${crossedOut ? "opacity-70" : ""}`}
      style={{ background: theme.bg, borderColor: theme.border }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* label */}
        <div className="flex w-full shrink-0 items-center gap-3 sm:w-[276px]">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" className="size-[38px] shrink-0 rounded-[8px] object-cover" />
          ) : (
            <span
              className="grid size-[38px] shrink-0 place-items-center rounded-[8px] text-[18px]"
              style={{ background: theme.iconBg }}
            >
              {item.emoji}
            </span>
          )}
          <div className="min-w-0">
            <p
              className={`truncate text-[16px] font-medium leading-[1.4] tracking-[-1px] text-black ${
                crossedOut ? "line-through decoration-[#5b5b5b] decoration-[1.5px]" : ""
              }`}
            >
              {item.name}
            </p>
            <div className="flex items-center gap-[3px] text-[12px] leading-[1.4] tracking-[-1px]">
              <span className="text-[#636363]">Cash</span>
              <span className="text-[#636363]">·</span>
              <span className="text-[#101010]">
                {item.anyAmount ? "Any amount" : `₦${item.amount.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* progress bar, hidden when the host hid contributions / the total */}
        {showProgress ? (
          <div className="flex w-full min-w-px flex-col gap-[6px] sm:flex-1">
            <div className="h-[11px] w-full rounded-[6px]" style={{ background: theme.track }}>
              <div
                className="h-[10px] min-w-[8px] rounded-[6px]"
                style={{ width: `${pct}%`, background: theme.fill }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="flex items-end gap-1 text-[14px] leading-[1.1]">
                <span className="text-[12px] font-semibold" style={{ color: theme.raised }}>
                  &#8358;{raised.toLocaleString()}
                </span>
                <span className="text-[#5b5b5b]">raised</span>
              </p>
              <p className="flex items-end gap-1 text-[14px] leading-[1.1] text-[#5b5b5b]">
                <span>{item.anyAmount ? "Limit" : "of"}</span>
                <span className="text-[12px] font-semibold text-[#191919]">
                  &#8358;{item.amount.toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="hidden sm:block sm:flex-1" />
        )}
      </div>
      {takenLabel ? (
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-[50px] px-3 py-[6px] text-[12px] font-semibold ${
            crossedOut ? "bg-[#e7f5ea] text-[#1f6b33]" : "bg-[#fff3df] text-[#7a5a1e]"
          }`}
        >
          {crossedOut && <CheckMarkIcon className="size-[14px]" />}
          {takenLabel}
        </span>
      ) : (
        <ArrowRightIcon className="size-4 shrink-0 text-[#9a9a9a]" />
      )}
    </div>
  );
}

function CheckMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
  );
}

/* ------------------------------ icons ----------------------------- */

/* vuesax/linear/arrow-up, drawn pointing up, rotated to point left (as in Figma). */
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
  );
}
function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
/* vuesax/bulk/setting-3, exact Figma asset (14544:12523): rounded square body
   with two slider tracks + knobs. Body at 0.4 opacity like the bulk variant. */
function SettingsGear({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path opacity="0.4" d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2Z" />
      <path d="M15.58 19.25C15.17 19.25 14.83 18.91 14.83 18.5V14.6C14.83 14.19 15.17 13.85 15.58 13.85C15.99 13.85 16.33 14.19 16.33 14.6V18.5C16.33 18.91 15.99 19.25 15.58 19.25Z" />
      <path d="M15.58 8.2C15.17 8.2 14.83 7.86 14.83 7.45V5.5C14.83 5.09 15.17 4.75 15.58 4.75C15.99 4.75 16.33 5.09 16.33 5.5V7.45C16.33 7.86 15.99 8.2 15.58 8.2Z" />
      <path d="M8.42 19.25C8.01 19.25 7.67 18.91 7.67 18.5V16.55C7.67 16.14 8.01 15.8 8.42 15.8C8.83 15.8 9.17 16.14 9.17 16.55V18.5C9.17 18.91 8.84 19.25 8.42 19.25Z" />
      <path d="M8.42 10.15C8.01 10.15 7.67 9.81 7.67 9.4V5.5C7.67 5.09 8.01 4.75 8.42 4.75C8.83 4.75 9.17 5.09 9.17 5.5V9.4C9.17 9.81 8.84 10.15 8.42 10.15Z" />
      <path d="M15.58 7.33C14.08 7.33 12.85 8.55 12.85 10.05C12.85 11.55 14.07 12.78 15.58 12.78C17.08 12.78 18.3 11.56 18.3 10.05C18.3 8.54 17.08 7.33 15.58 7.33Z" />
      <path d="M8.42 11.23C6.92 11.23 5.7 12.45 5.7 13.96C5.7 15.47 6.92 16.68 8.42 16.68C9.92 16.68 11.15 15.46 11.15 13.96C11.15 12.46 9.93 11.23 8.42 11.23Z" />
    </svg>
  );
}
