import "server-only";
import { db } from "../db";
import { env } from "../env";
import { sendEmail, sendEmailBatch, type OutgoingEmail } from "./email";
import * as T from "./templates";
import { sendWhatsappAdmin, sendWhatsappOtp, sendWhatsappUpdate } from "./whatsapp";

/**
 * High-level customer + admin messaging (email templates + WhatsApp).
 *
 * Every send is awaited (serverless functions stop once the response is
 * sent) but never throws: a failed email must not fail a payment. Each
 * attempt is written to the notification_log table.
 */

type Attempt = {
  channel: "email" | "whatsapp";
  recipient: string;
  kind: string;
  run: () => Promise<void>;
};

const ctx = (): T.Ctx => ({ appUrl: env.appUrl, adminUrl: env.adminUrl, logoUrl: env.emailLogoUrl || undefined });

async function log(rows: { channel: string; recipient: string; kind: string; status: string; error: string | null }[]) {
  if (!rows.length) return;
  try {
    await db().from("notification_log").insert(rows);
  } catch {
    /* logging must never break the request */
  }
}

async function deliver(attempts: Attempt[]): Promise<{ sent: number }> {
  const results = await Promise.allSettled(attempts.map((a) => a.run()));
  const rows = attempts.map((a, i) => {
    const r = results[i];
    const error = r.status === "rejected" ? String((r.reason as Error)?.message ?? r.reason) : null;
    if (error) console.warn(`[notify] ${a.channel} ${a.kind} → ${a.recipient} failed: ${error}`);
    return { channel: a.channel, recipient: a.recipient, kind: a.kind, status: error ? "failed" : "sent", error };
  });
  await log(rows);
  return { sent: rows.filter((r) => r.status === "sent").length };
}

const email = (to: string | string[], kind: string, mail: T.Email, headers?: Record<string, string>): Attempt => ({
  channel: "email",
  recipient: Array.isArray(to) ? to.join(",") : to,
  kind,
  run: () => sendEmail({ ...mail, to, headers }),
});

const whatsapp = (to: string, kind: string, run: () => Promise<void>): Attempt => ({
  channel: "whatsapp",
  recipient: to,
  kind,
  run,
});

const naira = T.naira;
const firstName = (name?: string | null) => (name ?? "").trim().split(/\s+/)[0] || "there";

type Person = T.TplPerson;

function adminEmail(kind: string, mail: T.Email): Attempt[] {
  return env.adminNotifyEmails.length ? [email(env.adminNotifyEmails, kind, mail)] : [];
}

function adminWhatsapp(kind: string, text: string): Attempt[] {
  return env.adminNotifyWhatsapp.map((phone) => whatsapp(phone, kind, () => sendWhatsappAdmin(phone, text)));
}

// ───────────────────────── Codes & accounts ─────────────────────────

/** Sends the code on every channel we have for this person. */
export async function sendOtpCode(opts: {
  email?: string | null;
  phone?: string | null;
  code: string;
  purpose?: "signup" | "login" | "admin";
  name?: string | null;
}) {
  const attempts: Attempt[] = [];
  if (opts.phone) {
    const phone = opts.phone;
    attempts.push(whatsapp(phone, "otp", () => sendWhatsappOtp(phone, opts.code)));
  }
  if (opts.email) {
    attempts.push(
      email(opts.email, `otp_${opts.purpose ?? "login"}`, T.otpEmail(ctx(), { code: opts.code, purpose: opts.purpose ?? "login", name: opts.name })),
    );
  }
  return deliver(attempts);
}

export async function notifyWelcome(user: Person, via = "email") {
  const attempts: Attempt[] = [];
  if (user.email) attempts.push(email(user.email, "welcome", T.welcomeEmail(ctx(), { name: user.fullName })));
  attempts.push(...adminEmail("admin_signup", T.adminNewCustomerEmail(ctx(), { customer: user, via })));
  return deliver(attempts);
}

export async function notifyStaffInvite(opts: { email: string; fullName?: string | null; role: string }) {
  return deliver([email(opts.email, "staff_invite", T.staffInviteEmail(ctx(), { name: opts.fullName, role: opts.role }))]);
}

// ───────────────────────── Orders ─────────────────────────

export type OrderForNotify = T.TplOrder & { status: string };

