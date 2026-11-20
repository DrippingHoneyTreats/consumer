/**
 * Single source of truth for business facts used by SEO metadata, structured
 * data (JSON-LD), /about, /menu, /llms.txt and the sitemap. Keeping name,
 * address and contact identical everywhere ("NAP consistency") matters for
 * local search.
 */

export const SITE_URL = (process.env.APP_URL || "https://drippinghoneytreats.com").replace(/\/$/, "");

const whatsappDigits = (process.env.NEXT_PUBLIC_WHATSAPP || "").replace(/\D/g, "");

export const BUSINESS = {
  name: "Dripping Honey Treats",
  shortName: "DHT",
  tagline: "Fibre-rich pastries, baked fresh in Lagos",
  description:
    "Dripping Honey Treats is a Lagos bakery making fibre-rich pastries (wheat chinchin, wheat cakes and puff-puff), with pickup in Lekki and delivery across Lagos. We also create dessert and snack tables for birthdays, corporate events and weddings.",
  email: "hello@drippinghoneytreats.com",
  /** E.164 for schema.org, e.g. +2348012345678 (from NEXT_PUBLIC_WHATSAPP). */
  phone: whatsappDigits ? `+${whatsappDigits}` : undefined,
  whatsappUrl: whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined,
  address: {
    street: "14 White Sands Beach Estate",
    locality: "Lekki",
    region: "Lagos",
    country: "NG",
    full: "14 White Sands Beach Estate, Lekki, Lagos, Nigeria",
  },
  /** Areas we deliver to / customers search from. Shown on /about and in structured data. */
  areasServed: [
    "Lekki",
    "Ajah",
    "Victoria Island",
    "Ikoyi",
    "Lagos Island",
    "Yaba",
    "Surulere",
    "Ikeja",
    "Gbagada",
    "Maryland",
    "Magodo",
    "Festac",
  ],
  eventCities: ["Lagos", "Ibadan"],
  /**
   * Official social profiles (Instagram, TikTok, Facebook, Google Business…).
   * Add full URLs here; they link your website and profiles together for Google and AI search.
   */
  sameAs: [] as string[],
  logo: "/assets/logo/logo.png",
};

export const SEO_KEYWORDS = [
  "fibre-rich pastries Lagos",
  "healthy pastries Lagos",
  "chinchin Lagos",
  "wheat chinchin",
  "wheat cake Lagos",
  "puff-puff Lagos",
  "pastry delivery Lagos",
  "pastry shop Lekki",
  "bakery Lekki",
  "snacks delivery Lagos",
  "small chops Lagos",
  "dessert table Lagos",
  "event catering Lagos",
  "birthday snacks Lagos",
  "corporate event snacks Lagos",
];
