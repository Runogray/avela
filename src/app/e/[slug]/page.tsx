import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { EventView } from "@/components/event/EventView";
import { getEvent } from "@/lib/events";
import { allMockSlugs } from "@/lib/mock";
import { OCCASION_LABEL } from "@/lib/types";
import { formatEventDate } from "@/lib/date";

// Pre-render known events at build; unknown slugs render on demand.
export function generateStaticParams() {
  return allMockSlugs().map((slug) => ({ slug }));
}

// THE pitch for SSR: a shared link renders a real preview for every scraper
// (WhatsApp, Instagram, iMessage), the growth loop depends on this.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: "Event not found" };

  const title = `${event.title} · ${OCCASION_LABEL[event.occasion]}`;
  const description = event.description
    ? event.description.slice(0, 160)
    : `You're invited, ${formatEventDate(event.starts_at)}. RSVP, send a gift, and leave a wish on Avela.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Avela",
      url: `/e/${event.slug}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <>
      <SiteHeader />
      <EventView event={event} />
      <SiteFooter />
    </>
  );
}
