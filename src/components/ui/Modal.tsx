"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

/** A calm, centered sheet. Closes on overlay click and Escape. */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  maxWidth = "max-w-[480px]",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-evergreen-deep/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "animate-rise w-full overflow-hidden rounded-t-lg bg-white shadow-keepsake sm:rounded-lg",
          maxWidth
        )}
      >
        <div className="max-h-[88vh] overflow-y-auto p-6 sm:p-7">
          {eyebrow && (
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-coral-deep">
              {eyebrow}
            </p>
          )}
          {title && <h3 className="text-[22px]">{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
}
