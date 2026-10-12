import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";

/**
 * Motivational progress bar. Funds reach the celebrant whether or not the
 * goal is met, the bar just rallies people toward a target.
 */
export function Progress({
  raisedKobo,
  targetKobo,
  pct,
  className,
}: {
  raisedKobo: number;
  targetKobo: number;
  pct: number;
  className?: string;
}) {
  const reached = pct >= 100;
  const width = Math.min(100, Math.max(2, pct));
  return (
    <div className={cn("mt-3.5", className)}>
      <div className="h-3 overflow-hidden rounded-pill bg-shell">
        <div
          className={cn(
            "h-full rounded-pill transition-[width] duration-700 ease-[var(--ease-keepsake)]",
            reached
              ? "bg-[linear-gradient(90deg,var(--color-champagne),#C99A4E)]"
              : "bg-[linear-gradient(90deg,var(--color-coral),#F08A56)]"
          )}
          style={{ width: `${width}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="mt-2.5 flex justify-between text-[13.5px]">
        <span className="money">{naira(raisedKobo)} raised</span>
        <span className="money text-ink-soft">of {naira(targetKobo)}</span>
      </div>
    </div>
  );
}
