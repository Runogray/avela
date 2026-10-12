"use client";

import { cn } from "@/lib/cn";

/** A labelled switch row, used for the two privacy axes on a gift. */
export function ToggleRow({
  label,
  sub,
  checked,
  onChange,
  last,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3",
        !last && "border-b border-line"
      )}
    >
      <span>
        <span className="block text-[14.5px] font-medium">{label}</span>
        {sub && <span className="block text-[12.5px] text-ink-soft">{sub}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[27px] w-[46px] shrink-0 rounded-pill transition-colors duration-200",
          checked ? "bg-evergreen" : "bg-line"
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow-keepsake-sm transition-all duration-200",
            checked ? "left-[22px]" : "left-[3px]"
          )}
        />
      </button>
    </div>
  );
}
