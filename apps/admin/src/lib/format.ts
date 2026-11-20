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

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
}

/** "12 Nov 2026, 3:40 pm" (Lagos time). */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Lagos",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

/** "12 Nov 2026" */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** "5 min ago", "3 hours ago", "2 days ago" */
export function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

/** Status wording that matches the order type: pickup orders are "Ready for pickup" / "Picked up". */
export function orderStatusLabel(status: string, fulfillment?: string | null): string {
  if (fulfillment === "pickup") {
    if (status === "ready_for_delivery") return "Ready for pickup";
    if (status === "delivered" || status === "completed") return "Picked up";
  }
  return statusLabel(status);
}
