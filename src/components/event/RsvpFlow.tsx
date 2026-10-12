"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

type RsvpStatus = "yes" | "maybe" | "no";

const CHOICES: { value: RsvpStatus; label: string; emoji: string }[] = [
  { value: "yes", label: "I'll be there", emoji: "🎉" },
  { value: "maybe", label: "Maybe", emoji: "🤔" },
  { value: "no", label: "Can't make it", emoji: "💌" },
];

export function RsvpFlow({
  open,
  onClose,
  onRsvp,
}: {
  open: boolean;
  onClose: () => void;
  onRsvp: (status: RsvpStatus, name: string) => void;
}) {
  const [status, setStatus] = useState<RsvpStatus>("yes");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [table, setTable] = useState<number | null>(null);

  function close() {
    onClose();
    setTimeout(() => {
      setDone(false);
      setName("");
      setStatus("yes");
      setTable(null);
    }, 200);
  }

  function confirm() {
    onRsvp(status, name.trim() || "Guest");
    // Mock table assignment for attending guests (Story B3 / C2).
    setTable(status === "yes" ? 7 : null);
    setDone(true);
  }

  return (
    <Modal open={open} onClose={close} eyebrow="RSVP" title={done ? undefined : "Will you join us?"}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="text-5xl">{CHOICES.find((c) => c.value === status)?.emoji}</span>
          <h3 className="text-[23px]">
            {status === "yes"
              ? "Wonderful, you're on the list!"
              : status === "maybe"
                ? "Noted, we hope you can make it."
                : "Thank you for letting us know."}
          </h3>
          {table != null && (
            <p className="text-[15px] text-ink-soft">
              You&apos;ve been seated at{" "}
              <span className="font-semibold text-evergreen">Table {table}</span>.
            </p>
          )}
          <Button fullWidth className="mt-3" onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <div>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {CHOICES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setStatus(c.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border-[1.5px] px-2 py-4 text-[13.5px] font-semibold transition",
                  status === c.value
                    ? "border-evergreen bg-evergreen/[0.06] text-evergreen"
                    : "border-line bg-white text-ink-soft hover:border-evergreen/40"
                )}
              >
                <span className="text-2xl">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>

          <Field label="Your name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Who should we expect?"
              autoFocus
            />
          </Field>

          <Button fullWidth size="lg" className="mt-5" disabled={!name.trim()} onClick={confirm}>
            Send RSVP
          </Button>
        </div>
      )}
    </Modal>
  );
}
