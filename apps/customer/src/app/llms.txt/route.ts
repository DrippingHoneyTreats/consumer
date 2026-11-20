import { BUSINESS, SITE_URL } from "@/lib/site";
import { getFaqs } from "@/lib/faq";
import { getSeoMenu, naira, priceRange } from "@/server/seo";

export const revalidate = 3600;

/**
 * /llms.txt: a plain-language briefing for AI assistants (the llms.txt
 * convention). Generated from the live menu so prices stay current.
 */
export async function GET() {
  const { categories, eventTypes, pickupAddress, pickupHours } = await getSeoMenu();
  const faqs = getFaqs({ pickupAddress, pickupHours, categories });

  const menu = categories
    .filter((c) => c.items.length)
    .map((c) => {
      const lines = c.items.map((i) => {
        const { low, high } = priceRange(i);
        const price = low === high ? naira(low) : `${naira(low)}–${naira(high)}`;
        const sizes = i.variants.length ? ` (${i.variants.map((v) => `${v.name} ${naira(v.price)}`).join(", ")})` : "";
        return `- ${i.name}: ${price}${sizes}${i.description ? `. ${i.description}` : ""}`;
      });
      return `### ${c.name}\n${c.tagline ? `${c.tagline}\n` : ""}${lines.join("\n")}\nOrder: ${SITE_URL}/pastries/${c.slug}`;
    })
    .join("\n\n");

  const body = `# ${BUSINESS.name}

> ${BUSINESS.description}

- Website: ${SITE_URL}
- Location: ${BUSINESS.address.full}
- Email: ${BUSINESS.email}${BUSINESS.phone ? `\n- WhatsApp: ${BUSINESS.phone}` : ""}
- Delivery areas: ${BUSINESS.areasServed.join(", ")}, and across Lagos
- Pickup: ${pickupAddress || BUSINESS.address.full}${pickupHours ? ` (${pickupHours})` : ""}
- Payment: online by card, bank transfer or USSD (prices in Nigerian naira). The delivery fee is paid to the rider on arrival.
- Events: dessert tables, snack boxes and cakes for birthdays, corporate events and weddings in ${BUSINESS.eventCities.join(" and ")}

## Menu and prices
${menu || `See ${SITE_URL}/menu`}

## Events and catering
${eventTypes.map((e) => `- ${e.name}${e.description ? `: ${e.description}` : ""}`).join("\n") || "- Dessert and snack tables"}
Request a quote: ${SITE_URL}/events

## FAQ
${faqs.map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}

## Key pages
- [Menu & prices](${SITE_URL}/menu)
- [Order pastries](${SITE_URL}/pastries)
- [Events & dessert tables](${SITE_URL}/events)
- [About & FAQ](${SITE_URL}/about)
- [Privacy policy](${SITE_URL}/privacy)
- [Terms of service](${SITE_URL}/terms)
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
