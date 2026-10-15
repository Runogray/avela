"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { DoteLogo } from "./Logo";
import { BackArrow } from "./BackArrow";
import { getHostEvent, getPublicEvent, hostEventToFlow, publicEventToFlow } from "@/lib/host-events";

/* ------------------------------------------------------------------ *
 * Dote, Gallery (the celebration's photo gallery; reached from the
 * Event Overview "Gallery" button). Figma 14550:15123 (mobile 2-col +
 * desktop 3-col grids, plus a full-screen lightbox). Matches the
 * EventOverview shell: cover hero + centered "Gallery" title + the
 * "Event settings" bar, a black grid band, and a cream thank-you.
 * ------------------------------------------------------------------ */

type StoredEvent = {
  id: string;
  title: string;
  occasion: string;
  cover?: string | null;
  coverPos?: string; // cover focus point (object-position)
  gallery?: string[];
};

const OCC: Record<string, { cover: string }> = {
  wedding: { cover: "linear-gradient(135deg, #7EDFFF 0%, #00829f 100%)" },
  birthday: { cover: "linear-gradient(135deg, #B3FF84 0%, #63991e 100%)" },
  baby: { cover: "linear-gradient(135deg, #FFB2FB 0%, #d4537e 100%)" },
};

const THANKS =
  "We’re overflowing with gratitude. Thank you for your love, your presence, and your generous gift. You help make our celebration everything we dreamed of.";