const isPickup = (o: OrderForNotify) => o.fulfillment === "pickup";
const placeOf = (o: OrderForNotify) => {
  const a = o.addressSnapshot;
  return ((a && typeof a.formattedAddress === "string" && a.formattedAddress) || "").replace(/^Pickup · /, "");
};
const itemsLine = (o: OrderForNotify) => o.items.map((i) => `${i.nameSnapshot} ×${i.qty}`).join(", ");

export async function notifyOrderPlaced(order: OrderForNotify, customer: Person) {
  const name = firstName(customer.fullName);
  const track = `${env.appUrl}/orders/${order.id}/track`;
  const how = isPickup(order)
    ? `Pickup${placeOf(order) ? ` at ${placeOf(order)}` : ""}. We'll message you when it's ready.`
    : `Delivery to ${placeOf(order)}. The delivery fee is paid to the rider on arrival.`;
  const attempts: Attempt[] = [];

  if (customer.phone) {
    const phone = customer.phone;
    attempts.push(
      whatsapp(phone, "order_confirmed", () =>
        sendWhatsappUpdate(phone, name, `order ${order.orderNo}`, `payment received (${naira(order.total)}). ${how} Track: ${track}`),
      ),
    );
  }
  if (customer.email) {
    attempts.push(email(customer.email, "order_confirmed", T.orderConfirmedEmail(ctx(), { name: customer.fullName, order })));
  }

  attempts.push(...adminEmail("admin_new_order", T.adminNewOrderEmail(ctx(), { order, customer })));
  attempts.push(
    ...adminWhatsapp(
      "admin_new_order",
      `New paid ${isPickup(order) ? "PICKUP" : "DELIVERY"} order ${order.orderNo}: ${naira(order.total)} from ${customer.fullName} (${customer.phone || customer.email}). ${itemsLine(order)}.${isPickup(order) ? "" : ` Address: ${placeOf(order)}.`}${order.notes ? ` Note: ${order.notes}` : ""}`,
    ),
  );
  return deliver(attempts);
}

const STATUS_WHATSAPP: Record<string, string> = {
  seen: "the kitchen has seen your order.",
  accepted: "your order is confirmed and queued in the kitchen.",
  preparing: "your treats are being prepared now.",
  ready_for_delivery: "your order is packed and waiting for a rider.",
  out_for_delivery: "your order is on its way!",
  delivered: "your order has been delivered. Enjoy! 🍯",
  completed: "your order is complete. Thank you!",
  cancelled: "your order was cancelled.",
};

/** Emails go out for the milestones that matter; every step goes to WhatsApp. */
const EMAIL_MILESTONES = new Set(["out_for_delivery", "delivered", "completed", "cancelled"]);

export async function notifyOrderStatus(order: OrderForNotify, customer: Person, note?: string | null) {
  let message = STATUS_WHATSAPP[order.status];
  if (!message) return { sent: 0 };
  if (isPickup(order)) {
    if (order.status === "ready_for_delivery") {
      message = `your order is ready for pickup${placeOf(order) ? ` at ${placeOf(order)}` : ""}. See you soon!`;
    }
    if (order.status === "delivered") message = "you've picked up your order. Enjoy! 🍯";
  }
  if (order.status === "out_for_delivery" && order.delivery?.riderName) {
    const d = order.delivery;
    message += ` Rider: ${d.riderName}${d.riderPhone ? ` (${d.riderPhone})` : ""}${d.etaMinutes ? `, ETA about ${d.etaMinutes} min` : ""}. Please have the delivery fee ready for the rider.`;
  }
  if (order.status === "cancelled" && note) message += ` Reason: ${note}. Please reply here and we'll sort out a refund.`;

  const attempts: Attempt[] = [];
  if (customer.phone) {
    const phone = customer.phone;
    const name = firstName(customer.fullName);
    attempts.push(
      whatsapp(phone, `order_${order.status}`, () => sendWhatsappUpdate(phone, name, `order ${order.orderNo}`, message)),
    );
  }

  // Email: key milestones always; every step if they have no WhatsApp number.
  const pickupReady = isPickup(order) && order.status === "ready_for_delivery";
  if (customer.email && (EMAIL_MILESTONES.has(order.status) || pickupReady || !customer.phone)) {
    let mail: T.Email | null = null;
    if (order.status === "delivered" || order.status === "completed") {
      mail = T.orderCompletedEmail(ctx(), { name: customer.fullName, order });
    } else if (order.status === "cancelled") {
      mail = T.orderCancelledEmail(ctx(), { name: customer.fullName, order, reason: note });
    } else {
      mail = T.orderUpdateEmail(ctx(), { name: customer.fullName, order, status: order.status });
    }
    if (mail) attempts.push(email(customer.email, `order_${order.status}`, mail));
  }
  return deliver(attempts);
}

