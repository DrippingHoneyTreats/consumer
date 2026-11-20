/** Currency helpers — API amounts are integer kobo. */

export function formatNgn(kobo: number): string {
  const naira = (kobo ?? 0) / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira);
}

/** "Morning Mart" / "Afternoon Mart" / "Evening Mart" — or "Good evening" with no name. */
export function greetingForNow(name?: string | null): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part} ${first}` : `Good ${part.toLowerCase()}`;
}

export function titleFromSlug(slug: string): string {
  return decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function maskContact(contact: string): string {
  if (contact.includes("@")) {
    const [user, domain] = contact.split("@");
    return `${user.slice(0, 2)}***@${domain}`;
  }
  if (contact.length < 6) return contact;
  return `${contact.slice(0, 4)}***${contact.slice(-3)}`;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Not paid yet",
    pending_payment: "Awaiting payment",
    placed: "Order placed",
    seen: "We've got your order",
    accepted: "Accepted",
    preparing: "Being prepared",
    ready_for_delivery: "Ready for delivery",
    out_for_delivery: "On its way",
    delivered: "Delivered",
    cancelled: "Cancelled",
    payment_failed: "Payment failed",
    submitted: "Submitted",
    reviewing: "Reviewing",
    quote_sent: "Quote sent",
    confirmed: "Confirmed",
    completed: "Completed",
    available: "Available",
    few_left: "Few left",
    sold_out: "Sold out",
    pre_order: "Pre-order",
  };
  return map[status] ?? status.replaceAll("_", " ");
}

/** Placeholder numbers from templates/seed data must never reach customers. */
const PLACEHOLDER_NUMBERS = new Set(["2348000000000", "08000000000", "8000000000"]);

/** Digits-only WhatsApp number, or null if empty / too short / a placeholder. */
export function cleanWhatsapp(phone?: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10 || PLACEHOLDER_NUMBERS.has(digits)) return null;
  return digits;
}

/** The business WhatsApp number from NEXT_PUBLIC_WHATSAPP (null if unset). */
export const BUSINESS_WHATSAPP = cleanWhatsapp(process.env.NEXT_PUBLIC_WHATSAPP);
export const BUSINESS_EMAIL = "hello@drippinghoneytreats.com";

/**
 * "Chat with us" link: WhatsApp when a real number is known (optionally one
 * from the API settings), otherwise an email so the link always works.
 */
export function contactLink(text: string, phone?: string | null): string {
  const number = cleanWhatsapp(phone) ?? BUSINESS_WHATSAPP;
  if (number) return whatsappLink(number, text);
  return `mailto:${BUSINESS_EMAIL}?subject=${encodeURIComponent("Dripping Honey Treats")}&body=${encodeURIComponent(text)}`;
}

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
}
