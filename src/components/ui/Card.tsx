import { cn } from "@/lib/cn";

/**
 * The card is the atom. Every object, an event, a wishlist item, a
 * contribution, a wish, is a card. Same radius, shadow, breathing room.
 */
export function Card({
  hover = false,
  className,
  children,
}: {
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-white shadow-keepsake-sm",
        hover &&
          "transition-all duration-[250ms] ease-[var(--ease-keepsake)] hover:-translate-y-[3px] hover:shadow-keepsake",
        className
      )}
    >
      {children}
    </div>
  );
}

/** The warm gradient placeholder used where a cover image will sit. */
export function CoverArt({
  label,
  className,
  emoji,
}: {
  label?: string;
  className?: string;
  emoji?: string;
}) {
  return (
    <div
      className={cn(
        "relative grid place-items-center bg-shell text-[13px] text-ink-soft",
        "bg-[radial-gradient(circle_at_30%_30%,rgba(236,106,78,0.18),transparent_40%),radial-gradient(circle_at_75%_70%,rgba(24,74,60,0.14),transparent_45%)]",
        className
      )}
    >
      {emoji ? <span className="text-4xl">{emoji}</span> : label}
    </div>
  );
}
