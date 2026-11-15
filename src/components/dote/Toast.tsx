"use client";

import { cn } from "@/lib/cn";

/**
 * A small top-of-screen toast for success/error feedback — e.g. after saving an
 * event. Slides down when `show` is true; dismissible via the ✕. The "info"
 * tone (teal, bell) announces a new notification, with an optional action.
 */
export function Toast({
  show,
  onClose,
  tone = "success",
  title,
  message,
  action,
}: {
  show: boolean;
  onClose: () => void;
  tone?: "success" | "error" | "info";
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  if (tone === "info") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "fixed inset-x-0 top-0 z-[60] flex justify-center px-4 transition-all duration-300",
          show ? "translate-y-4 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
        )}
      >
        <div className="flex w-full max-w-[520px] items-center gap-3 rounded-[16px] border border-[#cbe7f0] bg-[#f0f7f9] px-4 py-3 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.45)]">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-teal text-teal-ink">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[#1c1611]">{title}</p>
            {message && <p className="line-clamp-2 text-[12px] text-[#4a5a5e]">{message}</p>}
          </div>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="shrink-0 rounded-[50px] bg-teal px-3 py-[6px] text-[12px] font-semibold text-teal-ink transition hover:brightness-95"
            >
              {action.label}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss"
            className="-m-1 shrink-0 rounded-full p-1 text-[#4a5a5e] transition hover:bg-[#d0ebf1]"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
      </div>
    );
  }
  const ok = tone === "success";
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex justify-center px-4 transition-all duration-300",
        show ? "translate-y-4 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-[520px] items-center gap-3 rounded-[16px] border px-4 py-3 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.45)]",
          ok ? "border-[#b6ead4] bg-[#eafaf3]" : "border-[#f3c2bb] bg-[#fdecea]"
        )}
      >
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full",
            ok ? "bg-[#00ab7d]" : "bg-[#e12525]"
          )}
        >
          {ok ? (
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 10.5l3.5 3.5L15 6.5" />
            </svg>
          ) : (
            <span className="text-[14px] font-bold leading-none text-white">!</span>
          )}
        </span>
        <div className="flex-1">
          <p className={cn("text-[14px] font-semibold", ok ? "text-[#06603f]" : "text-[#8a1c0f]")}>{title}</p>
          {message && (
            <p className={cn("text-[12px]", ok ? "text-[#2f7a5c]" : "text-[#b24436]")}>{message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className={cn(
            "-m-1 shrink-0 rounded-full p-1 transition",
            ok ? "text-[#2f7a5c] hover:bg-[#d4efe0]" : "text-[#b24436] hover:bg-[#f7d6d1]"
          )}
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
