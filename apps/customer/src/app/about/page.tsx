import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/jsonld";
import { getFaqs } from "@/lib/faq";
import { BUSINESS } from "@/lib/site";
import { getSeoMenu } from "@/server/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About Us: Fibre-Rich Bakery in Lekki, Lagos",
  description:
    "Dripping Honey Treats is a Lekki, Lagos bakery making fibre-rich chinchin, wheat cakes and puff-puff, with pickup or delivery across Lagos and dessert tables for events. Areas we serve, how ordering works, and FAQs.",
  alternates: { canonical: "/about" },
};

/** Server-rendered "about + FAQ": the clearest, most quotable facts for Google and AI assistants. */
export default async function AboutPage() {
  const { categories, eventTypes, pickupAddress, pickupHours } = await getSeoMenu();
  const faqs = getFaqs({ pickupAddress, pickupHours, categories });

  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+var(--banner-h,0px)+48px)]">
      <JsonLd data={faqJsonLd(faqs)} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])} />

      <PageHeader eyebrow="Our story" title="About Dripping Honey Treats" subtitle={BUSINESS.tagline} backHref="/" />

      <article className="mx-auto max-w-3xl space-y-8 text-[15px] leading-relaxed text-deep/75 md:text-base">
        <section className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-8">
          <h2 className="mb-3 font-display text-2xl text-deep">Pastries that are good, and good for you</h2>
          <p>{BUSINESS.description}</p>
          <p className="mt-3">
            Instead of plain white flour, we bake with wheat and naturally fibre-rich ingredients such as tigernut,
            coconut, plantain and carrot. Our bakers prepare every order fresh, so your treats taste the way they should.
          </p>
          {categories.length ? (
            <p className="mt-3">
              On the menu:{" "}
              {categories.map((c, i) => (
                <span key={c.id}>
                  <Link href={`/pastries/${c.slug}`} className="font-semibold text-tea">
                    {c.name}
                  </Link>
                  {c.items.length ? ` (${c.items.map((it) => it.name).join(", ")})` : ""}
                  {i < categories.length - 1 ? "; " : "."}
                </span>
              ))}{" "}
              See all prices on our{" "}
              <Link href="/menu" className="font-semibold text-tea">
                menu
              </Link>
              .
            </p>
          ) : null}
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-8">
          <h2 className="mb-3 font-display text-2xl text-deep">Pickup in Lekki, delivery across Lagos</h2>
          <p>
            Collect your order from <strong>{pickupAddress || BUSINESS.address.full}</strong>
            {pickupHours ? ` (${pickupHours})` : ""}, or have it delivered. We deliver to:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {BUSINESS.areasServed.map((a) => (
              <li key={a} className="rounded-full bg-sage-soft px-3 py-1 text-sm font-medium text-deep">
                {a}
              </li>
            ))}
            <li className="rounded-full bg-off-white px-3 py-1 text-sm text-deep/60">and across Lagos</li>
          </ul>
          <p className="mt-3 text-sm text-deep/60">
            The delivery fee depends on your location and is paid to the rider on arrival.
          </p>
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-8">
          <h2 className="mb-3 font-display text-2xl text-deep">Dessert tables & event catering</h2>
          <p>
            Birthdays, office events, weddings and get-togethers: we create dessert and snack tables, snack boxes,
            chinchin jars and celebration cakes in Lagos, and in Ibadan when booked early.
          </p>
          {eventTypes.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-tea">
              {eventTypes.map((e) => (
                <li key={e.id}>
                  <strong>{e.name}</strong>
                  {e.description ? `: ${e.description}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/events" className="mt-4 inline-block font-semibold text-tea">
            Request an event quote →
          </Link>
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl text-deep md:text-3xl">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-[22px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 open:pb-5">
                <summary className="cursor-pointer list-none font-semibold text-deep marker:hidden">
                  <span className="mr-2 text-tea transition group-open:rotate-45 inline-block">+</span>
                  {f.q}
                </summary>
                <p className="mt-2 pl-5 text-deep/70">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-deep p-6 text-white md:p-8">
          <h2 className="font-display text-2xl">Contact us</h2>
          <p className="mt-2 text-white/80">{BUSINESS.address.full}</p>
          <p className="mt-1">
            <a href={`mailto:${BUSINESS.email}`} className="font-semibold text-honey">
              {BUSINESS.email}
            </a>
            {BUSINESS.whatsappUrl ? (
              <>
                {" · "}
                <a href={BUSINESS.whatsappUrl} className="font-semibold text-honey">
                  WhatsApp us
                </a>
              </>
            ) : null}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/pastries" className="pressable rounded-full bg-white px-6 py-3 text-sm font-semibold text-deep">
              Order now
            </Link>
            <Link href="/menu" className="pressable rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/20">
              View menu & prices
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
