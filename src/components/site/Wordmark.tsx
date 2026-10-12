import Link from "next/link";
import { cn } from "@/lib/cn";

/** Avela wordmark. */
export function Wordmark({
  onDark = false,
  className,
}: {
  onDark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "font-display text-[23px] font-semibold tracking-[-0.02em]",
        onDark ? "text-[#FDF8EF]" : "text-ink",
        className
      )}
    >
      Avela
    </Link>
  );
}
