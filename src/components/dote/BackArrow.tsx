/* Dote, shared back navigation icon.
 * Matches the Figma asset (vuesax/linear/arrow-up, a plain chevron, no shaft)
 * rotated to point left. Colour via `currentColor`. */
export function BackArrow({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18.5l-6.44-6.44a.8.8 0 0 1 0-1.12L15 4.5" />
    </svg>
  );
}
