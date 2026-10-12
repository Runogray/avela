import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-[1080px] flex-col items-center px-6 py-28 text-center">
        <span className="text-5xl">🎈</span>
        <h1 className="mt-6 text-[clamp(32px,5vw,48px)]">This page floated away.</h1>
        <p className="mt-3 max-w-[42ch] text-[17px] text-ink-soft">
          The celebration you&apos;re looking for isn&apos;t here, the link may be old, or
          the host may have taken the page down.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back home</ButtonLink>
          <ButtonLink href="/e/amara-tobi" variant="secondary">
            See an example page
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
