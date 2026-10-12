import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Coral is reserved for the single most important action on any screen.
 * Evergreen outline for the secondary path. Ghost for tertiary.
 */
type Variant = "primary" | "secondary" | "secondaryLight" | "ghost";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold " +
  "transition-all duration-150 ease-[var(--ease-keepsake)] disabled:cursor-not-allowed disabled:opacity-55";

const SIZE = {
  md: "px-[22px] py-[13px] text-[15px]",
  lg: "px-7 py-4 text-[16px]",
  sm: "px-4 py-2.5 text-[14px]",
};

const VARIANT: Record<Variant, string> = {
  primary: "bg-coral text-white hover:bg-coral-deep active:scale-[0.98]",
  secondary:
    "border-[1.5px] border-evergreen bg-transparent text-evergreen hover:bg-evergreen hover:text-white",
  // for use on the dark evergreen hero, light border + text, fills on hover
  secondaryLight:
    "border-[1.5px] border-white/45 bg-transparent text-[#FDF8EF] hover:bg-white hover:text-evergreen",
  ghost: "bg-shell text-ink hover:bg-[#E9E0D2]",
};

type CommonProps = {
  variant?: Variant;
  size?: keyof typeof SIZE;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(BASE, SIZE[size], VARIANT[variant], fullWidth && "w-full", className)}
      {...rest}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  href,
  children,
  ...rest
}: CommonProps & { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link
      href={href}
      className={cn(BASE, SIZE[size], VARIANT[variant], fullWidth && "w-full", className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
