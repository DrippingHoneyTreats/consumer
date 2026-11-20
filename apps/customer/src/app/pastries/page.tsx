import type { Metadata } from "next";
import { PastriesView } from "@/components/views/PastriesView";
import { JsonLd, breadcrumbJsonLd, menuJsonLd } from "@/lib/jsonld";
import { getSeoMenu } from "@/server/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pastries Menu: Chinchin, Wheat Cakes & Puff-Puff in Lagos",
  description:
    "Browse fibre-rich pastries baked fresh in Lekki: wheat chinchin jars, wheat cakes (coconut, citrus, plantain, tigernut, carrot) and puff-puff packs. Order for pickup or delivery across Lagos.",
  alternates: { canonical: "/pastries" },
};

export default async function Page() {
  const { categories } = await getSeoMenu();
  return (
    <>
      {categories.length ? <JsonLd data={menuJsonLd(categories)} /> : null}
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Pastries", path: "/pastries" }])} />
      <PastriesView />
    </>
  );
}
