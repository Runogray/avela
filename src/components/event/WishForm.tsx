"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, TextArea } from "@/components/ui/Field";
import type { Wish } from "@/lib/types";

/** Leave a well-wish, no account needed (Story F1). */
export function WishForm({ onAdd }: { onAdd: (wish: Wish) => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    onAdd({
      id: `w_${Math.random().toString(36).slice(2, 9)}`,
      guest_name: name.trim(),
      message: message.trim(),
      host_reply: "",
      created_at: new Date().toISOString(),
    });
    setName("");
    setMessage("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-line bg-white p-5 shadow-keepsake-sm sm:p-6"
    >
      <p className="font-display text-[19px]">Leave a wish</p>
      <Field label="Your message">
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say something to the celebrant…"
          maxLength={400}
        />
      </Field>
      <Field label="Your name">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chidinma"
        />
      </Field>
      <Button
        type="submit"
        variant="secondary"
        className="mt-5"
        disabled={!name.trim() || !message.trim()}
      >
        Post wish
      </Button>
    </form>
  );
}
