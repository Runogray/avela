"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, MoneyInput, TextInput, TextArea } from "@/components/ui/Field";
import { ToggleRow } from "@/components/ui/Toggle";
import { Seal } from "@/components/ui/Seal";
import { naira } from "@/lib/money";
import { sendGift, confirmStubGift } from "@/lib/guest";
import { ApiError, isNetworkError } from "@/lib/api";
import type { ContributionGoal, PublicEvent, PublicGift } from "@/lib/types";

const PRESETS = [5_000_00, 10_000_00, 25_000_00, 50_000_00];
// Illustrative card fee (giver pays on top). Real value comes from the gateway.
const FEE_RATE = 0.015;

type Step = "form" | "processing" | "sealed";

export function GiftFlow({
  open,
  onClose,
  event,
  goal,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  event: PublicEvent;
  goal?: ContributionGoal | null;
  onComplete: (gift: PublicGift, goalId?: string) => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState(0);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [showName, setShowName] = useState(true);
  const [showAmount, setShowAmount] = useState(true);

  const fee = Math.round(amount * FEE_RATE);
  const total = amount + fee;
  const valid = amount >= 500_00;

  function reset() {
    setStep("form");
    setAmount(0);
    setName("");
    setMessage("");
    setShowName(true);
    setShowAmount(true);
  }

  function close() {
    onClose();
    // let the modal animate out before resetting
    setTimeout(reset, 200);
  }

  async function submit() {
    setStep("processing");
    try {
      // Create the gift (runs the receiving-cap gate), then — in dev — simulate
      // the gateway confirmation so it credits the wallet + shows in recent gifts.
      const res = await sendGift(event.slug, {
        amount_kobo: amount,
        goal_id: goal?.id ?? null,
        giver_name: name.trim(),
        message: message.trim(),
        show_name: showName,
        show_amount: showAmount,
      });
      await confirmStubGift(res.checkout_url);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // host is capped — gifts paused (Epic A3)
        setStep("form");
        alert("This host can't receive gifts right now.");
        return;
      }
      if (!isNetworkError(err)) {
        setStep("form");
        alert("Couldn’t send your gift. Please try again.");
        return;
      }
      // offline → fall through to optimistic success
    }
    const gift: PublicGift = {
      id: `g_${Math.random().toString(36).slice(2, 9)}`,
      giver: showName && name.trim() ? name.trim() : "Anonymous",
      amount_kobo: showAmount ? amount : null,
      message: message.trim(),
      created_at: new Date().toISOString(),
    };
    onComplete(gift, goal?.id);
    setStep("sealed");
  }

  const heading = goal ? "Contribute to a goal" : `Send a gift to ${event.host_first_name}`;

  return (
    <Modal
      open={open}
      onClose={close}
      eyebrow={goal ? "Joint contribution" : "Monetary gift"}
      title={step === "sealed" ? undefined : heading}
    >
      {goal && step === "form" && (
        <p className="mt-1 text-[14.5px] text-ink-soft">
          Toward <span className="font-semibold text-ink">{goal.name}</span>
        </p>
      )}

      {step === "form" && (
        <div>
          <Field label="Amount" className="mt-5">
            <MoneyInput valueKobo={amount} onAmountChange={setAmount} autoFocus />
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`money rounded-pill border px-3.5 py-1.5 text-[13.5px] transition ${
                    amount === p
                      ? "border-evergreen bg-evergreen text-white"
                      : "border-line bg-white text-ink-soft hover:border-evergreen/40"
                  }`}
                >
                  {naira(p)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Add a message (optional)">
            <TextArea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                goal
                  ? "Happy to help you get there!"
                  : "Wishing you both a lifetime of joy…"
              }
              maxLength={280}
            />
          </Field>

          <Field label="Your name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aunty Nkechi"
            />
          </Field>

          <div className="mt-5 rounded-md bg-shell/60 px-4 py-1">
            <ToggleRow
              label="Show my name"
              sub="Otherwise your gift shows as Anonymous"
              checked={showName}
              onChange={setShowName}
            />
            <ToggleRow
              label="Show the amount"
              sub="Hide how much you gave from the page"
              checked={showAmount}
              onChange={setShowAmount}
              last
            />
          </div>

          {/* E1, giver pays the card fee on top, host gets the clean amount */}
          {valid && (
            <div className="mt-5 rounded-md border border-line bg-white px-4 py-3.5 text-[14px]">
              <Row label="Your gift" value={naira(amount)} />
              <Row label="Card fee (paid by you)" value={naira(fee)} muted />
              <div className="my-2 border-t border-line" />
              <Row label="You pay" value={naira(total)} strong />
              <p className="mt-2 text-[12.5px] text-ink-soft">
                {event.host_first_name} receives the full{" "}
                <span className="money">{naira(amount)}</span>, the fee never comes out of
                the gift.
              </p>
            </div>
          )}

          <Button
            fullWidth
            size="lg"
            className="mt-5"
            disabled={!valid}
            onClick={submit}
          >
            {valid ? `Send ${naira(amount)}` : "Enter an amount"}
          </Button>
          <p className="mt-3 text-center text-[12px] text-ink-soft">
            🔒 Secure checkout · Demo gateway (no real charge)
          </p>
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-evergreen" />
          <p className="font-display text-[20px]">Taking you to secure checkout…</p>
          <p className="text-[14px] text-ink-soft">Confirming your gift of {naira(total)}</p>
        </div>
      )}

      {step === "sealed" && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="animate-pop">
            <Seal kind={goal ? "goal" : "claimed"} size="lg" top="Gift" mid="sent" />
          </div>
          <h3 className="text-[24px]">Sealed with love.</h3>
          <p className="max-w-[34ch] text-[15px] text-ink-soft">
            Your {goal ? "contribution" : "gift"} of{" "}
            <span className="money text-ink">{naira(amount)}</span> is on its way to{" "}
            {event.host_first_name}.
            {message.trim() && " Your message has been saved to the page."}
          </p>
          <p className="text-[13px] text-ink-soft">
            {showName && name.trim() ? `From ${name.trim()}` : "Sent anonymously"}
            {" · "}
            {showAmount ? "amount visible" : "amount hidden"}
          </p>
          <Button fullWidth className="mt-2" onClick={close}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={muted ? "text-ink-soft" : "text-ink"}>{label}</span>
      <span className={`money ${strong ? "text-[16px] text-evergreen" : ""}`}>{value}</span>
    </div>
  );
}
