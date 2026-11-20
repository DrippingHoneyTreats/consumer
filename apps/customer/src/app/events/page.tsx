import type { Metadata } from "next";
import { EventsView } from "@/components/views/EventsView";
import { JsonLd, breadcrumbJsonLd, eventCateringJsonLd } from "@/lib/jsonld";
import { getSeoMenu } from "@/server/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Dessert Tables & Event Catering in Lagos",
  description:
    "Dessert tables, snack boxes, chinchin jars and celebration cakes for birthdays, corporate events and weddings in Lagos (and Ibadan when booked early). Request a quote from Dripping Honey Treats.",
  alternates: { canonical: "/events" },
};

export default async function Page() {
  const { eventTypes } = await getSeoMenu();
  return (
    <>
      <JsonLd data={eventCateringJsonLd(eventTypes)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Events", path: "/events" }])} />
      <EventsView />
    </>
  );
}
