import { cn } from "@/lib/cn";

/** Tags label occasion type and gift state in plain words. */
type Tone = "neutral" | "green" | "coral" | "blush" | "champ";

const TONE: Record<Tone, string> = {
  neutral: "bg-shell text-ink-soft",
  green: "bg-evergreen/10 text-evergreen",
  coral: "bg-coral/15 text-coral-deep",
  blush: "bg-blush text-[#9A5A47]",
  champ: "bg-champagne/30 text-[#86683A]",
};

export function Chip({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3 py-1.5 text-[12.5px] font-semibold",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
