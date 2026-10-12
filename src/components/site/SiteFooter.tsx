import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-porcelain">
      <div className="mx-auto flex max-w-[1080px] flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="font-display text-[20px]">Avela</p>
        <nav className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13.5px] text-ink-soft">
          <Link href="/create" className="hover:text-evergreen">
            Create a page
          </Link>
          <Link href="/login" className="hover:text-evergreen">
            Log in
          </Link>
        </nav>
        <p className="mt-4 text-[12.5px] text-ink-soft/80">
          © {new Date().getFullYear()} Avela · Made for weddings, birthdays &amp; baby showers
        </p>
      </div>
    </footer>
  );
}
