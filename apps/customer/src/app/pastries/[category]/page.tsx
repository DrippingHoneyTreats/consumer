import type { Metadata } from "next";
import { CategoryView } from "@/components/views/CategoryView";
import { JsonLd, breadcrumbJsonLd, categoryJsonLd } from "@/lib/jsonld";
import { getSeoMenu, naira } from "@/server/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

async function findCategory(slug: string) {
  const { categories } = await getSeoMenu();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = await findCategory(slug);
  if (!cat) {
    return { title: "Pastries in Lagos", alternates: { canonical: `/pastries/${slug}` } };
  }
  const prices = cat.items.flatMap((i) => (i.variants.length ? i.variants.map((v) => v.price) : [i.basePrice]));
  const from = prices.length ? ` From ${naira(Math.min(...prices))}.` : "";
  const names = cat.items.slice(0, 4).map((i) => i.name).join(", ");
  return {
    title: `${cat.name} in Lagos: Order Online`,
    description: `${cat.tagline ? `${cat.tagline}. ` : ""}${names ? `${names}.` : ""}${from} Baked fresh in Lekki. Pickup or delivery across Lagos.`.trim(),
    alternates: { canonical: `/pastries/${cat.slug}` },
    openGraph: {
      title: `${cat.name} | Dripping Honey Treats, Lagos`,
      ...(cat.image ? { images: [{ url: cat.image, alt: cat.name }] } : {}),
    },
  };
}

export default async function Page({ params }: Props) {
  const { category: slug } = await params;
  const cat = await findCategory(slug);
  return (
    <>
      {cat ? (
        <>
          <JsonLd data={categoryJsonLd(cat)} />
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Pastries", path: "/pastries" },
              { name: cat.name, path: `/pastries/${cat.slug}` },
            ])}
          />
        </>
      ) : null}
      <CategoryView />
    </>
  );
}
