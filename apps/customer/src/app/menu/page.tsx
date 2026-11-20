import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { JsonLd, breadcrumbJsonLd, menuJsonLd } from "@/lib/jsonld";
import { BUSINESS } from "@/lib/site";
import { IMAGE_PLACEHOLDER } from "@/lib/placeholders";
import { getSeoMenu, naira, priceRange } from "@/server/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Menu & Prices: Fibre-Rich Pastries in Lagos",
  description:
    "Full menu and naira prices for Dripping Honey Treats: wheat chinchin jars, wheat cakes and puff-puff packs, baked fresh in Lekki. Pickup or delivery across Lagos.",
  alternates: { canonical: "/menu" },
};

const STATUS: Record<string, string> = { sold_out: "Sold out", few_left: "Few left", pre_order: "Pre-order" };

/** Server-rendered menu: real text + prices crawlers and AI assistants can read. */
export default async function MenuPage() {
  const { categories, pickupAddress } = await getSeoMenu();
  const withItems = categories.filter((c) => c.items.length);

  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+48px)]">
      {withItems.length ? <JsonLd data={menuJsonLd(withItems)} /> : null}
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Menu", path: "/menu" }])} />

      <PageHeader
        eyebrow="Baked fresh in Lekki"
        title="Our menu & prices"
        subtitle="Fibre-rich pastries for pickup or delivery across Lagos"
        backHref="/"
      />

      <p className="mx-auto mb-6 max-w-3xl text-sm leading-relaxed text-deep/70 md:text-base">
        Everything we bake uses wheat and naturally fibre-rich ingredients like tigernut, coconut, plantain and carrot. Prices are in naira. Collect from {pickupAddress || BUSINESS.address.full}, or get it
        delivered anywhere in Lagos (the delivery fee is paid to the rider on arrival).
      </p>

      {withItems.length === 0 ? (
        <p className="mx-auto max-w-3xl rounded-[24px] bg-white p-6 text-center text-deep/60 shadow-[var(--shadow-card)]">
          Our menu is loading.{" "}
          <Link href="/pastries" className="font-semibold text-tea">
            Browse pastries
          </Link>
        </p>
      ) : (
        <div className="mx-auto max-w-3xl space-y-8">
          {withItems.map((cat) => (
            <section key={cat.id} aria-labelledby={`cat-${cat.slug}`}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 id={`cat-${cat.slug}`} className="font-display text-2xl text-deep md:text-3xl">
                    {cat.name}
                  </h2>
                  {cat.tagline ? <p className="text-sm text-deep/55">{cat.tagline}</p> : null}
                </div>
                <Link href={`/pastries/${cat.slug}`} className="shrink-0 text-sm font-semibold text-tea">
                  Order {cat.name.toLowerCase()} →
                </Link>
              </div>

              <ul className="space-y-3">
                {cat.items.map((item) => {
                  const { low, high } = priceRange(item);
                  return (
                    <li key={item.id} className="flex gap-4 rounded-[22px] bg-white p-3 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
                      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#e5e1db]">
                        <Image src={item.image || IMAGE_PLACEHOLDER} alt={item.name} fill className="object-cover" sizes="80px" unoptimized />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-deep">{item.name}</h3>
                          <p className="shrink-0 font-display font-semibold text-deep">
                            {low === high ? naira(low) : `${naira(low)} – ${naira(high)}`}
                          </p>
                        </div>
                        {item.description ? <p className="mt-0.5 text-sm text-deep/60">{item.description}</p> : null}
                        {item.variants.length ? (
                          <p className="mt-1.5 text-xs text-deep/55">
                            {item.variants.map((v) => `${v.name}: ${naira(v.price)}`).join(" · ")}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-deep/45">
                          {[
                            item.nutrition?.kcal ? `${item.nutrition.kcal} kcal` : null,
                            item.nutrition?.fibre ? `${item.nutrition.fibre} fibre` : null,
                            STATUS[item.status] ?? null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="mx-auto mt-10 flex max-w-3xl flex-wrap gap-3">
        <Link href="/pastries" className="pressable rounded-full bg-deep px-6 py-3 text-sm font-semibold text-white">
          Start your order
        </Link>
        <Link href="/events" className="pressable rounded-full bg-white px-6 py-3 text-sm font-semibold text-deep ring-1 ring-deep/10">
          Dessert tables for events
        </Link>
        <Link href="/about" className="pressable rounded-full bg-white px-6 py-3 text-sm font-semibold text-deep ring-1 ring-deep/10">
          About us & FAQ
        </Link>
      </div>
    </div>
  );
}
