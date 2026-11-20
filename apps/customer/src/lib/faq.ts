import { BUSINESS } from "@/lib/site";
import type { SeoCategory } from "@/server/seo";

const naira = (kobo: number) => "₦" + Math.round(kobo / 100).toLocaleString("en-NG");

/**
 * Plain, factual Q&A shown on /about and marked up as FAQPage. Clear answers
 * like these are what AI assistants quote when someone asks e.g. "where can I
 * buy healthy chinchin in Lekki?".
 */
export function getFaqs(
  opts: { pickupAddress?: string | null; pickupHours?: string | null; categories?: SeoCategory[] } = {},
) {
  // "chinchin from ₦2,500, cakes from ₦1,500…", always from the live menu.
  const fromPrices = (opts.categories ?? [])
    .map((c) => {
      const prices = c.items.flatMap((i) => (i.variants.length ? i.variants.map((v) => v.price) : [i.basePrice]));
      return prices.length ? `${c.name.toLowerCase()} from ${naira(Math.min(...prices))}` : null;
    })
    .filter(Boolean)
    .join(", ");
  const names = (opts.categories ?? []).filter((c) => c.items.length).map((c) => c.name.toLowerCase());
  const range = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
  const areas = BUSINESS.areasServed.slice(0, -1).join(", ") + " and " + BUSINESS.areasServed.at(-1);
  return [
    {
      q: "What is Dripping Honey Treats?",
      a: `${BUSINESS.name} is a Lagos bakery making fibre-rich pastries${range ? `: ${range}` : ""}. You can order online for pickup in Lekki or delivery across Lagos.`,
    },
    {
      q: "What makes your pastries fibre-rich?",
      a: "We bake with wheat and naturally fibre-rich ingredients such as tigernut, coconut, plantain and carrot, so our treats carry more fibre than typical white-flour pastries. Where available, nutrition details including fibre are listed on the product.",
    },
    {
      q: "Do you deliver in Lagos?",
      a: `Yes. We deliver across Lagos, including ${areas}. The delivery fee depends on your location and is paid to the rider when your order arrives. It isn't part of your online payment.`,
    },
    {
      q: "Can I pick up my order?",
      a: `Yes. Choose pickup at checkout and collect from ${opts.pickupAddress || BUSINESS.address.full}${opts.pickupHours ? ` (${opts.pickupHours})` : ""}. We'll message you on WhatsApp when your order is ready.`,
    },
    {
      q: "How do I order and pay?",
      a: "Order on drippinghoneytreats.com: pick your treats and sizes, choose pickup or delivery, and pay securely online by card, bank transfer or USSD. You'll get order updates on WhatsApp and email.",
    },
    {
      q: "Do you cater for birthdays, corporate events and weddings?",
      a: `Yes. We create dessert tables, snack boxes, chinchin jars and celebration cakes for birthdays, office events and weddings in Lagos, and in Ibadan when booked at least 3 weeks ahead. Request a quote on our Events page or email ${BUSINESS.email}.`,
    },
    {
      q: "How much do your pastries cost?",
      a: `Prices are in naira and listed on our menu at drippinghoneytreats.com/menu${fromPrices ? `: ${fromPrices}` : ""}. Bigger packs are available for sharing and parties.`,
    },
    {
      q: "Do your products contain allergens?",
      a: "Our kitchen handles wheat (gluten), eggs, milk, nuts (including tigernut), coconut and sesame. Please contact us before ordering if you have an allergy.",
    },
  ];
}
