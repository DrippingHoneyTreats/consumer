/**
 * schema.org structured data (JSON-LD). Google uses it for rich results and
 * local listings; AI assistants (ChatGPT, Perplexity, Gemini, Claude) use it
 * to understand exactly what the business sells, where, and for how much.
 */
import { BUSINESS, SITE_URL } from "@/lib/site";
import type { SeoCategory, SeoEventType, SeoItem } from "@/server/seo";

type Json = Record<string, unknown>;

export const BUSINESS_ID = `${SITE_URL}/#business`;

const ngn = (kobo: number) => (kobo / 100).toFixed(0);

export function JsonLd({ data }: { data: Json | Json[] }) {
  // Escape "<" so the JSON can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/** The business itself: a Bakery (a kind of LocalBusiness / FoodEstablishment). */
export function bakeryJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    "@id": BUSINESS_ID,
    name: BUSINESS.name,
    alternateName: BUSINESS.shortName,
    description: BUSINESS.description,
    slogan: BUSINESS.tagline,
    url: SITE_URL,
    logo: `${SITE_URL}${BUSINESS.logo}`,
    image: `${SITE_URL}/opengraph-image`,
    email: BUSINESS.email,
    ...(BUSINESS.phone ? { telephone: BUSINESS.phone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.locality,
      addressRegion: BUSINESS.address.region,
      addressCountry: BUSINESS.address.country,
    },
    areaServed: [
      ...BUSINESS.areasServed.map((name) => ({ "@type": "Place", name: `${name}, Lagos` })),
      { "@type": "City", name: "Lagos" },
    ],
    servesCuisine: ["Nigerian pastries", "Snacks", "Desserts"],
    priceRange: "₦₦",
    currenciesAccepted: "NGN",
    paymentAccepted: "Card, Bank transfer, USSD",
    hasMenu: `${SITE_URL}/menu`,
    knowsAbout: ["Fibre-rich pastries", "Chinchin", "Wheat cakes", "Puff-puff", "Dessert tables", "Event catering"],
    ...(BUSINESS.sameAs.length ? { sameAs: BUSINESS.sameAs } : {}),
    potentialAction: {
      "@type": "OrderAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/pastries`, actionPlatform: ["https://schema.org/DesktopWebPlatform", "https://schema.org/MobileWebPlatform"] },
      deliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet", "http://purl.org/goodrelations/v1#DeliveryModePickUp"],
    },
  };
}

export function websiteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BUSINESS.name,
    publisher: { "@id": BUSINESS_ID },
    inLanguage: "en-NG",
  };
}

function offerFor(item: SeoItem): Json {
  const prices = item.variants.length ? item.variants.map((v) => v.price) : [item.basePrice];
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const availability =
    item.status === "sold_out" ? "https://schema.org/OutOfStock" : item.status === "pre_order" ? "https://schema.org/PreOrder" : "https://schema.org/InStock";
  return low === high
    ? { "@type": "Offer", price: ngn(low), priceCurrency: "NGN", availability, seller: { "@id": BUSINESS_ID } }
    : {
        "@type": "AggregateOffer",
        lowPrice: ngn(low),
        highPrice: ngn(high),
        priceCurrency: "NGN",
        offerCount: prices.length,
        availability,
        seller: { "@id": BUSINESS_ID },
      };
}

/** Full menu as schema.org Menu → sections → items with prices. */
export function menuJsonLd(categories: SeoCategory[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/menu#menu`,
    name: `${BUSINESS.name} menu`,
    url: `${SITE_URL}/menu`,
    inLanguage: "en-NG",
    hasMenuSection: categories.map((c) => ({
      "@type": "MenuSection",
      name: c.name,
      ...(c.tagline ? { description: c.tagline } : {}),
      url: `${SITE_URL}/pastries/${c.slug}`,
      hasMenuItem: c.items.map((i) => ({
        "@type": "MenuItem",
        name: i.name,
        ...(i.description ? { description: i.description } : {}),
        ...(i.image ? { image: i.image } : {}),
        offers: offerFor(i),
        ...(i.nutrition?.kcal ? { nutrition: { "@type": "NutritionInformation", calories: `${i.nutrition.kcal} kcal`, ...(i.nutrition.fibre ? { fiberContent: i.nutrition.fibre } : {}) } } : {}),
      })),
    })),
  };
}

/** A category page as a list of products with prices. */
export function categoryJsonLd(category: SeoCategory): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} in Lagos | ${BUSINESS.name}`,
    url: `${SITE_URL}/pastries/${category.slug}`,
    itemListElement: category.items.map((i, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "Product",
        name: i.name,
        ...(i.description ? { description: i.description } : {}),
        ...(i.image ? { image: i.image } : {}),
        brand: { "@type": "Brand", name: BUSINESS.name },
        category: category.name,
        url: `${SITE_URL}/pastries/${category.slug}?item=${encodeURIComponent(i.id)}`,
        offers: offerFor(i),
      },
    })),
  };
}

export function eventCateringJsonLd(eventTypes: SeoEventType[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/events#service`,
    name: "Event catering, dessert & snack tables",
    serviceType: "Event catering",
    description:
      "Dessert tables, snack boxes and celebration cakes for birthdays, corporate events and weddings in Lagos (and Ibadan when booked early).",
    provider: { "@id": BUSINESS_ID },
    areaServed: BUSINESS.eventCities.map((name) => ({ "@type": "City", name })),
    url: `${SITE_URL}/events`,
    ...(eventTypes.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Event packages",
            itemListElement: eventTypes.map((e) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: e.name, ...(e.description ? { description: e.description } : {}) },
            })),
          },
        }
      : {}),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: `${SITE_URL}${t.path}` })),
  };
}
