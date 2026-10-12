import { Wordmark } from "./Wordmark";
import { ButtonLink } from "@/components/ui/Button";

/** Slim, calm public header. Stays out of the way of the keepsake page. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-porcelain/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-3.5">
        <Wordmark />
        <nav className="flex items-center gap-2 sm:gap-3">
          <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Log in
          </ButtonLink>
          <ButtonLink href="/create" variant="primary" size="sm" className="whitespace-nowrap">
            <span className="sm:hidden">Create page</span>
            <span className="hidden sm:inline">Create your page</span>
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
