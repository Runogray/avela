"use client";

import { cn } from "@/lib/cn";

/**
 * A small top-of-screen toast for success/error feedback — e.g. after saving an
 * event. Slides down when `show` is true; dismissible via the ✕.
 */
export function Toast({
  show,
  onClose,
  tone = "success",
  title,
  message,
}: {
  show: boolean;
  onClose: () => void;
  tone?: "success" | "error";
  title: string;
  message?: string;
}) {
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
