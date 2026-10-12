import { twMerge } from "tailwind-merge";

/**
 * Joins classnames and resolves Tailwind conflicts so the last class wins
 * (e.g. an override `text-[#FDF8EF]` beats a base `text-evergreen`).
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return twMerge(parts.filter(Boolean).join(" "));
}
