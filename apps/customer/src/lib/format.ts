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

export function greetingForNow(name?: string | null): string {
  const hour = new Date().getHours();
  const part =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
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

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
}
