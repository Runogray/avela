"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** Copies the event link, the growth loop is sharing, so make it one tap. */
export function ShareButton({
  className,
  label = "Share page",
}: {
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user dismissed the share sheet, nothing to do */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill bg-white/15 px-[18px] py-2.5 text-[14px] font-semibold text-[#FDF8EF] backdrop-blur-sm transition hover:bg-white/25",
        className
      )}
    >
      {copied ? "✓ Link copied" : `↗ ${label}`}
    </button>
  );
}
