/** Event date helpers, formatted for a Nigerian audience (en-NG, WAT). */

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return `${DAY[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return m === 0 ? `${h}:00 ${ampm}` : `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** "in 3 months" / "Today" / "Tomorrow", a soft countdown for the hero. */
export function relativeToNow(iso: string, now = new Date()): string {
  const target = new Date(iso);
  const days = Math.round((target.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "Celebrated";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 30) return `In ${Math.round(days / 7)} weeks`;
  const months = Math.round(days / 30);
  return months <= 1 ? "In a month" : `In ${months} months`;
}
