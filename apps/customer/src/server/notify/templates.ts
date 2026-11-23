/**
 * Branded transactional + marketing emails for Dripping Honey Treats.
 *
 * Pure functions: data in → { subject, preheader, html, text } out. No env
 * or DB access, so `npm run email:preview` can render every template locally.
 * Table-based HTML with inline styles = renders in Gmail, Outlook, Apple Mail.
 */

export type Email = { subject: string; preheader: string; html: string; text: string };
export type Ctx = {
  appUrl: string;
  adminUrl: string;
  /** Absolute logo URL that email apps can load (defaults to the site's logo). */
  logoUrl?: string;
};

export type TplItem = { nameSnapshot: string; qty: number; unitPrice: number };
export type TplOrder = {
  id: string;
  orderNo: string;
  items: TplItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  fulfillment?: "delivery" | "pickup";
  addressSnapshot?: Record<string, unknown> | null;
  notes?: string | null;
  delivery?: { riderName?: string | null; riderPhone?: string | null; etaMinutes?: number | null } | null;
};
export type TplEvent = {
  id: string;
  refNo: string;
  type: string;
  title?: string | null;
  date: string;
  time: string;
  city: string;
  venueAddress: string;
  guests: number;
  budget?: number | null;
  notes?: string | null;
  status: string;
  quoteAmount?: number | null;
  quoteNote?: string | null;
  quoteLink?: string | null;
};
export type TplPerson = { fullName?: string | null; email?: string | null; phone?: string | null };
export type TplProduct = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  basePrice: number;
  categorySlug?: string | null;
};

// ───────────────────────── Brand + helpers ─────────────────────────

const C = {
  deep: "#3F5F46",
  honey: "#D4A017",
  honeySoft: "#F3E2B0",
  blush: "#F6D5D0",
  cream: "#F7F3EE",
  sage: "#E4EDE3",
  text: "#2B2B2B",
  muted: "#6B6B6B",
  line: "#ECE6DE",
  danger: "#B42318",
};
const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const SITE = "www.drippinghoneytreats.com";
const CONTACT = "hello@drippinghoneytreats.com";
const ADDRESS = "14 White Sands Beach Estate, Lekki, Lagos";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const naira = (kobo: number) =>
  "₦" + Math.round((kobo ?? 0) / 100).toLocaleString("en-NG");

const first = (name?: string | null) => (name ?? "").trim().split(/\s+/)[0] || "there";

const addressOf = (o: TplOrder) => {
  const a = o.addressSnapshot;
  const s = a && typeof a.formattedAddress === "string" ? a.formattedAddress : "";
  return s.replace(/^Pickup · /, "");
};

function button(label: string, url: string, tone: "deep" | "honey" = "deep") {
  const bg = tone === "deep" ? C.deep : C.honey;
  const fg = tone === "deep" ? "#FFFFFF" : C.text;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="border-radius:999px;background:${bg}">
<a href="${esc(url)}" style="display:inline-block;padding:14px 26px;font:600 15px ${FONT};color:${fg};text-decoration:none;border-radius:999px">${esc(label)}</a>
</td></tr></table>`;
}

function para(text: string) {
  return `<p style="margin:0 0 14px;font:16px/1.6 ${FONT};color:${C.text}">${text}</p>`;
}

function small(text: string) {
  return `<p style="margin:12px 0 0;font:13px/1.6 ${FONT};color:${C.muted}">${text}</p>`;
}

function pill(label: string, tone: "deep" | "honey" | "danger" = "deep") {
  const map = {
    deep: [C.sage, C.deep],
    honey: [C.honeySoft, "#7A5A00"],
    danger: ["#FDECEA", C.danger],
  } as const;
  const [bg, fg] = map[tone];
  return `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${bg};color:${fg};font:700 11px ${FONT};letter-spacing:.08em;text-transform:uppercase">${esc(label)}</span>`;
}

