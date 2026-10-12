/**
 * Money is integer kobo everywhere (mirrors the Django backend's
 * config/constants.py). 1 naira = 100 kobo. Never use floats for money.
 */

/** 12_500_00 -> "₦12,500" (drops .00) or "₦12,500.50" when there are kobo. */
export function naira(kobo: number): string {
  const whole = Math.trunc(kobo / 100);
  const k = Math.abs(kobo % 100);
  const body = whole.toLocaleString("en-NG");
  return k === 0 ? `₦${body}` : `₦${body}.${String(k).padStart(2, "0")}`;
}

/** "25,000" (no symbol), for inputs and tight UI. */
export function nairaPlain(kobo: number): string {
  return Math.trunc(kobo / 100).toLocaleString("en-NG");
}

/** Parse a user-typed naira string ("25,000" / "₦25,000.50") into kobo. */
export function toKobo(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  return Math.round(parseFloat(cleaned) * 100);
}

// KYC / receiving cap, mirrors config/constants.py
export const KYC_CAP_KOBO = 100_000_00;
export const KYC_NUDGE_KOBO = 70_000_00;
export const MIN_WITHDRAWAL_KOBO = 2_000_00;