/** Admin heads-up when a payment needs a human to look at it. */
export async function notifyPaymentIssue(d: { orderNo: string; reference: string; message: string }) {
  return deliver([
    ...adminEmail("admin_payment_issue", T.adminPaymentIssueEmail(ctx(), d)),
    ...adminWhatsapp("admin_payment_issue", `⚠️ Check payment ${d.reference} (order ${d.orderNo}): ${d.message}`),
  ]);
}

// ───────────────────────── Events ─────────────────────────

export type EventForNotify = T.TplEvent;

export async function notifyEventBooked(ev: EventForNotify, customer: Person) {
  const name = firstName(customer.fullName);
  const summary = `${ev.type}${ev.title ? ` (${ev.title})` : ""}, ${ev.date} ${ev.time} in ${ev.city} (${ev.guests} guests)`;
  const attempts: Attempt[] = [];
  if (customer.phone) {
    const phone = customer.phone;
    attempts.push(
      whatsapp(phone, "event_received", () =>
        sendWhatsappUpdate(phone, name, `event request ${ev.refNo}`, `we've received your request: ${summary}. We'll send a quote shortly.`),
      ),
    );
  }
  if (customer.email) {
    attempts.push(email(customer.email, "event_received", T.eventReceivedEmail(ctx(), { name: customer.fullName, event: ev })));
  }
  attempts.push(...adminEmail("admin_new_event", T.adminNewEventEmail(ctx(), { event: ev, customer })));
  attempts.push(
    ...adminWhatsapp(
      "admin_new_event",
      `New event request ${ev.refNo}: ${summary}. Venue: ${ev.venueAddress}.${ev.budget ? ` Budget: ${naira(ev.budget)}.` : ""} Contact: ${customer.fullName} (${customer.phone || customer.email}).`,
    ),
  );
  return deliver(attempts);
}

export async function notifyEventUpdated(ev: EventForNotify, customer: Person) {
  const name = firstName(customer.fullName);
  const parts = [`status is now "${ev.status.replaceAll("_", " ")}"`];
  if (ev.quoteAmount) parts.push(`quote: ${naira(ev.quoteAmount)}`);
  if (ev.quoteNote) parts.push(ev.quoteNote);
  if (ev.quoteLink) parts.push(`details: ${ev.quoteLink}`);
  const attempts: Attempt[] = [];
  if (customer.phone) {
    const phone = customer.phone;
    attempts.push(whatsapp(phone, "event_update", () => sendWhatsappUpdate(phone, name, `event ${ev.refNo}`, parts.join(". "))));
  }
  if (customer.email) {
    attempts.push(email(customer.email, "event_update", T.eventUpdatedEmail(ctx(), { name: customer.fullName, event: ev })));
  }
  return deliver(attempts);
}

// ───────────────────────── Marketing ─────────────────────────

/**
 * "New on the menu" email to opted-in customers. Each recipient gets their
 * own unsubscribe link. Returns how many were sent.
 */
export async function announceProduct(
  product: T.TplProduct,
  recipients: { id: string; email: string; fullName?: string | null; unsubscribeUrl: string }[],
): Promise<number> {
  const kind = `product_announce:${product.id}`;
  const messages: OutgoingEmail[] = recipients.map((r) => ({
    ...T.newProductEmail(ctx(), { name: r.fullName, product, unsubscribeUrl: r.unsubscribeUrl }),
    to: r.email,
    headers: {
      "List-Unsubscribe": `<${r.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  }));
  try {
    const sent = await sendEmailBatch(messages);
    await log(recipients.map((r) => ({ channel: "email", recipient: r.email, kind, status: "sent", error: null })));
    return sent;
  } catch (e) {
    const error = (e as Error).message;
    console.warn("[notify] product announcement failed:", error);
    await log(recipients.map((r) => ({ channel: "email", recipient: r.email, kind, status: "failed", error })));
    throw e;
  }
}
