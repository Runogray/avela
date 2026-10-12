"use client";

import { useState } from "react";
import { AVATARS } from "@/lib/avatar";

/* ------------------------------------------------------------------ *
 * Avela — avatar picker modal. Used both in Profile (change avatar)
 * and in onboarding right after account creation. Female / Male groups,
 * the current pick carries a teal ring + check.
 * ------------------------------------------------------------------ */
export function AvatarPicker({
  current,
  title = "Choose your avatar",
  saveLabel = "Save avatar",
  requireChange = true,
  dismissable = true,
  onClose,
  onSave,
}: {
  current: string | null;
  title?: string;
  saveLabel?: string;
  /** When true the save button stays disabled until a different avatar is picked. */
  requireChange?: boolean;
  /** When false there is no close affordance and the backdrop won't dismiss. */
  dismissable?: boolean;
  onClose?: () => void;
  onSave: (id: string) => void;
}) {
  const [selected, setSelected] = useState(current ?? AVATARS[0].id);
  const groups: { label: string; gender: "female" | "male" }[] = [
    { label: "Female", gender: "female" },
    { label: "Male", gender: "male" },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 lg:items-center lg:p-6"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[24px] bg-white font-dote lg:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <p className="text-[16px] font-semibold tracking-[0.2px] text-[#0e0e0e]">{title}</p>
          {dismissable && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-full bg-[#f1f1f1] text-[#525252] transition hover:bg-[#e6e6e6]"
            >
              <CrossIcon className="size-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {groups.map((g) => (
            <div key={g.gender} className="mb-5">
              <p className="mb-3 text-[13px] font-semibold tracking-[0.2px] text-[#878787]">{g.label}</p>
              <div className="grid grid-cols-4 gap-3">
                {AVATARS.filter((a) => a.gender === g.gender).map((a) => {
                  const on = selected === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelected(a.id)}
                      aria-label={a.label}
                      aria-pressed={on}
                      className={`relative aspect-square overflow-hidden rounded-full border-2 transition ${
                        on ? "border-teal" : "border-transparent hover:border-[#cfeef5]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.src} alt="" className="size-full rounded-full object-cover" />
                      {on && (
                        <span className="absolute bottom-0 right-0 grid size-[18px] place-items-center rounded-full border-2 border-white bg-teal text-white">
                          <CheckIcon className="size-[10px]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-6 pt-2">
          <button
            type="button"
            disabled={requireChange && selected === current}
            onClick={() => onSave(selected)}
            className="flex h-[52px] w-full items-center justify-center rounded-[50px] text-[14px] tracking-[0.35px] text-teal-ink transition disabled:cursor-not-allowed disabled:bg-[#d0ebf1] enabled:bg-teal enabled:hover:brightness-95"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
function CrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
