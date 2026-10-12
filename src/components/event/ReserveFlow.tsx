"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { ToggleRow } from "@/components/ui/Toggle";
import { Seal } from "@/components/ui/Seal";
import { naira } from "@/lib/money";
import type { WishlistItem } from "@/lib/types";

/** Reserve a wishlist item, locks it so two guests don't double up (D2). */
export function ReserveFlow({
  item,
  onClose,
  onReserve,
}: {
  item: WishlistItem | null;
  onClose: () => void;
  onReserve: (itemId: string, name: string, showName: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [showName, setShowName] = useState(true);
  const [done, setDone] = useState(false);

  function close() {
    onClose();
    setTimeout(() => {
      setName("");
      setShowName(true);
      setDone(false);
    }, 200);
  }

  function confirm() {
    if (!item) return;
    onReserve(item.id, showName && name.trim() ? name.trim() : "Anonymous", showName);
    setDone(true);
  }

  return (
    <Modal
      open={!!item}
      onClose={close}
      eyebrow="Wishlist"
      title={done ? undefined : "Reserve this gift"}
    >
      {!item ? null : done ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="animate-pop">
            <Seal kind="claimed" size="lg" top="Gift" mid="reserved" />
          </div>
          <h3 className="text-[23px]">It&apos;s yours to give.</h3>
          <p className="max-w-[32ch] text-[15px] text-ink-soft">
            <span className="font-semibold text-ink">{item.name}</span> is now locked to you.
            No one else can claim it. You can release it any time if plans change.
          </p>
          <Button fullWidth className="mt-2" onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <div>
          <div className="mt-4 rounded-md border border-line bg-shell/50 px-4 py-3.5">
            <p className="font-display text-[18px]">{item.name}</p>
            {item.price_kobo != null && (
              <p className="money mt-1 text-[14px] text-ink-soft">{naira(item.price_kobo)}</p>
            )}
            {item.description && (
              <p className="mt-1.5 text-[14px] text-ink-soft">{item.description}</p>
            )}
          </div>

          <Field label="Your name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ada"
              autoFocus
            />
          </Field>

          <div className="mt-4 rounded-md bg-shell/60 px-4 py-1">
            <ToggleRow
              label="Show my name on the reservation"
              sub="Otherwise it just shows as Reserved"
              checked={showName}
              onChange={setShowName}
              last
            />
          </div>

          <Button fullWidth size="lg" className="mt-5" onClick={confirm}>
            Reserve {item.name}
          </Button>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-[13.5px] font-semibold text-evergreen hover:underline"
            >
              View in store ↗
            </a>
          )}
        </div>
      )}
    </Modal>
  );
}
