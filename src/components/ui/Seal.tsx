import { cn } from "@/lib/cn";

/**
 * The signature. A wax-seal stamp that means two things at once, officially
 * verified (the trust money needs) and sealed with love (the occasion warmth).
 * Used sparingly, never as decoration.
 */
type SealKind = "verified" | "claimed" | "goal";
type SealSize = "sm" | "md" | "lg";

const SURFACE: Record<SealKind, string> = {
  verified:
    "bg-[radial-gradient(circle_at_32%_28%,#2C6B57,var(--color-evergreen-deep))] text-[#FBF3E8]",
  claimed:
    "bg-[radial-gradient(circle_at_32%_28%,#F0875C,var(--color-coral-deep))] text-[#FBF3E8]",
  goal: "bg-[radial-gradient(circle_at_32%_28%,#EFD6A2,#C99A4E)] text-[#5A4422]",
};

const DIAMETER: Record<SealSize, string> = {
  sm: "h-[58px] w-[58px]",
  md: "h-[84px] w-[84px]",
  lg: "h-[112px] w-[112px]",
};

const TOP_SIZE: Record<SealSize, string> = {
  sm: "text-[9px]",
  md: "text-[10px]",
  lg: "text-[12px]",
};
const MID_SIZE: Record<SealSize, string> = {
  sm: "text-[11px]",
  md: "text-[15px]",
  lg: "text-[19px]",
};

export function Seal({
  kind = "verified",
  size = "md",
  top,
  mid,
  className,
}: {
  kind?: SealKind;
  size?: SealSize;
  top: string;
  mid: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full text-center font-display",
        "shadow-[0_6px_16px_rgba(38,32,29,0.18)]",
        DIAMETER[size],
        SURFACE[kind],
        className
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-[6px] rounded-full border-[1.5px] border-dashed border-white/45" />
      <span className="relative leading-none">
        <span
          className={cn(
            "block font-body font-semibold uppercase tracking-[0.14em] opacity-85",
            TOP_SIZE[size]
          )}
        >
          {top}
        </span>
        <span className={cn("mt-0.5 block font-medium", MID_SIZE[size])}>{mid}</span>
      </span>
    </span>
  );
}

/** Compact inline check seal, used next to "Verified host" labels. */
export function SealTick({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-[22px] w-[22px] place-items-center rounded-full text-[10px] text-[#FBF3E8]",
        "bg-[radial-gradient(circle_at_32%_28%,#2C6B57,var(--color-evergreen-deep))]",
        className
      )}
      aria-hidden="true"
    >
      ✓
    </span>
  );
}