function codeBox(code: string) {
  const spaced = esc(code);
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 18px"><tr>
<td align="center" style="background:${C.cream};border:1px dashed ${C.honey};border-radius:16px;padding:20px 12px">
<div style="font:700 30px/1 'Courier New',Courier,monospace;letter-spacing:6px;white-space:nowrap;color:${C.deep}">${spaced}</div>
<div style="margin-top:10px;font:12px ${FONT};color:${C.muted}">Expires in 10 minutes</div>
</td></tr></table>`;
}

/** Label/value rows (order details, event details). */
function rows(list: Array<[string, string | null | undefined]>) {
  const trs = list
    .filter(([, v]) => v)
    .map(
      ([k, v]) => `<tr>
<td style="padding:9px 0;border-bottom:1px solid ${C.line};font:13px ${FONT};color:${C.muted};width:38%;vertical-align:top">${esc(k)}</td>
<td style="padding:9px 0;border-bottom:1px solid ${C.line};font:600 14px ${FONT};color:${C.text};vertical-align:top">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 10px">${trs}</table>`;
}

/** Receipt table with totals. */
function receipt(o: TplOrder) {
  const lines = o.items
    .map(
      (i) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${C.line};font:14px ${FONT};color:${C.text}">${esc(i.nameSnapshot)} <span style="color:${C.muted}">× ${i.qty}</span></td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font:600 14px ${FONT};color:${C.text};white-space:nowrap">${naira(i.unitPrice * i.qty)}</td></tr>`,
    )
    .join("");
  const subtotal = o.subtotal ?? o.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const totals: Array<[string, string, boolean?]> = [["Subtotal", naira(subtotal)]];
  if (o.discount) totals.push(["Discount", "−" + naira(o.discount)]);
  totals.push([
    o.fulfillment === "pickup" ? "Pickup" : "Delivery",
    o.fulfillment === "pickup" ? "Free" : "Pay rider on arrival",
  ]);
  totals.push(["Paid", naira(o.total), true]);
  const tot = totals
    .map(
      ([k, v, strong]) => `<tr>
<td style="padding:6px 0;font:${strong ? "700 16px" : "14px"} ${FONT};color:${strong ? C.text : C.muted}">${esc(k)}</td>
<td align="right" style="padding:6px 0;font:${strong ? "700 18px" : "14px"} ${strong ? SERIF : FONT};color:${C.text};white-space:nowrap">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 4px">${lines}</table>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 8px">${tot}</table>`;
}

function fulfilmentBlock(o: TplOrder) {
  const where = addressOf(o);
  if (o.fulfillment === "pickup") {
    return rows([
      ["Collection", "Pickup"],
      ["Pickup address", where || "We'll send it on WhatsApp"],
    ]);
  }
  return rows([
    ["Collection", "Delivery"],
    ["Delivering to", where],
    ["Delivery fee", "Paid to the rider when your order arrives"],
  ]);
}

/** Shared shell: header with logo, white card, footer. */
function layout(
  ctx: Ctx,
  opts: { preheader: string; eyebrow?: string; heading: string; body: string; footerExtra?: string },
) {
  const logo = ctx.logoUrl || `${ctx.appUrl}/assets/logo/logo.png`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.cream}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="background:${C.deep};border-radius:24px 24px 0 0;padding:22px 20px">
<a href="${esc(ctx.appUrl)}" style="text-decoration:none">
<img src="${esc(logo)}" width="56" height="56" alt="Dripping Honey Treats" style="display:block;margin:0 auto 8px;border:0;border-radius:14px;background:#fff">
<span style="font:600 17px ${SERIF};color:#FFFFFF;letter-spacing:.02em">Dripping Honey Treats</span></a>
</td></tr>
<tr><td style="background:#FFFFFF;border-radius:0 0 24px 24px;padding:30px 28px 28px">
${opts.eyebrow ? `<div style="margin-bottom:10px">${opts.eyebrow}</div>` : ""}
<h1 style="margin:0 0 16px;font:600 26px/1.25 ${SERIF};color:${C.deep}">${esc(opts.heading)}</h1>
${opts.body}
</td></tr>
<tr><td align="center" style="padding:20px 10px 6px;font:12px/1.7 ${FONT};color:${C.muted}">
Fibre-rich treats, baked fresh in Lagos.<br>
${ADDRESS}<br>
<a href="https://${SITE}" style="color:${C.deep};text-decoration:none;font-weight:600">${SITE}</a> &nbsp;·&nbsp;
<a href="mailto:${CONTACT}" style="color:${C.deep};text-decoration:none">${CONTACT}</a>
${opts.footerExtra ?? ""}
</td></tr>
</table></td></tr></table></body></html>`;
}

function textFooter() {
  return `\n\n—\nDripping Honey Treats · ${ADDRESS}\nhttps://${SITE} · ${CONTACT}`;
}

// ───────────────────────── Customer: account ─────────────────────────

export function otpEmail(
  ctx: Ctx,
  d: { code: string; purpose: "signup" | "login" | "admin"; name?: string | null },
): Email {
  const subject =
    d.purpose === "signup"
      ? `${d.code} is your Dripping Honey Treats sign-up code`
      : d.purpose === "admin"
        ? `${d.code} is your admin sign-in code`
        : `${d.code} is your sign-in code`;
  const heading =
    d.purpose === "signup" ? "Confirm your email" : d.purpose === "admin" ? "Admin sign-in" : "Your sign-in code";
  const intro =
    d.purpose === "signup"
      ? `Hi ${esc(first(d.name))}, welcome! Enter this code to finish creating your account.`
      : d.purpose === "admin"
        ? "Enter this code on the admin dashboard to sign in."
        : `Hi ${esc(first(d.name))}, enter this code to sign in.`;
  return {
    subject,
    preheader: `Your code is ${d.code}. It expires in 10 minutes.`,
    html: layout(ctx, {
      preheader: `Your code is ${d.code}. It expires in 10 minutes.`,
      heading,
      body:
        para(intro) +
        codeBox(d.code) +
        small("Didn't ask for this? You can safely ignore this email. Nobody can sign in without the code."),
    }),
    text: `${heading}\n\n${intro.replace(/<[^>]+>/g, "")}\n\nYour code: ${d.code}\nIt expires in 10 minutes.\n\nDidn't ask for this? Ignore this email.${textFooter()}`,
  };
}

export function welcomeEmail(ctx: Ctx, d: { name?: string | null }): Email {
  const name = first(d.name);
  return {
    subject: "Welcome to Dripping Honey Treats 🍯",
    preheader: "Your account is ready. Here's how ordering works.",
    html: layout(ctx, {
      preheader: "Your account is ready. Here's how ordering works.",
      eyebrow: pill("Welcome", "honey"),
      heading: `So glad you're here, ${name}!`,
      body:
        para("Your account is ready. Fibre-rich chinchin, wheat cakes and puff-puff are a few taps away.") +
        rows([
          ["1. Pick your treats", "Choose sizes and packs from the menu"],
          ["2. Pickup or delivery", "Collect from us, or pay the rider on arrival"],
          ["3. Pay securely", "Card, bank transfer or USSD"],
          ["4. Stay posted", "Updates on WhatsApp until your treats arrive"],
        ]) +
        button("Start ordering", `${ctx.appUrl}/pastries`) +
        small("Planning a birthday, office treat or wedding table? We also do events across Lagos."),
    }),
    text: `So glad you're here, ${name}!\n\nYour account is ready. Order at ${ctx.appUrl}/pastries\n\nPickup or delivery (pay the rider on arrival) · secure payment · WhatsApp updates.${textFooter()}`,
  };
}

// ───────────────────────── Customer: orders ─────────────────────────

export function orderConfirmedEmail(ctx: Ctx, d: { name?: string | null; order: TplOrder }): Email {
  const o = d.order;
  const track = `${ctx.appUrl}/orders/${o.id}/track`;
  const pickup = o.fulfillment === "pickup";
  return {
    subject: `Order ${o.orderNo} confirmed: thank you!`,
    preheader: `We've received ${naira(o.total)}. ${pickup ? "We'll message you when it's ready for pickup." : "We'll update you as it's prepared and dispatched."}`,
    html: layout(ctx, {
      preheader: `We've received ${naira(o.total)} for order ${o.orderNo}.`,
      eyebrow: pill("Payment received"),
      heading: `Thank you, ${first(d.name)}!`,
      body:
        para(
          `Your order <strong>${esc(o.orderNo)}</strong> is confirmed and on its way to the kitchen. ${
            pickup
              ? "We'll message you on WhatsApp the moment it's ready to collect."
              : "We'll keep you posted on WhatsApp as it's prepared and sent out."
          }`,
        ) +
        receipt(o) +
        fulfilmentBlock(o) +
        (o.notes ? rows([["Your note", o.notes]]) : "") +
        button("Track your order", track) +
        small(`Questions? Just reply to this email or write to ${CONTACT}.`),
    }),
    text: `Thank you! Order ${o.orderNo} is confirmed.\n\n${o.items.map((i) => `${i.nameSnapshot} × ${i.qty}: ${naira(i.unitPrice * i.qty)}`).join("\n")}\nPaid: ${naira(o.total)}\n${pickup ? `Pickup: ${addressOf(o)}` : `Delivery to: ${addressOf(o)} (delivery fee paid to the rider on arrival)`}\n\nTrack: ${track}${textFooter()}`,
  };
}

const STATUS_COPY: Record<string, { pill: string; heading: string; body: string; tone?: "deep" | "honey" }> = {
  accepted: { pill: "Confirmed", heading: "Your order is confirmed", body: "The kitchen has accepted your order and it's in the queue." },
  preparing: { pill: "Preparing", heading: "Your treats are being made", body: "Our bakers are preparing your order right now.", tone: "honey" },
  ready_for_delivery: { pill: "Packed", heading: "Your order is packed", body: "Your order is packed and waiting for a rider." },
  ready_for_pickup: { pill: "Ready", heading: "Ready for pickup!", body: "Your order is ready. Come and collect it whenever you're ready.", tone: "honey" },
  out_for_delivery: { pill: "On the way", heading: "Your order is on its way!", body: "A rider is bringing your treats to you now.", tone: "honey" },
};

export function orderUpdateEmail(
  ctx: Ctx,
  d: { name?: string | null; order: TplOrder; status: string },
): Email | null {
  const o = d.order;
  const key = d.status === "ready_for_delivery" && o.fulfillment === "pickup" ? "ready_for_pickup" : d.status;
  const copy = STATUS_COPY[key];
  if (!copy) return null;
  const track = `${ctx.appUrl}/orders/${o.id}/track`;
  const extra: string[] = [];
  if (key === "out_for_delivery") {
    extra.push(
      rows([
        ["Rider", o.delivery?.riderName],
        ["Rider's phone", o.delivery?.riderPhone],
        ["Arriving in", o.delivery?.etaMinutes ? `about ${o.delivery.etaMinutes} minutes` : null],
        ["Delivering to", addressOf(o)],
      ]),
    );
    extra.push(
      `<div style="margin:6px 0 4px;padding:12px 14px;border-radius:14px;background:${C.honeySoft};font:14px/1.5 ${FONT};color:${C.text}">💵 Please have the <strong>delivery fee</strong> ready for the rider.</div>`,
    );
  }
  if (key === "ready_for_pickup") {
    extra.push(rows([["Pickup address", addressOf(o) || "We'll send it on WhatsApp"], ["Order", o.orderNo]]));
  }
  return {
    subject: `Order ${o.orderNo}: ${copy.heading}`,
    preheader: copy.body,
    html: layout(ctx, {
      preheader: copy.body,
      eyebrow: pill(copy.pill, copy.tone ?? "deep"),
      heading: copy.heading,
      body: para(`Hi ${esc(first(d.name))}, ${copy.body.charAt(0).toLowerCase()}${copy.body.slice(1)}`) + extra.join("") + button("Track your order", track),
    }),
    text: `${copy.heading}\n\nHi ${first(d.name)}, ${copy.body}${key === "out_for_delivery" && o.delivery?.riderName ? `\nRider: ${o.delivery.riderName} ${o.delivery.riderPhone ?? ""}\nPlease have the delivery fee ready.` : ""}\n\nTrack: ${track}${textFooter()}`,
  };
}

export function orderCompletedEmail(ctx: Ctx, d: { name?: string | null; order: TplOrder }): Email {
  const o = d.order;
  const pickup = o.fulfillment === "pickup";
  const heading = pickup ? "Enjoy your treats! 🍯" : "Delivered, enjoy! 🍯";
  return {
    subject: `Thank you for ordering, ${first(d.name)}! (${o.orderNo})`,
    preheader: "We hope every bite was worth it. Here's how to get more.",
    html: layout(ctx, {
      preheader: "We hope every bite was worth it.",
      eyebrow: pill(pickup ? "Picked up" : "Delivered"),
      heading,
      body:
        para(
          `Hi ${esc(first(d.name))}, your order <strong>${esc(o.orderNo)}</strong> is complete. Thank you for supporting us.`,
        ) +
        para("Loved it? Reorder in one tap, or reply to this email and tell us what you thought. We read every message.") +
        button("Order again", `${ctx.appUrl}/orders`, "honey") +
        small("Hosting something soon? We make dessert tables for birthdays, offices and weddings."),
    }),
    text: `${heading}\n\nYour order ${o.orderNo} is complete. Thank you for supporting us!\nOrder again: ${ctx.appUrl}/orders\nReply to tell us what you thought.${textFooter()}`,
  };
}

export function orderCancelledEmail(ctx: Ctx, d: { name?: string | null; order: TplOrder; reason?: string | null }): Email {
  const o = d.order;
  return {
    subject: `Order ${o.orderNo} was cancelled`,
    preheader: "We're sorry. Here's what happens next with your payment.",
    html: layout(ctx, {
      preheader: "We're sorry. Here's what happens next.",
      eyebrow: pill("Cancelled", "danger"),
      heading: "Your order was cancelled",
      body:
        para(`Hi ${esc(first(d.name))}, we're sorry, but we had to cancel order <strong>${esc(o.orderNo)}</strong>.`) +
        rows([
          ["Reason", d.reason || "Not available right now"],
          ["Amount paid", naira(o.total)],
        ]) +
        para("We'll refund your payment. Reply to this email or message us on WhatsApp if you'd like it sooner or prefer a different treat instead.") +
        button("Browse the menu", `${ctx.appUrl}/pastries`),
    }),
    text: `Your order ${o.orderNo} was cancelled.\nReason: ${d.reason || "Not available right now"}\nWe'll refund ${naira(o.total)}. Reply to this email if you need help.${textFooter()}`,
  };
}

// ───────────────────────── Customer: events ─────────────────────────

function eventRows(ev: TplEvent) {
  return rows([
    ["Reference", ev.refNo],
    ["Event", ev.title ? `${ev.type} · ${ev.title}` : ev.type],
    ["Date & time", `${ev.date}${ev.time ? `, ${ev.time}` : ""}`],
    ["Venue", `${ev.venueAddress}, ${ev.city}`],
    ["Guests", String(ev.guests)],
    ["Budget", ev.budget ? naira(ev.budget) : null],
  ]);
}

export function eventReceivedEmail(ctx: Ctx, d: { name?: string | null; event: TplEvent }): Email {
  const ev = d.event;
  return {
    subject: `We received your event request (${ev.refNo})`,
    preheader: "Our team will send you a quote shortly.",
    html: layout(ctx, {
      preheader: "Our team will send you a quote shortly.",
      eyebrow: pill("Request received", "honey"),
      heading: "Let's make it sweet 🎉",
      body:
        para(`Hi ${esc(first(d.name))}, thank you for thinking of us! Here's what you sent. We'll get back to you with a quote shortly.`) +
        eventRows(ev) +
        button("View your request", `${ctx.appUrl}/events/${ev.id}`),
    }),
    text: `We received your event request ${ev.refNo}: ${ev.type}, ${ev.date} ${ev.time}, ${ev.city}, ${ev.guests} guests.\nWe'll send a quote shortly.\n${ctx.appUrl}/events/${ev.id}${textFooter()}`,
  };
}

export function eventUpdatedEmail(ctx: Ctx, d: { name?: string | null; event: TplEvent }): Email {
  const ev = d.event;
  const hasQuote = Boolean(ev.quoteAmount);
  const statusLabel = ev.status.replaceAll("_", " ");
  return {
    subject: hasQuote ? `Your quote for ${ev.refNo} is ready` : `Update on your event request ${ev.refNo}`,
    preheader: hasQuote ? `Quote: ${naira(ev.quoteAmount!)}` : `Status: ${statusLabel}`,
    html: layout(ctx, {
      preheader: hasQuote ? `Quote: ${naira(ev.quoteAmount!)}` : `Status: ${statusLabel}`,
      eyebrow: pill(statusLabel, hasQuote ? "honey" : "deep"),
      heading: hasQuote ? "Your quote is ready" : "An update on your event",
      body:
        para(`Hi ${esc(first(d.name))}, here's the latest on your event request.`) +
        rows([
          ["Reference", ev.refNo],
          ["Status", statusLabel],
          ["Quote", ev.quoteAmount ? naira(ev.quoteAmount) : null],
          ["Note from us", ev.quoteNote],
        ]) +
        (ev.quoteLink ? button("View the full quote", ev.quoteLink, "honey") : button("View your request", `${ctx.appUrl}/events/${ev.id}`)) +
        small("Reply to this email or message us on WhatsApp to confirm or adjust anything."),
    }),
    text: `Update on ${ev.refNo}: ${statusLabel}${ev.quoteAmount ? `\nQuote: ${naira(ev.quoteAmount)}` : ""}${ev.quoteNote ? `\n${ev.quoteNote}` : ""}${ev.quoteLink ? `\n${ev.quoteLink}` : ""}${textFooter()}`,
  };
}

// ───────────────────────── Customer: marketing ─────────────────────────

export function newProductEmail(
  ctx: Ctx,
  d: { name?: string | null; product: TplProduct; unsubscribeUrl: string },
): Email {
  const p = d.product;
  const url = p.categorySlug ? `${ctx.appUrl}/pastries/${p.categorySlug}?item=${p.id}` : `${ctx.appUrl}/pastries`;
  const img = p.image
    ? `<a href="${esc(url)}"><img src="${esc(p.image)}" width="504" alt="${esc(p.name)}" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:18px;margin:0 0 18px;background:${C.cream}"></a>`
    : "";
  return {
    subject: `New on the menu: ${p.name} ✨`,
    preheader: p.description ?? `Fresh from our kitchen, from ${naira(p.basePrice)}.`,
    html: layout(ctx, {
      preheader: p.description ?? `Fresh from our kitchen, from ${naira(p.basePrice)}.`,
      eyebrow: pill("New on the menu", "honey"),
      heading: p.name,
      body:
        img +
        para(`Hi ${esc(first(d.name))}, something new just came out of our oven.`) +
        (p.description ? para(esc(p.description)) : "") +
        para(`<strong style="font:700 20px ${SERIF};color:${C.deep}">From ${naira(p.basePrice)}</strong>`) +
        button("Order now", url, "honey"),
      footerExtra: `<br><a href="${esc(d.unsubscribeUrl)}" style="color:${C.muted}">Unsubscribe from menu updates</a>`,
    }),
    text: `New on the menu: ${p.name}\n${p.description ?? ""}\nFrom ${naira(p.basePrice)}\nOrder: ${url}\n\nUnsubscribe: ${d.unsubscribeUrl}${textFooter()}`,
  };
}

// ───────────────────────── Staff & admin ─────────────────────────

export function staffInviteEmail(ctx: Ctx, d: { name?: string | null; role: string }): Email {
  const role = d.role === "SUPER_ADMIN" ? "super admin" : "admin";
  return {
    subject: "You've been added to the Dripping Honey Treats admin",
    preheader: `You now have ${role} access.`,
    html: layout(ctx, {
      preheader: `You now have ${role} access.`,
      eyebrow: pill("Team access"),
      heading: `Welcome to the team, ${first(d.name)}`,
      body:
        para(`You now have <strong>${role}</strong> access to the admin dashboard: orders, menu, promos and events.`) +
        para("Sign in with this email address. We'll send you a one-time code, so there's no password to remember.") +
        button("Open the admin dashboard", `${ctx.adminUrl}/login`),
    }),
    text: `You now have ${role} access to the Dripping Honey Treats admin.\nSign in with this email: ${ctx.adminUrl}/login${textFooter()}`,
  };
}

export function adminNewOrderEmail(ctx: Ctx, d: { order: TplOrder; customer: TplPerson }): Email {
  const o = d.order;
  const pickup = o.fulfillment === "pickup";
  return {
    subject: `🛎️ New ${pickup ? "PICKUP" : "DELIVERY"} order ${o.orderNo}: ${naira(o.total)}`,
    preheader: `${d.customer.fullName ?? "A customer"} · ${o.items.length} item(s)`,
    html: layout(ctx, {
      preheader: `${d.customer.fullName ?? "A customer"} · ${o.items.length} item(s)`,
      eyebrow: pill(pickup ? "Pickup" : "Delivery", "honey"),
      heading: `New order ${o.orderNo}`,
      body:
        rows([
          ["Customer", d.customer.fullName],
          ["Phone", d.customer.phone],
          ["Email", d.customer.email],
          ["Note", o.notes],
        ]) +
        receipt(o) +
        fulfilmentBlock(o) +
        button("Open orders", `${ctx.adminUrl}/orders`),
    }),
    text: `New ${pickup ? "PICKUP" : "DELIVERY"} order ${o.orderNo}: ${naira(o.total)}\n${d.customer.fullName} · ${d.customer.phone ?? ""} ${d.customer.email ?? ""}\n${o.items.map((i) => `${i.nameSnapshot} × ${i.qty}`).join(", ")}\n${pickup ? "Pickup" : `Deliver to: ${addressOf(o)}`}${o.notes ? `\nNote: ${o.notes}` : ""}\n${ctx.adminUrl}/orders`,
  };
}

export function adminNewEventEmail(ctx: Ctx, d: { event: TplEvent; customer: TplPerson }): Email {
  const ev = d.event;
  return {
    subject: `🎉 New event request ${ev.refNo}: ${ev.type}, ${ev.date}`,
    preheader: `${d.customer.fullName ?? "A customer"} · ${ev.guests} guests · ${ev.city}`,
    html: layout(ctx, {
      preheader: `${d.customer.fullName ?? "A customer"} · ${ev.guests} guests`,
      eyebrow: pill("Event request", "honey"),
      heading: `New event request ${ev.refNo}`,
      body:
        rows([
          ["Customer", d.customer.fullName],
          ["Phone", d.customer.phone],
          ["Email", d.customer.email],
        ]) +
        eventRows(ev) +
        (ev.notes ? rows([["Notes", ev.notes]]) : "") +
        button("Open events", `${ctx.adminUrl}/events`),
    }),
    text: `New event request ${ev.refNo}: ${ev.type}, ${ev.date} ${ev.time}, ${ev.city}, ${ev.guests} guests.\n${d.customer.fullName} · ${d.customer.phone ?? ""} ${d.customer.email ?? ""}\n${ctx.adminUrl}/events`,
  };
}

export function adminNewCustomerEmail(ctx: Ctx, d: { customer: TplPerson; via: string }): Email {
  return {
    subject: `New customer: ${d.customer.fullName || d.customer.email || d.customer.phone}`,
    preheader: `Signed up with ${d.via}`,
    html: layout(ctx, {
      preheader: `Signed up with ${d.via}`,
      eyebrow: pill("New customer"),
      heading: "Someone new just joined",
      body:
        rows([
          ["Name", d.customer.fullName],
          ["Email", d.customer.email],
          ["Phone", d.customer.phone],
          ["Signed up with", d.via],
        ]) + button("View customers", `${ctx.adminUrl}/users`),
    }),
    text: `New customer: ${d.customer.fullName} (${d.customer.email ?? d.customer.phone}) via ${d.via}\n${ctx.adminUrl}/users`,
  };
}

export function adminPaymentIssueEmail(ctx: Ctx, d: { orderNo: string; reference: string; message: string }): Email {
  return {
    subject: `⚠️ Check payment ${d.reference} (order ${d.orderNo})`,
    preheader: d.message,
    html: layout(ctx, {
      preheader: d.message,
      eyebrow: pill("Needs attention", "danger"),
      heading: "A payment needs a manual check",
      body:
        rows([
          ["Order", d.orderNo],
          ["Payment reference", d.reference],
          ["What happened", d.message],
        ]) +
        para("Check this transaction in your payment gateway dashboard (Paystack / Flutterwave) before preparing the order.") +
        button("Open orders", `${ctx.adminUrl}/orders`),
    }),
    text: `Check payment ${d.reference} for order ${d.orderNo}: ${d.message}\nVerify it in the payment gateway dashboard.`,
  };
}