export function ManageGallery({ id, guest = false }: { id: string; guest?: boolean }) {
  const router = useRouter();
  const [ev, setEv] = useState<StoredEvent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Load the live event from the API, matching the Event Overview page:
      // hosts by id, guests by the invite slug (public, no auth). Fall back to
      // local storage for offline/mock events.
      try {
        if (guest) {
          const e = await getPublicEvent(id);
          if (alive) {
            // Keep the slug as the id so "back" returns to /i/<slug>.
            setEv({ ...publicEventToFlow(e), id });
            setLoaded(true);
          }
        } else {
          const e = await getHostEvent(id);
          if (alive) {
            setEv({ id: e.id, ...hostEventToFlow(e) });
            setLoaded(true);
          }
        }
        return;
      } catch {
        /* fall through to local storage */
      }
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
  }, [id, guest]);

  if (!loaded) return null;
  if (!ev) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FFFEF7] px-6 text-center font-dote">
        <DoteLogo />
        <p className="text-[16px] text-[#6e6558]">We couldn&rsquo;t find that celebration.</p>
        <button
          type="button"
          onClick={() => router.push(guest ? `/i/${id}` : "/events")}
          className="rounded-[50px] bg-teal px-6 py-3 text-[14px] font-medium text-teal-ink"
        >
          {guest ? "Back to the invite" : "Back to Events"}
        </button>
      </div>
    );
  }

  const occ = OCC[ev.occasion] ?? OCC.wedding;
  const cover = ev.cover || ev.gallery?.[0] || null;
  const photos = ev.gallery ?? [];

  return (
    <div className="min-h-screen bg-[#FFFEF7] font-dote text-black">
      {/* ============================ HERO ============================ */}
      <section className="relative h-[514px] w-full overflow-hidden sm:h-[614px]">
        <div className="absolute inset-0" style={{ background: occ.cover }} />
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: ev.cover ? ev.coverPos || undefined : undefined }} />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.25) 100%)" }}
        />

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => router.push(`${guest ? `/i/${ev.id}` : `/events/${ev.id}`}`)}
            aria-label="Back"
            className="grid place-items-center rounded-[10px] border border-[#b7dee7] bg-white p-[6px]"
          >
            <BackArrow className="size-4 text-teal" />
          </button>
          {!guest && (
            <button
              type="button"
              onClick={() => router.push(`/events/${ev.id}/edit`)}
              className="flex items-center gap-[6px] text-white transition hover:opacity-80"
            >
              <span className="hidden text-[16px] font-medium tracking-[-0.8px] sm:inline">Event settings</span>
              <SettingsGear className="size-6 sm:size-[30px]" />
            </button>
          )}
        </div>

        {/* centered title */}
        <h1 className="absolute inset-x-0 top-[52px] z-10 text-center font-italiana text-[24px] tracking-[-0.8px] text-white sm:text-[42px]">
          Gallery
        </h1>
      </section>

      {/* ============================ GRID ============================ */}
      <section className="bg-black px-6 pb-6 pt-11">
        <p className="text-center text-[18px] tracking-[-0.8px] text-white">
          {photos.length > 0
            ? `Explore all ${photos.length} Photo${photos.length === 1 ? "" : "s"} from our gallery`
            : "No photos have been added to this gallery yet"}
        </p>
        {photos.length > 0 && (
          <div className="mx-auto mt-6 grid max-w-[923px] grid-cols-2 gap-[3px] sm:grid-cols-3 sm:gap-1">
            {photos.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(i)}
                className="block overflow-hidden rounded-[2px] transition hover:opacity-95"
                aria-label={`Open photo ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p}
                  alt=""
                  className="aspect-[176/194] w-full object-cover sm:aspect-[305/336]"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ========================== THANK YOU ========================= */}
      <section className="flex flex-col items-center gap-10 px-10 pb-12 pt-12 text-center sm:gap-14 sm:pb-16 sm:pt-16">
        <div className="flex flex-col items-center gap-[14px]">
          <h2 className="font-italiana text-[24px] tracking-[-0.8px] sm:text-[32px]">Thank you</h2>
          <p className="max-w-[545px] text-[16px] leading-relaxed sm:text-[20px]">{THANKS}</p>
        </div>
        <p className="font-dote text-[16px] font-extralight tracking-[-0.4px] sm:text-[18px]">{ev.title}</p>
      </section>

      {/* ========================== LIGHTBOX ========================== */}
      {lightbox !== null && photos[lightbox] !== undefined && (
        <Lightbox
          photos={photos}
          title={ev.title}
          index={lightbox}
          onSelect={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

/* -------------------------- lightbox ------------------------------ */

function Lightbox({
  photos,
  title,
  index,
  onSelect,
  onClose,
}: {
  photos: string[];
  title: string;
  index: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function download() {
    if (saving) return;
    setSaving(true);
    try {
      await downloadPhoto(photos[index], `${fileStem(title)}-photo-${index + 1}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onSelect((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onSelect((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* top bar */}
      <div className="flex items-center justify-between px-6 py-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid place-items-center rounded-[10px] border border-[#b7dee7] bg-white p-[6px]"
        >
          <BackArrow className="size-4 text-teal" />
        </button>
        <span className="text-[13px] tracking-[-0.4px] text-white/80">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={download}
          disabled={saving}
          aria-label="Download photo"
          className="flex items-center gap-[6px] rounded-[10px] border border-[#b7dee7] bg-white px-3 py-[6px] text-[13px] font-medium text-teal transition hover:bg-[#f0f7f9] disabled:opacity-60"
        >
          <DownloadIcon className="size-4" />
          {saving ? "Saving…" : "Download"}
        </button>
      </div>

      {/* active photo */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[index]}
          alt=""
          className="max-h-full max-w-[720px] rounded-[16px] object-contain"
        />
      </div>

      {/* thumbnail strip */}
      <div className="flex items-center justify-center gap-[10px] overflow-x-auto px-6 py-8">
        {photos.map((p, k) => (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            className="flex shrink-0 flex-col items-center gap-[4px]"
            aria-label={`View photo ${k + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p}
              alt=""
              className={cn(
                "size-[42px] rounded-[10px] object-cover transition",
                k === index ? "ring-2 ring-white" : "opacity-60 hover:opacity-90"
              )}
            />
            <span className={cn("size-[6px] rounded-full", k === index ? "bg-white" : "bg-transparent")} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------- download ------------------------------ */

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/avif": "avif",
};

/** "#Nicole's Big Day" -> "nicoles-big-day" (safe on every OS). */
function fileStem(title: string): string {
  return (
    title
      .replace(/^#+/, "")
      .replace(/['’]/g, "") // "Nicole's" -> "nicoles", not "nicole-s"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "avela"
  );
}

/** Save a gallery photo. Photos are data URLs (uploaded) or external URLs;
 * both are turned into a Blob so the browser saves rather than navigates.
 * If a remote host blocks cross-origin reads, open it in a new tab instead. */
async function downloadPhoto(src: string, stem: string) {
  let blob: Blob;
  try {
    blob = await (await fetch(src)).blob();
  } catch {
    window.open(src, "_blank", "noopener,noreferrer");
    return;
  }
  const ext = EXT[blob.type] ?? "jpg";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${stem}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------ icons ----------------------------- */

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

/* vuesax/bulk/setting-3, exact Figma asset: rounded square body + two slider
   tracks & knobs. Body at 0.4 opacity like the bulk variant. */
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
