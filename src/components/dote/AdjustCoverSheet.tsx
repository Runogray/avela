"use client";

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ *
 * Adjust cover: the host drags the cover photo to choose what stays in
 * view. The result is a focus point saved as a CSS object-position
 * ("50% 30%"), so every frame the cover appears in (the wide desktop
 * hero, the tall phone hero, event cards) crops around the same spot.
 * Phone/Desktop previews use the real hero proportions.
 * ------------------------------------------------------------------ */

const FRAMES = {
  phone: { label: "Phone", w: 375, h: 560 },
  desktop: { label: "Desktop", w: 1440, h: 560 },
} as const;
type Frame = keyof typeof FRAMES;

export function parsePos(pos?: string): [number, number] {
  const m = /^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec((pos || "").trim());
  return m ? [Number(m[1]), Number(m[2])] : [50, 50];
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function AdjustCoverSheet({
  src,
  pos,
  onSave,
  onClose,
}: {
  src: string;
  pos: string;
  onSave: (pos: string) => void;
  onClose: () => void;
}) {
  const [frame, setFrame] = useState<Frame>("phone");
  const [[x, y], setXY] = useState<[number, number]>(() => parsePos(pos));
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // How far the photo overflows the frame (object-cover), in screen px.
  // Dragging by that many px sweeps the focus from 0% to 100%.
  function overflow(): { ox: number; oy: number } {
    const box = boxRef.current;
    if (!box || !natural) return { ox: 0, oy: 0 };
    const { width: W, height: H } = box.getBoundingClientRect();
    const scale = Math.max(W / natural.w, H / natural.h);
    return { ox: natural.w * scale - W, oy: natural.h * scale - H };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x, y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const { ox, oy } = overflow();
    // Moving the photo right reveals more of its left side -> smaller x%.
    const nx = ox > 0.5 ? clamp(d.x - ((e.clientX - d.px) / ox) * 100) : d.x;
    const ny = oy > 0.5 ? clamp(d.y - ((e.clientY - d.py) / oy) * 100) : d.y;
    setXY([nx, ny]);
  }
  function onPointerUp() {
    drag.current = null;
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setXY(([cx, cy]) => [clamp(cx + m[0]), clamp(cy + m[1])]);
  }

  const f = FRAMES[frame];
  const objectPosition = `${Math.round(x)}% ${Math.round(y)}%`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[94vh] w-full max-w-[640px] flex-col gap-5 overflow-y-auto rounded-t-[26px] bg-white px-6 py-7 font-dote sm:rounded-[24px] sm:px-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Adjust cover"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-dote text-[20px] font-medium tracking-[-1px] text-black">Adjust cover</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#7a7266]">
              Drag the photo to choose what stays in view. It&rsquo;s kept in focus on every screen.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full text-[#9a9a9a] transition hover:bg-black/5">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 self-center rounded-[14px] bg-[#f0f7f9] p-1">
          {(Object.keys(FRAMES) as Frame[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFrame(k)}
              aria-pressed={frame === k}
              className={`h-[36px] rounded-[10px] px-5 text-[13px] font-medium transition ${
                frame === k ? "bg-white text-teal shadow-sm" : "text-[#7a7266] hover:text-[#1c1611]"
              }`}
            >
              {FRAMES[k].label}
            </button>
          ))}
        </div>

        {/* the frame, at the real hero proportions */}
        <div className="flex justify-center">
          <div
            ref={boxRef}
            tabIndex={0}
            role="slider"
            aria-label="Cover focus point. Use arrow keys to move."
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(x)}
            aria-valuetext={`${Math.round(x)}% across, ${Math.round(y)}% down`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            className="relative cursor-grab touch-none select-none overflow-hidden rounded-[16px] bg-[#f0f7f9] outline-none ring-teal focus-visible:ring-2 active:cursor-grabbing"
            style={{
              aspectRatio: `${f.w} / ${f.h}`,
              width: frame === "phone" ? "min(240px, 62vw)" : "100%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition }}
            />
            {/* same shading as the event header, so the preview reads true */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.5) 100%)" }}
            />
            <span className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-[50px] bg-black/45 px-3 py-[6px] text-[12px] font-medium text-white">
              <svg className="size-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
              </svg>
              Drag to adjust
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setXY([50, 50])}
            className="h-[50px] flex-1 rounded-[50px] border border-[#e0dccf] text-[14px] font-medium text-[#5c5c5c] transition hover:bg-black/5"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onSave(Math.round(x) === 50 && Math.round(y) === 50 ? "" : objectPosition)}
            className="h-[50px] flex-[2] rounded-[50px] bg-teal text-[15px] font-medium text-teal-ink transition hover:brightness-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
