"use client";

import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "./UserAvatar";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { DoteLogo } from "./Logo";
import { SidebarLogout } from "./SidebarLogout";
import { BackArrow } from "./BackArrow";
import { Toast } from "./Toast";
import { createEventFromFlow, getHostEvent, hostEventToFlow, updateEventFromFlow } from "@/lib/host-events";
import { getSession } from "@/lib/auth";
import { isNetworkError } from "@/lib/api";

/* ------------------------------------------------------------------ *
 * Dote, create-event flow (mobile, from Figma file 2jeZJEHHRSnPmOXbsp3DYq
 * section 14518:70844). Four steps: Event Details → Upload Images →
 * Wishlist (A List of Little Wishes) with the Add Wishlist Item sheet.
 * Every frame in this flow is the 402px mobile artboard; desktop/web
 * frames aren't designed yet, so on wider screens the same mobile column
 * is centred (no improvised desktop layout).
 * ------------------------------------------------------------------ */

const SCREEN_BG =
  "linear-gradient(150.9deg, #FFFEF7 0.85%, #F8F5FF 41.76%, #FAFEFF 74.51%)";

// Convert an (object) URL into a downscaled JPEG data URL so a cover photo
// survives navigation/reload in the mock localStorage store.
function toCoverDataURL(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 800;
      const scale = Math.min(1, maxW / (img.width || maxW));
      const w = Math.max(1, Math.round((img.width || maxW) * scale));
      const h = Math.max(1, Math.round((img.height || maxW) * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const STEPS = ["details", "upload", "wishlist", "preview"] as const;
type Step = (typeof STEPS)[number];
const TOTAL = STEPS.length; // "Step N of 4"

type GiftType = "monetary" | "physical";
type WishItem = {
  id: string;
  type: GiftType;
  name: string;
  emoji: string;
  image: string | null; // physical gift photo, when uploaded
  link?: string; // optional store/vendor link (physical gifts only)
  anyAmount: boolean;
  amount: number;
  hideContrib: boolean;
  hideTotal: boolean;
};

const CATEGORY_LABEL: Record<string, string> = {
  wedding: "Wedding Category",
  birthday: "Birthday Category",
  baby: "Baby shower Category",
};

export function CreateEventFlow({ editId }: { editId?: string } = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const editMode = !!editId;
  const [occasion, setOccasion] = useState(params.get("occasion") ?? "wedding");

  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // When editing, wait for the stored event to hydrate the fields before paint.
  const [hydrated, setHydrated] = useState(!editId);

  // step 1
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [dress, setDress] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  // step 2
  const [photos, setPhotos] = useState<string[]>([]);

  // step 3
  const [items, setItems] = useState<WishItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<WishItem | null>(null);

  // Edit mode, prefill every field from the event (API; local fallback).
  useEffect(() => {
    if (!editId) return;
    const applyLocal = () => {
      try {
        const all = JSON.parse(localStorage.getItem("dote.events") || "[]");
        const ev = all.find((e: { id: string }) => e.id === editId);
        if (!ev) return;
        setOccasion(ev.occasion || "wedding");
        setTitle(ev.title || "");
        setCategory(ev.category || "");
        setLocation(ev.venue || "");
        setDress(ev.dress || "");
        setTime(ev.time || "");
        setDate(ev.date || "");
        setDescription(ev.description || "");
        setPhotos(
          Array.isArray(ev.gallery) && ev.gallery.length ? ev.gallery : ev.cover ? [ev.cover] : []
        );
        setItems(
          (ev.items || []).map((it: Partial<WishItem> & { id: string; name: string }) => ({
            id: it.id,
            type: (it.type as GiftType) || "monetary",
            name: it.name,
            emoji: it.emoji || "🎁",
            image: it.image ?? null,
            link: it.link ?? "",
            anyAmount: !!it.anyAmount,
            amount: it.amount || 0,
            hideContrib: !!it.hideContrib,
            hideTotal: !!it.hideTotal,
          }))
        );
      } catch {
        /* storage unavailable */
      }
    };
    (async () => {
      try {
        const f = hostEventToFlow(await getHostEvent(editId));
        setOccasion(f.occasion);
        setTitle(f.title);
        setCategory(f.category ?? "");
        setLocation(f.venue);
        setDress(f.dress);
        setTime(f.time);
        setDate(f.date);
        setDescription(f.description);
        setPhotos(f.gallery);
        setItems(f.items as WishItem[]);
      } catch {
        applyLocal(); // offline fallback
      }
      setHydrated(true);
    })();
  }, [editId]);

  function openAdd() {
    setEditItem(null);
    setSheetOpen(true);
  }
  function openEdit(it: WishItem) {
    setEditItem(it);
    setSheetOpen(true);
  }
  function closeSheet() {
    setSheetOpen(false);
    setEditItem(null);
  }

  const idx = STEPS.indexOf(step);
  const pct = Math.round(((idx + 1) / TOTAL) * 100);

  function back() {
    if (idx === 0) {
      if (editMode) router.push(`/events/${editId}`);
      else router.back();
    } else setStep(STEPS[idx - 1]);
  }
  function next() {
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }
  function finish() {
    setSaveError(false);
    setLoading(true);
    (async () => {
      // Durable cover (first photo) + item images as data URLs (object URLs
      // don't survive navigation/reload).
      const gallery = (
        await Promise.all(photos.slice(0, 6).map((p) => toCoverDataURL(p)))
      ).filter(Boolean) as string[];
      const cover = gallery[0] ?? null;
      const slimItems = await Promise.all(
        items.map(async (it) => ({
          id: it.id,
          type: it.type,
          name: it.name,
          emoji: it.emoji,
          image: it.image ? await toCoverDataURL(it.image) : null,
          link: it.link,
          anyAmount: it.anyAmount,
          amount: it.amount,
          hideContrib: it.hideContrib,
          hideTotal: it.hideTotal,
        }))
      );
      const payload = {
        occasion, category, title, location, dress, time, date, description,
        cover, gallery, items: slimItems, publish: true,
      };

      // --- live API first ---
      try {
        if (editMode && editId) {
          await updateEventFromFlow(editId, payload);
        } else {
          await createEventFromFlow(payload);
        }
        router.push(editMode ? `/events/${editId}?updated=1` : "/events?published=1");
        return;
      } catch (err) {
        if (!isNetworkError(err)) {
          // A real server error (validation/auth). Surface it and stop.
          setLoading(false);
          setSaveError(true);
          return;
        }
        // offline → fall back to the local mock store so the flow still works
      }

      try {
        const prev = JSON.parse(localStorage.getItem("dote.events") || "[]");
        const base = {
          title: title || "Your celebration",
          occasion, category, date, time, venue: location, dress, description,
          cover, gallery, items: slimItems, wishes: items.length,
        };
        if (editMode) {
          const next = prev.map((e: { id: string }) =>
            e.id === editId ? { ...e, ...base } : e);
          localStorage.setItem("dote.events", JSON.stringify(next));
        } else {
          const ev = { id: Math.random().toString(36).slice(2), ...base, createdAt: Date.now() };
          localStorage.setItem("dote.events", JSON.stringify([ev, ...prev]));
        }
      } catch {
        /* storage unavailable */
      }
      router.push(editMode ? `/events/${editId}?updated=1` : "/events?published=1");
    })();
  }

  const details = { title, category, location, dress, time, date, description };
  const detailSetters = { setTitle, setCategory, setLocation, setDress, setTime, setDate, setDescription };
  const previewData = { occasion, title, location, dress, time, date, description, photos, items };

  // Editing: hold paint until the stored event has hydrated the fields.
  if (!hydrated) {
    return (
      <div className="min-h-screen font-dote" style={{ background: SCREEN_BG }}>
        <LoadingOverlay />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-dote" style={{ background: SCREEN_BG }}>
      <Toast
        show={saveError}
        onClose={() => setSaveError(false)}
        tone="error"
        title={editMode ? "Couldn’t save your changes" : "Couldn’t create your event"}
        message="Something went wrong. Please check the details and try again."
      />
      {/* ============================= MOBILE ============================= */}
      <div className="mx-auto flex min-h-screen w-full max-w-[402px] flex-col px-6 lg:hidden">
        <ProgressBar step={idx + 1} pct={pct} className="pt-[52px]" />

        <div className="flex items-center justify-between py-[18px]">
          <BackButton onClick={back} />
          {(step === "upload" || step === "wishlist") && <SkipButton onClick={next} />}
        </div>

        {step === "details" && (
          <DetailsStep
            occasion={occasion}
            v={{ title, category, location, dress, time, date, description }}
            set={{ setTitle, setCategory, setLocation, setDress, setTime, setDate, setDescription }}
            onContinue={next}
          />
        )}

        {step === "upload" && (
          <UploadStep photos={photos} setPhotos={setPhotos} onContinue={next} />
        )}

        {step === "wishlist" && (
          <WishlistStep
            items={items}
            onAdd={openAdd}
            onEdit={openEdit}
            onContinue={next}
          />
        )}

        {step === "preview" && (
          <PreviewStep data={previewData} editMode={editMode} onPublish={finish} onBack={() => setStep("wishlist")} />
        )}
      </div>

      {/* ============================ DESKTOP ============================ */}
      <div className="hidden h-screen flex-col overflow-hidden lg:flex">
        <DesktopTopBar
          step={step}
          sheetOpen={sheetOpen}
          editMode={editMode}
          onStep={setStep}
          onNew={() => router.push(editMode ? `/events/${editId}` : "/create")}
          onCloseSheet={() => setSheetOpen(false)}
        />
        <div className="flex min-h-0 flex-1">
          <DesktopSidebar editMode={editMode} />
          <main className="flex min-h-0 flex-1 justify-center overflow-y-auto px-8 pb-12 pt-[18px]">
            <div className="flex w-[736px] max-w-full flex-col">
              <ProgressBar step={idx + 1} pct={pct} />
              <div className="mt-[42px]">
                {step === "details" && (
                  <DesktopDetails
                    occasion={occasion}
                    v={details}
                    set={detailSetters}
                    onContinue={next}
                  />
                )}
                {step === "upload" && (
                  <DesktopUpload photos={photos} setPhotos={setPhotos} onContinue={next} />
                )}
                {step === "wishlist" && (
                  <DesktopWishlist
                    items={items}
                    onAdd={openAdd}
                    onEdit={openEdit}
                    onContinue={next}
                  />
                )}
                {step === "preview" && (
                  <DesktopPreview
                    data={previewData}
                    editMode={editMode}
                    onPublish={finish}
                    onBack={() => setStep("wishlist")}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {sheetOpen && (
        <AddWishlistSheet
          editing={editItem}
          onClose={closeSheet}
          onSubmit={(item) => {
            setItems((prev) =>
              prev.some((p) => p.id === item.id)
                ? prev.map((p) => (p.id === item.id ? item : p))
                : [...prev, item]
            );
            closeSheet();
          }}
          onDelete={
            editItem
              ? () => {
                  setItems((prev) => prev.filter((p) => p.id !== editItem.id));
                  closeSheet();
                }
              : undefined
          }
        />
      )}

      {loading && <LoadingOverlay />}
    </div>
  );
}

/* ----------------------------- chrome ----------------------------- */

function ProgressBar({ step, pct, className }: { step: number; pct: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-[6px]", className)}>
      <div className="flex items-center justify-between text-[10px] tracking-[-0.4px] text-[#828282]">
        <span>Step {step} of {TOTAL}</span>
        <span>{pct}%</span>
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-[4px] bg-[#e9e9e9]">
        <div
          className="absolute inset-y-0 left-0 rounded-[4px]"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #00829f, #06aacf)" }}
        />
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="grid place-items-center rounded-[10px] border border-teal bg-[rgba(203,245,255,0.3)] p-[6px]"
    >
      <BackArrow className="size-4 text-teal" />
    </button>
  );
}

function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[10px] bg-[#f8f8f8] py-[6px] pl-[6px] pr-[10px] text-[14px] tracking-[-0.56px] text-[#454545]"
    >
      Skip
    </button>
  );
}

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-dote text-[28px] font-medium tracking-[-0.4px] text-[#1c1611]">{title}</h1>
      <p className="text-[15px] leading-[22px] text-[#6e6558]">{sub}</p>
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-[56px] w-full items-center justify-center rounded-[50px] text-[14px] tracking-[0.35px] text-teal-ink transition",
        disabled ? "cursor-not-allowed bg-[#d0ebf1]" : "bg-teal hover:brightness-95"
      )}
    >
      {children}
    </button>
  );
}

/* --------------------------- step 1 ------------------------------- */

function DetailsStep({
  occasion,
  v,
  set,
  onContinue,
}: {
  occasion: string;
  v: {
    title: string;
    category: string;
    location: string;
    dress: string;
    time: string;
    date: string;
    description: string;
  };
  set: {
    setTitle: (s: string) => void;
    setCategory: (s: string) => void;
    setLocation: (s: string) => void;
    setDress: (s: string) => void;
    setTime: (s: string) => void;
    setDate: (s: string) => void;
    setDescription: (s: string) => void;
  };
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col pb-6">
      <StepHeading title="Event Details" sub="Provide the essential details about your event." />

      <div className="mt-6 flex flex-col gap-5">
        <Field label="Title">
          <TitleInput value={v.title} onChange={set.setTitle} />
        </Field>

        <Field label={CATEGORY_LABEL[occasion] ?? "Category"}>
          <SelectInput
            value={v.category}
            onChange={set.setCategory}
            placeholder="select"
            options={categoryOptionsFor(occasion)}
          />
        </Field>

        <Field label="Venue" optional>
          <TextInput value={v.location} onChange={set.setLocation} placeholder="Event address" />
        </Field>

        <Field label="Dress code">
          <TextInput value={v.dress} onChange={set.setDress} placeholder="Black & Blue" />
        </Field>

        <Field label="Date">
          <DateField time={v.time} date={v.date} onTime={set.setTime} onDate={set.setDate} />
        </Field>

        <Field label="Description" optional>
          <TextInput
            value={v.description}
            onChange={set.setDescription}
            placeholder="Event description"
          />
        </Field>
      </div>

      <div className="flex-1" />
      <div className="py-6">
        <PrimaryButton disabled={!v.title.trim()} onClick={onContinue}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[14px]">
      <label className="text-[14px] font-medium tracking-[-0.66px] text-[#221a10]">
        {label}
        {optional && <span className="text-[#919191]"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

// The event category options for an occasion (shared mobile + desktop).
function categoryOptionsFor(occasion: string): string[] {
  return occasion === "wedding"
    ? ["White wedding", "Traditional", "Civil / court", "Introduction"]
    : occasion === "birthday"
    ? ["Milestone birthday", "Kids party", "Surprise party"]
    : ["Baby shower", "Naming ceremony", "Gender reveal"];
}

// The time + date field box, reused on mobile and desktop.
function DateField({
  time,
  date,
  onTime,
  onDate,
}: {
  time: string;
  date: string;
  onTime: (s: string) => void;
  onDate: (s: string) => void;
}) {
  const dateRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex h-[64px] w-full items-center justify-between gap-2 rounded-[16px] border border-[#e8f1f3] bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <TimePicker value={time} onChange={onTime} />
        <span className="h-[22px] w-px shrink-0 bg-[#e8e8e8]" />
        <input
          ref={dateRef}
          type="date"
          value={date}
          onChange={(e) => onDate(e.target.value)}
          aria-label="Date"
          className="min-w-0 bg-transparent font-dote-input text-[15px] text-[#1a1a1a] outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:hidden"
        />
      </div>
      <button
        type="button"
        aria-label="Pick date"
        onClick={() => dateRef.current?.showPicker?.()}
        className="shrink-0"
      >
        <CalendarIcon className="size-5 text-[#221a10]" />
      </button>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-[64px] w-full rounded-[16px] border border-[#e8f1f3] bg-white px-4 font-dote-input text-[16px] text-[#1a1a1a] outline-none transition placeholder:text-[#cccccc] focus:border-teal"
    />
  );
}

/** Event title input with a fixed, non-editable "#" so every title is a
 * hashtag. The stored value is "#" + what the host types (empty when blank). */
function TitleInput({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const rest = value.replace(/^#+/, "");
  return (
    <div className="flex h-[64px] w-full items-center rounded-[16px] border border-[#e8f1f3] bg-white px-4 transition focus-within:border-teal">
      <span className="font-dote-input text-[16px] text-[#1a1a1a]">#</span>
      <input
        value={rest}
        onChange={(e) => {
          const r = e.target.value.replace(/^#+/, "");
          onChange(r ? `#${r}` : "");
        }}
        placeholder="tee&tar2026"
        className="ml-0.5 h-full w-full bg-transparent font-dote-input text-[16px] text-[#1a1a1a] outline-none placeholder:text-[#cccccc]"
      />
    </div>
  );
}

// 12-hour time control (hour · minute · AM/PM). Stores a 24h "HH:MM" string
// so the preview formatter stays simple; always shows the meridiem.
function TimePicker({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const has = Boolean(value);
  const [H, M] = has ? value.split(":").map(Number) : [0, 0];
  const mer: "AM" | "PM" | "" = has ? (H >= 12 ? "PM" : "AM") : "";
  const h12 = has ? String(H % 12 || 12) : "";
  const mm = has ? String(M).padStart(2, "0") : "";

  function build(h: string, m: string, md: "AM" | "PM"): string {
    if (!h) return "";
    let hh = Number(h) % 12;
    if (md === "PM") hh += 12;
    return `${String(hh).padStart(2, "0")}:${m || "00"}`;
  }

  const selectCls =
    "appearance-none bg-transparent font-dote-input text-[16px] outline-none";

  return (
    <div className="flex items-center gap-[2px]">
      <select
        aria-label="Hour"
        value={h12}
        onChange={(e) => onChange(build(e.target.value, mm, mer || "AM"))}
        className={cn(selectCls, h12 ? "text-[#1a1a1a]" : "text-[#cccccc]")}
      >
        <option value="" disabled>
          --
        </option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className={has ? "text-[#1a1a1a]" : "text-[#cccccc]"}>:</span>
      <select
        aria-label="Minute"
        value={mm}
        onChange={(e) => onChange(build(h12 || "12", e.target.value, mer || "AM"))}
        className={cn(selectCls, mm ? "text-[#1a1a1a]" : "text-[#cccccc]")}
      >
        <option value="" disabled>
          00
        </option>
        {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <div className="ml-1 flex rounded-[8px] bg-[#f3f3f3] p-[2px]">
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(build(h12 || "12", mm, p))}
            className={cn(
              "rounded-[6px] px-[8px] py-[2px] text-[12px] font-medium transition",
              mer === p ? "bg-white text-teal shadow-sm" : "text-[#9a9a9a]"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-[64px] w-full appearance-none rounded-[16px] border border-[#e8f1f3] bg-white px-4 pr-11 font-dote-input text-[16px] outline-none transition focus:border-teal",
          value ? "text-[#1a1a1a]" : "text-[#cccccc]"
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="text-[#1a1a1a]">
            {o}
          </option>
        ))}
      </select>
      <Chevron className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#221a10]" />
    </div>
  );
}

/* --------------------------- step 2 ------------------------------- */

function UploadStep({
  photos,
  setPhotos,
  onContinue,
}: {
  photos: string[];
  setPhotos: (p: string[]) => void;
  onContinue: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(0);

  function onFiles(files: FileList | null) {
    if (!files) return;
    const urls = Array.from(files)
      .slice(0, 12 - photos.length)
      .map((f) => URL.createObjectURL(f));
    if (!urls.length) return;
    const next = [...photos, ...urls];
    setPhotos(next);
    setActive(next.length - 1); // newest fills the big card
  }

  function removeActive() {
    const next = photos.filter((_, i) => i !== active);
    setPhotos(next);
    setActive((a) => Math.max(0, Math.min(a, next.length - 1)));
  }
  // The cover photo is simply the first in the list; "Set as cover" moves the
  // active photo to the front so it heads the gallery and becomes the hero.
  function setAsCover() {
    if (active === 0) return;
    const next = [photos[active], ...photos.filter((_, i) => i !== active)];
    setPhotos(next);
    setActive(0);
  }

  const hasPhotos = photos.length > 0;

  return (
    <div className="flex flex-1 flex-col pb-6">
      <StepHeading
        title="Upload Images"
        sub="Upload up to 12 high-quality photos to share with your friends, well wishers and family."
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="mt-[30px] flex-1">
        {!hasPhotos ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[385px] w-full flex-col items-center justify-center gap-[6px] rounded-[20px] border border-dashed border-[#b3b3b3] bg-white"
          >
            <span className="grid place-items-center rounded-[12px] bg-black p-2">
              <AddSquareIcon className="size-4 text-white" />
            </span>
            <span className="text-[12px] font-medium text-[#0f0f0f]">Add photo</span>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* big card, the active photo */}
            <div className="relative h-[445px] w-full overflow-hidden rounded-[20px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[active]}
                alt={`Photo ${active + 1}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={removeActive}
                aria-label="Remove photo"
                className="absolute left-5 top-5 grid size-9 place-items-center rounded-[10px] border-[0.5px] border-[#bc1b06] bg-white"
              >
                <TrashIcon className="size-5 text-[#bc1b06]" />
              </button>
              {active === 0 ? (
                <span className="absolute right-5 top-5 flex items-center gap-1 rounded-[10px] bg-teal px-3 py-[7px] text-[12px] font-medium text-teal-ink">
                  <StarIcon className="size-[14px]" filled /> Cover photo
                </span>
              ) : (
                <button
                  type="button"
                  onClick={setAsCover}
                  className="absolute right-5 top-5 flex items-center gap-1 rounded-[10px] bg-white/95 px-3 py-[7px] text-[12px] font-medium text-teal shadow-sm"
                >
                  <StarIcon className="size-[14px]" /> Set as cover
                </button>
              )}
            </div>

            {/* thumbnail strip, tap to enlarge; active one carries the dot, cover a star */}
            <div className="flex flex-wrap items-start justify-center gap-[10px]">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === active}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="relative block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className={cn(
                        "size-[42px] rounded-[8px] object-cover transition",
                        i === active ? "ring-2 ring-[#f19026]" : "opacity-90"
                      )}
                    />
                    {i === 0 && (
                      <span className="absolute -left-1 -top-1 grid size-[18px] place-items-center rounded-full bg-teal text-teal-ink">
                        <StarIcon className="size-[10px]" filled />
                      </span>
                    )}
                  </span>
                  <span className="h-[6px]">
                    {i === active && (
                      <span className="block size-[6px] rounded-full bg-[#f19026]" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[14px] py-6">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={photos.length >= 12}
          className="flex h-[56px] w-full items-center justify-center rounded-[50px] border border-[#7f7f7f] bg-black text-[14px] tracking-[0.35px] text-teal-ink disabled:opacity-40"
        >
          Upload Image
        </button>
        <PrimaryButton disabled={photos.length === 0} onClick={onContinue}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

/* --------------------------- step 3 ------------------------------- */

const PREVIEW_ROWS = [
  { name: "Car", emoji: "🚗", amount: "₦26,900,000", color: "#f19026", w: 72 },
  { name: "Vacation", emoji: "✈️", amount: "₦7,200,000", color: "#f72d99", w: 38 },
  { name: "Gift", emoji: "🎁", amount: "₦12,000,000", color: "#9a4cee", w: 118 },
  { name: "Cash", emoji: "💵", amount: "₦104,780,000", color: "#16c710", w: 144 },
  { name: "Car", emoji: "🚗", amount: "₦26,900,000", color: "#f19026", w: 72 },
];

function WishlistStep({
  items,
  onAdd,
  onEdit,
  onContinue,
}: {
  items: WishItem[];
  onAdd: () => void;
  onEdit: (it: WishItem) => void;
  onContinue: () => void;
}) {
  const empty = items.length === 0;

  return (
    <div className="flex flex-1 flex-col pb-6">
      {empty ? (
        <div className="relative flex flex-1 flex-col items-center">
          {/* faded preview card */}
          <div className="relative mt-[18px] w-[266px]">
            <div className="flex flex-col gap-6 rounded-[24px] bg-white px-7 py-[30px]">
              {PREVIEW_ROWS.map((r, i) => (
                <div key={i} className="flex flex-col gap-[6px]">
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col gap-[2px]">
                      <span className="text-[12px] font-medium tracking-[-0.66px] text-[#221a10]">
                        {r.name}
                      </span>
                      <span className="text-[16px] leading-none">{r.emoji}</span>
                    </div>
                    <div className="flex flex-col items-end gap-[7px] text-[#221a10]">
                      <span className="text-[8px]">Total received</span>
                      <span className="text-[12px] font-medium">{r.amount}</span>
                    </div>
                  </div>
                  <div className="h-[2px] w-full rounded-[3px] bg-[#d9d9d9]">
                    <div
                      className="h-[2px] rounded-[3px]"
                      style={{ width: r.w, background: r.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* scrim fading the preview */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-full"
              style={{
                background:
                  "linear-gradient(to top, #f9fbfe 20%, rgba(249,246,253,0.4) 64%, rgba(248,247,255,0) 77%)",
              }}
            />
          </div>

          <div className="mt-5 flex flex-col items-center gap-2">
            <h1 className="font-dote text-[24px] font-medium tracking-[-0.4px] text-[#1c1611]">
              A List of Little Wishes
            </h1>
            <p className="w-[290px] text-center text-[14px] leading-[18px] text-[#6e6558]">
              Add gifts, cash wishes, or contributions you&rsquo;d love to receive. Your loved ones
              can choose how they&rsquo;d like to celebrate you.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <StepHeading
            title="A List of Little Wishes"
            sub="Add as many wishes as you like. Your loved ones can contribute to any of them."
          />
          <div className="mt-6 flex flex-col gap-3">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onEdit(it)}
                aria-label={`Edit ${it.name}`}
                className="flex w-full items-center justify-between rounded-[16px] border border-[#e8f1f3] bg-white px-4 py-3 text-left transition hover:border-teal/50 hover:bg-[#fbfdfe]"
              >
                <div className="flex items-center gap-3">
                  <WishThumb item={it} />
                  <div>
                    <p className="text-[14px] font-medium text-[#1c1611]">{it.name}</p>
                    <p className="text-[12px] text-[#6e6558]">
                      {it.type === "monetary"
                        ? it.anyAmount
                          ? "Cash · any amount"
                          : `Cash · ₦${it.amount.toLocaleString()}`
                        : it.anyAmount
                        ? "Gift · any amount"
                        : `Gift · ₦${it.amount.toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-[#c4c4c4]" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-[#9fd0da] bg-[#f2fbfd] text-[14px] font-medium text-teal"
          >
            <AddSquareIcon className="size-[18px] text-teal" /> Add another wish
          </button>
          <div className="flex-1" />
        </div>
      )}

      <div className="py-6">
        <PrimaryButton onClick={empty ? onAdd : onContinue}>
          {empty ? "Create wishlist" : "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* --------------------------- step 4 ------------------------------- */

const OCC_META: Record<
  string,
  { label: string; chipBg: string; chipText: string; cover: string }
> = {
  wedding: {
    label: "Wedding",
    chipBg: "#e6f7fd",
    chipText: "#00697f",
    cover: "linear-gradient(135deg, #7EDFFF 0%, #00829f 100%)",
  },
  birthday: {
    label: "Birthday",
    chipBg: "#eefce3",
    chipText: "#3b6d11",
    cover: "linear-gradient(135deg, #B3FF84 0%, #63991e 100%)",
  },
  baby: {
    label: "Baby shower",
    chipBg: "#fdeaf9",
    chipText: "#99335a",
    cover: "linear-gradient(135deg, #FFB2FB 0%, #d4537e 100%)",
  },
};

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

function formatTime(t: string): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return m ? `${h}:${mStr}${ampm}` : `${h}${ampm}`;
}

type PreviewData = {
  occasion: string;
  title: string;
  location: string;
  dress: string;
  time: string;
  date: string;
  description: string;
  photos: string[];
  items: WishItem[];
};

function PreviewStep({
  data,
  editMode,
  onPublish,
  onBack,
}: {
  data: PreviewData;
  editMode?: boolean;
  onPublish: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col pb-6">
      <StepHeading
        title="Preview"
        sub={
          editMode
            ? "Review your changes before saving them to your celebration."
            : "This is how your celebration will look to the people you invite."
        }
      />

      <div className="mt-6 flex-1">
        <PreviewCard data={data} />
      </div>

      <div className="flex flex-col gap-2 py-6">
        <PrimaryButton onClick={onPublish}>{editMode ? "Save changes" : "Publish celebration"}</PrimaryButton>
        <button
          type="button"
          onClick={onBack}
          className="h-[48px] text-[14px] font-medium text-[#6e6558] transition hover:text-[#1c1611]"
        >
          Back to edit
        </button>
      </div>
    </div>
  );
}

function PreviewCard({ data }: { data: PreviewData }) {
  const occ = OCC_META[data.occasion] ?? OCC_META.wedding;
  const cover = data.photos[0];
  const when = [formatDate(data.date), formatTime(data.time)].filter(Boolean).join(" · ");

  return (
    <div className="overflow-hidden rounded-[26px] border border-[#e8f1f3] bg-white shadow-[0_18px_40px_-24px_rgba(0,60,73,0.35)]">
          {/* cover */}
          <div className="relative h-[184px]" style={cover ? undefined : { background: occ.cover }}>
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 62%)" }}
            />
            <span className="absolute right-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              Preview
            </span>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-[6px] p-5">
              <span
                className="w-fit rounded-full px-[10px] py-1 text-[11px] font-medium"
                style={{ background: occ.chipBg, color: occ.chipText }}
              >
                {occ.label}
              </span>
              <h2 className="font-dote text-[22px] font-medium leading-tight text-white">
                {data.title || "Your celebration"}
              </h2>
            </div>
          </div>

          {/* body */}
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-[10px] text-[13px] text-[#4a4a4a]">
              {when && (
                <div className="flex items-center gap-[10px]">
                  <CalendarIcon className="size-[18px] shrink-0 text-teal" />
                  <span>{when}</span>
                </div>
              )}
              {data.location && (
                <div className="flex items-center gap-[10px]">
                  <PinIcon className="size-[18px] shrink-0 text-teal" />
                  <span>{data.location}</span>
                </div>
              )}
              {data.dress && (
                <div className="flex items-center gap-[10px]">
                  <ShirtIcon className="size-[18px] shrink-0 text-teal" />
                  <span>Dress code · {data.dress}</span>
                </div>
              )}
            </div>

            {data.description && (
              <p className="text-[13px] leading-[20px] text-[#6e6558]">{data.description}</p>
            )}

            <div className="border-t border-[#eef2f3] pt-4">
              <p className="text-[13px] font-semibold text-[#1a1a1a]">
                Wishes{data.items.length > 0 && ` (${data.items.length})`}
              </p>
              {data.items.length === 0 ? (
                <p className="mt-2 text-[12px] text-[#9a9a9a]">
                  No wishes yet, guests will still be able to send a cash gift.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-[10px]">
                  {data.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between rounded-[16px] border border-[#eef2f3] bg-[#fbfdfe] px-3 py-[10px]"
                    >
                      <div className="flex items-center gap-3">
                        <WishThumb item={it} elevated />
                        <div>
                          <p className="text-[14px] font-medium text-[#1c1611]">{it.name}</p>
                          <p className="text-[12px] text-[#6e6558]">
                            {it.anyAmount ? "Any amount" : `₦${it.amount.toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-teal/10 px-3 py-[6px] text-[12px] font-medium text-teal">
                        Gift
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
  );
}

// A wish's icon: the uploaded photo for physical gifts, else the emoji tile.
function WishThumb({ item, elevated }: { item: WishItem; elevated?: boolean }) {
  if (item.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.image}
        alt={item.name}
        className="size-10 shrink-0 rounded-[12px] object-cover"
      />
    );
  }
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-[12px] text-[18px]",
        elevated ? "bg-white shadow-[0_2px_8px_-4px_rgba(0,0,0,0.25)]" : "bg-[#f3fbfd]"
      )}
    >
      {item.emoji}
    </span>
  );
}

/* ----------------------- add wishlist sheet ----------------------- */

const QUICK = [5000, 10000, 25000, 50000];

// Pick an illustration from the gift name. Falls back to the gift box.
const GIFT_EMOJI: ReadonlyArray<readonly [RegExp, string]> = [
  [/car|auto|vehicle|benz|toyota|lexus|jeep|ride\b/i, "🚗"],
  [/trip|vacation|holiday|honeymoon|travel|flight|getaway|cruise/i, "✈️"],
  [/ring|engage|jewel|necklace|earring|bracelet|diamond|gold/i, "💍"],
  [/watch|rolex/i, "⌚"],
  [/phone|iphone|samsung|android|smartphone|pixel/i, "📱"],
  [/laptop|macbook|computer|\bpc\b|desktop/i, "💻"],
  [/\btv\b|television|screen|monitor/i, "📺"],
  [/camera|canon|nikon|gopro/i, "📷"],
  [/house|home|apartment|rent|land|property|plot/i, "🏠"],
  [/furniture|chair|sofa|couch|table|\bbed\b|wardrobe/i, "🛋️"],
  [/mixer|blender|kitchen|cook|oven|microwave|\bpot\b|\bpan\b|cookware|fridge|freezer/i, "🍳"],
  [/baby|crib|stroller|diaper|\bcot\b|nursery|pram/i, "🍼"],
  [/book|novel|read/i, "📚"],
  [/wine|champagne|drink|\bbar\b|whisky|liquor/i, "🍷"],
  [/cake|dessert|pastr/i, "🎂"],
  [/flower|bouquet|\brose/i, "💐"],
  [/shoe|sneaker|heels|\bboot/i, "👟"],
  [/bag|handbag|purse|luggage|suitcase/i, "👜"],
  [/perfume|fragrance|scent|cologne/i, "🧴"],
  [/music|speaker|headphone|earbud|airpod|sound/i, "🎧"],
  [/game|console|playstation|xbox|\bps5\b|nintendo/i, "🎮"],
  [/cash|money|fund|contribution|donate|support|savings/i, "💵"],
  [/gift|voucher|card|hamper/i, "🎁"],
];

function emojiForGift(name: string, type: GiftType): string {
  if (type === "monetary") return "💵";
  const match = GIFT_EMOJI.find(([re]) => re.test(name));
  return match ? match[1] : "🎁"; // the box fallback
}

/** A store link is optional. If given it must be a usable URL: returns the
 * normalized link (with protocol) when valid, "" for no link, or null when the
 * text isn't a real link (so the host is flagged and can't proceed). */
function normalizeStoreLink(raw: string): string | null {
  const t = raw.trim();
  if (!t) return "";
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    // Require a real dotted hostname so "shop" or "not a link" is rejected.
    if (!u.hostname.includes(".") || u.hostname.startsWith(".") || u.hostname.endsWith(".")) {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

function AddWishlistSheet({
  editing,
  onClose,
  onSubmit,
  onDelete,
}: {
  editing: WishItem | null;
  onClose: () => void;
  onSubmit: (item: WishItem) => void;
  onDelete?: () => void;
}) {
  const [giftType, setGiftType] = useState<GiftType>(editing?.type ?? "monetary");
  const [name, setName] = useState(editing?.type === "physical" ? editing.name : "");
  const [image, setImage] = useState<string | null>(editing?.image ?? null);
  const [link, setLink] = useState(editing?.link ?? "");
  const [anyAmount, setAnyAmount] = useState(editing?.anyAmount ?? false);
  const [amount, setAmount] = useState(editing?.amount ?? 1000000);
  const [hideContrib, setHideContrib] = useState(editing?.hideContrib ?? false);
  const [hideTotal, setHideTotal] = useState(editing?.hideTotal ?? false);
  const imgRef = useRef<HTMLInputElement | null>(null);

  // Validate the optional store link. null ⇒ the text isn't a real URL.
  const normalizedLink = giftType === "physical" ? normalizeStoreLink(link) : "";
  const linkInvalid = normalizedLink === null;

  function submit() {
    if (linkInvalid) return; // flagged below; can't proceed
    const finalName = giftType === "physical" ? name.trim() || "Gift" : "Cash gift";
    onSubmit({
      id: editing?.id ?? Math.random().toString(36).slice(2),
      type: giftType,
      name: finalName,
      emoji: emojiForGift(finalName, giftType),
      image: giftType === "physical" ? image : null,
      link: giftType === "physical" ? (normalizedLink || "") : "",
      anyAmount,
      amount,
      hideContrib,
      hideTotal,
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center lg:items-stretch lg:justify-end">
      <div
        className="absolute inset-0 bg-black/[0.54] lg:bg-black/[0.03] lg:backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-[402px] flex-col overflow-hidden rounded-t-[26px] bg-white px-6 pb-8 pt-3 lg:h-full lg:max-h-none lg:max-w-[413px] lg:rounded-none lg:px-6 lg:pt-7">
        <div className="mx-auto h-[5px] w-11 rounded-[3px] bg-[#e6e6e6] lg:hidden" />

        <div className="mt-3 flex items-start justify-between">
          <h2 className="font-dote text-[20px] font-medium tracking-[-1px] text-black">
            {editing ? "Edit Wishlist Item" : "Add Wishlist Item"}
          </h2>
          <div className="flex items-center gap-4">
            {editing && onDelete && (
              <button type="button" onClick={onDelete} aria-label="Remove item">
                <TrashIcon className="size-[18px] text-[#bc1b06]" />
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close">
              <CloseIcon className="size-4 text-black" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto">
          <SectionLabel>Gifting Category</SectionLabel>

          <div className="mt-5 flex flex-col gap-[18px]">
            <Field label="Gift type">
              <div className="relative">
                <select
                  value={giftType}
                  onChange={(e) => setGiftType(e.target.value as GiftType)}
                  className="h-[64px] w-full appearance-none rounded-[16px] border border-[#e8f1f3] bg-white px-4 pr-11 font-dote-input text-[16px] text-[#1a1a1a] outline-none focus:border-teal"
                >
                  <option value="monetary">Monetary gift</option>
                  <option value="physical">Physical gift</option>
                </select>
                <Chevron className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#221a10]" />
              </div>
            </Field>

            {giftType === "physical" && (
              <div className="flex flex-col gap-[10px]">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What gift?"
                  className="h-[64px] w-full rounded-[16px] border border-[#e8f1f3] bg-white px-4 font-dote-input text-[16px] text-[#1a1a1a] outline-none placeholder:text-[#c3c3c3] focus:border-teal"
                />
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setImage(URL.createObjectURL(f));
                  }}
                />
                <button
                  type="button"
                  onClick={() => imgRef.current?.click()}
                  className={cn(
                    "relative flex h-[140px] w-full items-center justify-center overflow-hidden rounded-[20px]",
                    image
                      ? "border border-[#e8f1f3]"
                      : "border-[1.5px] border-dashed border-[#d2d2d2] bg-[#f9f9f9]"
                  )}
                >
                  {image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      <span className="absolute bottom-2 right-2 flex items-center gap-[6px] rounded-[10px] bg-black/60 px-[10px] py-[6px] text-[12px] text-white backdrop-blur-sm">
                        <GalleryIcon className="size-4 text-white" />
                        Change
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-[10px] rounded-[12px] bg-black p-[10px]">
                      <GalleryIcon className="size-5 text-white" />
                      <span className="text-[14px] text-white">Upload gift image</span>
                    </span>
                  )}
                </button>
                {/* Optional vendor/store link so guests can find where to buy it */}
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  type="url"
                  inputMode="url"
                  aria-invalid={linkInvalid}
                  placeholder="Link to store (optional)"
                  className={cn(
                    "h-[64px] w-full rounded-[16px] border bg-white px-4 font-dote-input text-[16px] text-[#1a1a1a] outline-none placeholder:text-[#c3c3c3]",
                    linkInvalid ? "border-[#e12525] focus:border-[#e12525]" : "border-[#e8f1f3] focus:border-teal"
                  )}
                />
                {linkInvalid && (
                  <p className="px-1 text-[13px] text-[#e12525]">
                    Enter a valid store link, e.g. https://store.com/item.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-[10px]">
              <ToggleRow
                label="Any amount"
                on={anyAmount}
                onChange={setAnyAmount}
              />
              {!anyAmount && (
                <div className="rounded-[16px] border border-[#b2d1d8] bg-white p-4">
                  <div className="flex items-start justify-between">
                    <span className="text-[12px] tracking-[0.2px] text-[#292929]">AMOUNT</span>
                    <span className="flex items-center gap-1 text-[10px] text-[#737373]">
                      <span>Min ₦500</span>
                      <span>·</span>
                      <span>Max ₦2,000,000</span>
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-[2px]">
                    <span className="text-[26px] font-semibold leading-none text-[#0e0e0e]">₦</span>
                    <input
                      inputMode="numeric"
                      value={amount.toLocaleString()}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(/[^\d]/g, ""));
                        setAmount(Math.min(2000000, n || 0));
                      }}
                      className="w-full bg-transparent text-[26px] font-semibold leading-none text-[#0e0e0e] outline-none"
                    />
                  </div>
                  <div className="mt-[18px] flex gap-[11px]">
                    {QUICK.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(q)}
                        className="rounded-[10px] border border-[#e5e5e5] bg-[#f5f5f5] px-[7px] py-[6px] text-[12px] font-medium tracking-[0.2px] text-[#141414]"
                      >
                        ₦{q.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <SectionLabel>Contribution privacy</SectionLabel>
            <div className="mt-4 flex flex-col gap-4">
              <ToggleRow
                label="Hide contribution amounts"
                sub="Others won't see how much each person contributed."
                on={hideContrib}
                onChange={setHideContrib}
              />
              <ToggleRow
                label="Hide total contributions"
                sub="Others won't see the total amount raised."
                on={hideTotal}
                onChange={setHideTotal}
              />
            </div>
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton onClick={submit} disabled={linkInvalid}>
            {editing ? "Save changes" : "Add to wishlist"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[6px]">
      <span className="h-[13px] w-1 rounded-[2px] bg-teal" />
      <span className="text-[16px] font-semibold text-[#1a1a1a]">{children}</span>
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  on,
  onChange,
}: {
  label: string;
  sub?: string;
  on: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-1 text-[#1c1611]">
        <span className="text-[14px] font-medium tracking-[-0.28px]">{label}</span>
        {sub && <span className="text-[12px] tracking-[-0.24px]">{sub}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={cn(
          "flex w-10 items-center rounded-full p-[2px] transition",
          on ? "justify-end bg-[#06aacf]" : "justify-start bg-[#dedede]"
        )}
      >
        <span className="size-4 rounded-full bg-white" />
      </button>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/55 backdrop-blur-sm">
      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-teal/25 border-t-teal" />
      <span className="text-[14px] font-medium text-teal">Loading&hellip;</span>
    </div>
  );
}

/* =========================== DESKTOP =========================== */

const STEP_CRUMB: Record<Step, string> = {
  details: "Event Details",
  upload: "Upload Images",
  wishlist: "Wishlist",
  preview: "Preview",
};

function DesktopTopBar({
  step,
  sheetOpen,
  editMode,
  onStep,
  onNew,
  onCloseSheet,
}: {
  step: Step;
  sheetOpen: boolean;
  editMode?: boolean;
  onStep: (s: Step) => void;
  onNew: () => void;
  onCloseSheet: () => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    setName(getSession().name || "");
  }, []);
  const stepIdx = STEPS.indexOf(step);
  // Breadcrumb trail: (Edit event | New) › every step up to the current one › (Add item).
  const crumbs: { label: string; onClick: () => void }[] = [
    { label: editMode ? "Edit event details" : "New", onClick: onNew },
  ];
  STEPS.slice(0, stepIdx + 1).forEach((s) =>
    crumbs.push({ label: STEP_CRUMB[s], onClick: () => onStep(s) })
  );
  if (sheetOpen) crumbs.push({ label: "Add item", onClick: onCloseSheet });

  return (
    <header className="flex h-[89px] shrink-0 items-center border-b border-[#bdcfd3] bg-[#f6f6f6]/50">
      <div className="flex w-[251px] shrink-0 items-center justify-between px-6">
        <DoteLogo />
        <MaximizeIcon className="size-[22px] text-[#9a9a9a]" />
      </div>
      <div className="flex flex-1 items-center justify-between pl-7 pr-6">
        <nav className="flex items-center gap-2 text-[12px]">
          {crumbs.map((c, i) => {
            const current = i === crumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <Chevron className="size-[10px] -rotate-90 text-[#c4c4c4]" />}
                <button
                  type="button"
                  onClick={c.onClick}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "transition",
                    current ? "cursor-default text-teal" : "text-[#a3a3a3] hover:text-[#6b6b6b] hover:underline"
                  )}
                >
                  {c.label}
                </button>
              </span>
            );
          })}
        </nav>
        <Link href="/profile" className="flex items-end gap-2 transition hover:opacity-80" aria-label="Settings">
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

const DESK_NAV = [
  { key: "events", label: "Events created", icon: "/dote/sidebar/events.svg", href: "/events" },
  { key: "wallet", label: "Wallet", icon: "/dote/sidebar/wallet.svg", href: "/wallet" },
  { key: "new", label: "New celebration", icon: "/dote/sidebar/new.svg", href: "/create" },
  { key: "invites", label: "Invites received", icon: "/dote/sidebar/invites.svg", href: "/invites" },
  { key: "notification", label: "Notification", icon: "/dote/sidebar/notification.svg", href: "/notifications" },
  { key: "settings", label: "Settings", icon: "/dote/sidebar/settings.svg", href: "/profile" },
] as const;

function DesktopSidebar({ editMode }: { editMode?: boolean }) {
  // Editing lives under "Events created"; the create flow highlights "New celebration".
  const activeKey = editMode ? "events" : "new";
  return (
    <aside className="flex w-[251px] shrink-0 flex-col overflow-y-auto border-r border-[#bdcfd3] px-6 pt-[42px]">
      <p className="text-[16px] font-medium tracking-[-0.66px] text-[#878787]">Menu</p>
      <nav className="mt-6 flex flex-col">
        {DESK_NAV.map((item) => {
          const active = item.key === activeKey;
          return (
          <Link
            key={item.key}
            href={"href" in item ? (item.href as string) : "#"}
            className={cn(
              "flex items-center gap-3 whitespace-nowrap text-[12px] font-medium",
              active
                ? "w-fit rounded-[18px] bg-teal py-[10px] pl-[18px] pr-16 text-white"
                : "px-[18px] py-4 text-[#616161]"
            )}
          >
            {active ? (
              // active: filled icon in white on the teal pill
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

function DesktopHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-[6px] text-center">
      <h1 className="font-dote text-[42px] font-medium leading-tight tracking-[-0.66px] text-black">
        {title}
      </h1>
      <p className="max-w-[520px] text-[18px] leading-[26px] text-[#5c5c5c]">{sub}</p>
    </div>
  );
}

function DesktopDetails({
  occasion,
  v,
  set,
  onContinue,
}: {
  occasion: string;
  v: {
    title: string;
    category: string;
    location: string;
    dress: string;
    time: string;
    date: string;
    description: string;
  };
  set: {
    setTitle: (s: string) => void;
    setCategory: (s: string) => void;
    setLocation: (s: string) => void;
    setDress: (s: string) => void;
    setTime: (s: string) => void;
    setDate: (s: string) => void;
    setDescription: (s: string) => void;
  };
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-12">
      <DesktopHeading title="Event Details" sub="Provide the essential details about your event." />
      <div className="grid grid-cols-2 gap-x-7 gap-y-5">
        <Field label="Title">
          <TitleInput value={v.title} onChange={set.setTitle} />
        </Field>
        <Field label={CATEGORY_LABEL[occasion] ?? "Category"}>
          <SelectInput
            value={v.category}
            onChange={set.setCategory}
            placeholder="select"
            options={categoryOptionsFor(occasion)}
          />
        </Field>
        <Field label="Venue" optional>
          <TextInput value={v.location} onChange={set.setLocation} placeholder="Event address" />
        </Field>
        <Field label="Dress code">
          <TextInput value={v.dress} onChange={set.setDress} placeholder="Black & Blue" />
        </Field>
        <Field label="Date">
          <DateField time={v.time} date={v.date} onTime={set.setTime} onDate={set.setDate} />
        </Field>
        <Field label="Description" optional>
          <TextInput value={v.description} onChange={set.setDescription} placeholder="Event description" />
        </Field>
      </div>
      <PrimaryButton disabled={!v.title.trim()} onClick={onContinue}>
        Continue
      </PrimaryButton>
    </div>
  );
}

function DesktopUpload({
  photos,
  setPhotos,
  onContinue,
}: {
  photos: string[];
  setPhotos: (p: string[]) => void;
  onContinue: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(0);

  function onFiles(files: FileList | null) {
    if (!files) return;
    const urls = Array.from(files)
      .slice(0, 12 - photos.length)
      .map((f) => URL.createObjectURL(f));
    if (!urls.length) return;
    const next = [...photos, ...urls];
    setPhotos(next);
    setActive(next.length - 1);
  }
  function removeActive() {
    const next = photos.filter((_, i) => i !== active);
    setPhotos(next);
    setActive((a) => Math.max(0, Math.min(a, next.length - 1)));
  }
  function setAsCover() {
    if (active === 0) return;
    const next = [photos[active], ...photos.filter((_, i) => i !== active)];
    setPhotos(next);
    setActive(0);
  }

  return (
    <div className="flex flex-col items-center gap-12">
      <DesktopHeading
        title="Upload Image"
        sub="Upload up to 12 high-quality photos to share with your friends, well wishers and family."
      />
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />

      <div className="flex w-full flex-col items-center gap-3">
        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-[329px] w-[640px] max-w-full flex-col items-center justify-center gap-[6px] rounded-[20px] border border-dashed border-[#b3b3b3] bg-white"
          >
            <span className="grid place-items-center rounded-[12px] bg-black p-2">
              <AddSquareIcon className="size-4 text-white" />
            </span>
            <span className="text-[12px] font-medium text-[#0f0f0f]">Add photo</span>
          </button>
        ) : (
          <>
            <div className="relative h-[329px] w-[640px] max-w-full overflow-hidden rounded-[20px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[active]} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <button
                type="button"
                onClick={removeActive}
                aria-label="Remove photo"
                className="absolute left-5 top-5 grid size-9 place-items-center rounded-[10px] border-[0.5px] border-[#bc1b06] bg-white"
              >
                <TrashIcon className="size-5 text-[#bc1b06]" />
              </button>
              {active === 0 ? (
                <span className="absolute right-5 top-5 flex items-center gap-1 rounded-[10px] bg-teal px-3 py-[7px] text-[12px] font-medium text-teal-ink">
                  <StarIcon className="size-[14px]" filled /> Cover photo
                </span>
              ) : (
                <button
                  type="button"
                  onClick={setAsCover}
                  className="absolute right-5 top-5 flex items-center gap-1 rounded-[10px] bg-white/95 px-3 py-[7px] text-[12px] font-medium text-teal shadow-sm transition hover:bg-white"
                >
                  <StarIcon className="size-[14px]" /> Set as cover
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-start justify-center gap-[10px]">
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="relative block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className={cn(
                        "size-[42px] rounded-[8px] object-cover",
                        i === active ? "ring-2 ring-[#f19026]" : "opacity-90"
                      )}
                    />
                    {i === 0 && (
                      <span className="absolute -left-1 -top-1 grid size-[18px] place-items-center rounded-full bg-teal text-teal-ink">
                        <StarIcon className="size-[10px]" filled />
                      </span>
                    )}
                  </span>
                  <span className="h-[6px]">
                    {i === active && <span className="block size-[6px] rounded-full bg-[#f19026]" />}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex w-full gap-[10px]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={photos.length >= 12}
          className="flex h-[56px] flex-1 items-center justify-center rounded-[50px] border border-[#7f7f7f] bg-black text-[14px] tracking-[0.35px] text-teal-ink disabled:opacity-40"
        >
          Upload image
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={photos.length === 0}
          className={cn(
            "flex h-[56px] flex-1 items-center justify-center rounded-[50px] text-[14px] tracking-[0.35px] text-teal-ink transition",
            photos.length === 0 ? "cursor-not-allowed bg-[#d0ebf1]" : "bg-teal hover:brightness-95"
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function DesktopWishlist({
  items,
  onAdd,
  onEdit,
  onContinue,
}: {
  items: WishItem[];
  onAdd: () => void;
  onEdit: (it: WishItem) => void;
  onContinue: () => void;
}) {
  const empty = items.length === 0;
  return (
    <div className="flex flex-col items-center gap-7">
      {empty ? (
        <div className="relative flex flex-col items-center">
          <div className="relative w-[478px] max-w-full">
            <div className="flex flex-col gap-6 rounded-[24px] bg-white px-7 py-[30px]">
              {PREVIEW_ROWS.map((r, i) => (
                <div key={i} className="flex flex-col gap-[6px]">
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col gap-[2px]">
                      <span className="text-[12px] font-medium tracking-[-0.66px] text-[#221a10]">{r.name}</span>
                      <span className="text-[16px] leading-none">{r.emoji}</span>
                    </div>
                    <div className="flex flex-col items-end gap-[7px] text-[#221a10]">
                      <span className="text-[8px]">Total received</span>
                      <span className="text-[12px] font-medium">{r.amount}</span>
                    </div>
                  </div>
                  <div className="h-[2px] w-full rounded-[3px] bg-[#d9d9d9]">
                    <div className="h-[2px] rounded-[3px]" style={{ width: r.w, background: r.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-full"
              style={{
                background:
                  "linear-gradient(to top, #f9fbfe 20%, rgba(249,246,253,0.4) 64%, rgba(248,247,255,0) 77%)",
              }}
            />
          </div>
          <div className="mt-2 flex flex-col items-center gap-2">
            <h1 className="font-dote text-[42px] font-medium tracking-[-0.4px] text-[#1c1611]">
              A List of Little Wishes
            </h1>
            <p className="w-[588px] max-w-full text-center text-[18px] leading-[26px] text-[#6e6558]">
              Add gifts, cash wishes, or contributions you&rsquo;d love to receive. Your loved ones can
              choose how they&rsquo;d like to celebrate you.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-[520px] flex-col gap-3">
          <DesktopHeading
            title="A List of Little Wishes"
            sub="Add as many wishes as you like. Your loved ones can contribute to any of them."
          />
          <div className="mt-4 flex flex-col gap-3">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onEdit(it)}
                aria-label={`Edit ${it.name}`}
                className="flex w-full items-center justify-between rounded-[16px] border border-[#e8f1f3] bg-white px-4 py-3 text-left transition hover:border-teal/50 hover:bg-[#fbfdfe]"
              >
                <div className="flex items-center gap-3">
                  <WishThumb item={it} />
                  <div>
                    <p className="text-[14px] font-medium text-[#1c1611]">{it.name}</p>
                    <p className="text-[12px] text-[#6e6558]">
                      {it.type === "monetary"
                        ? it.anyAmount
                          ? "Cash · any amount"
                          : `Cash · ₦${it.amount.toLocaleString()}`
                        : it.anyAmount
                        ? "Gift · any amount"
                        : `Gift · ₦${it.amount.toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-[#c4c4c4]" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-[#9fd0da] bg-[#f2fbfd] text-[14px] font-medium text-teal"
          >
            <AddSquareIcon className="size-[18px] text-teal" /> Add another wish
          </button>
        </div>
      )}
      <div className="w-full max-w-[520px]">
        <PrimaryButton onClick={empty ? onAdd : onContinue}>
          {empty ? "Create wishlist" : "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function DesktopPreview({
  data,
  editMode,
  onPublish,
  onBack,
}: {
  data: PreviewData;
  editMode?: boolean;
  onPublish: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-10">
      <DesktopHeading
        title="Preview"
        sub={
          editMode
            ? "Review your changes before saving them to your celebration."
            : "This is how your celebration will look to the people you invite."
        }
      />
      <div className="w-full">
        <PreviewCard data={data} />
      </div>
      <div className="flex w-full flex-col gap-2">
        <PrimaryButton onClick={onPublish}>{editMode ? "Save changes" : "Publish celebration"}</PrimaryButton>
        <button
          type="button"
          onClick={onBack}
          className="h-[48px] text-[14px] font-medium text-[#6e6558] transition hover:text-[#1c1611]"
        >
          Back to edit
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ icons ----------------------------- */

function MaximizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}


function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="4" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function AddSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 12h8M12 8v8" />
      <path d="M3 9V7a4 4 0 0 1 4-4h2M21 9V7a4 4 0 0 0-4-4h-2M3 15v2a4 4 0 0 0 4 4h2M21 15v2a4 4 0 0 1-4 4h-2" />
    </svg>
  );
}

function GalleryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
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

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.74.99-5.79-4.21-4.1 5.82-.85L12 3.5Z" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ShirtIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3l4 3 4-3 5 4-3 3-2-1v11H8V9L6 10 3 7l5-4Z" />
    </svg>
  );
}
