import type { Wish } from "@/lib/types";

/** A keepsake note, the well-wish, with an optional host reply. */
export function WishNote({ wish, hostName }: { wish: Wish; hostName: string }) {
  return (
    <div className="rounded-r-md border border-l-[3px] border-line border-l-champagne bg-white px-[22px] py-5">
      <p className="font-display text-[18px] italic leading-[1.5]">
        “{wish.message}”
      </p>
      <p className="mt-3 text-[13px] font-semibold tracking-[0.03em] text-ink-soft">
        {wish.guest_name}
      </p>
      {wish.host_reply && (
        <div className="mt-3.5 rounded-md bg-shell px-[15px] py-3.5 text-[14.5px]">
          <span className="mb-1 block text-[12.5px] font-semibold text-evergreen">
            {hostName} replied
          </span>
          {wish.host_reply}
        </div>
      )}
    </div>
  );
}
