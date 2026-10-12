import { cn } from "@/lib/cn";

/** The Avela logo, teal leaf mark + "Avela" wordmark. */
export function DoteLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[5px] leading-none", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dote/avela-mark.svg" alt="" className="block h-[16px] w-auto" aria-hidden="true" />
      <span className="font-museo text-[20px] font-medium tracking-[-0.2px] text-teal">Avela</span>
    </span>
  );
}
