#!/usr/bin/env node
/**
 * Preview and test the email templates (apps/customer/src/server/notify/templates.ts).
 *
 *   npm run email:preview                  → writes every email to email-previews/ and opens the index
 *   npm run email:test -- you@example.com  → sends the sign-in code email through Resend (checks the connection)
 *   npm run email:test -- you@example.com all  → sends one of EVERY template (14 emails, counts toward 100/day)
 *
 * Uses sample data only, never real customers. Needs Node 22.18+ (runs the .ts file directly).
 */
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const [k, v] of Object.entries(parseEnv(fs.readFileSync(envFile, "utf8")))) if (!process.env[k]) process.env[k] = v;
}

const T = await import(pathToFileURL(path.join(root, "apps/customer/src/server/notify/templates.ts")).href);

const mode = process.argv[2]; // "preview" | "test"
const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const ctx = {
  appUrl,
  adminUrl: (process.env.ADMIN_APP_URL || "http://localhost:3001").replace(/\/$/, ""),
  logoUrl:
    process.env.EMAIL_LOGO_URL ||
    (mode === "preview"
      ? pathToFileURL(path.join(root, "apps/customer/public/assets/logo/logo.png")).href
      : `${appUrl}/assets/logo/logo.png`),
};

// ── sample data ────────────────────────────────────────────────────────
const order = {
  id: "00000000-0000-0000-0000-000000000000",
  orderNo: "DHT1042",
  items: [
    { nameSnapshot: "Wheat Chinchin · Midi", qty: 2, unitPrice: 350000 },
    { nameSnapshot: "Coconut Wheat Cake · Pack of 6", qty: 1, unitPrice: 800000 },
  ],
  subtotal: 1500000,
  discount: 0,
  total: 1500000,
  fulfillment: "delivery",
  addressSnapshot: { formattedAddress: "12 Admiralty Way, Lekki Phase 1, Lagos" },
  notes: "Please call on arrival",
  delivery: { riderName: "Tunde", riderPhone: "+2348012345678", etaMinutes: 25 },
};
const pickupOrder = { ...order, orderNo: "DHT1043", fulfillment: "pickup", addressSnapshot: { formattedAddress: "Pickup · 5 Bourdillon Rd, Ikoyi" } };
const event = {
  id: "00000000-0000-0000-0000-000000000001",
  refNo: "EVT512",
  type: "Birthday table",
  title: "Ada's 30th",
  date: "2026-12-12",
  time: "4:00 PM",
  city: "Lagos",
  venueAddress: "The Garden, Victoria Island",
  guests: 60,
  budget: 25000000,
  notes: "Pink and gold theme",
  status: "quote_sent",
  quoteAmount: 22000000,
  quoteNote: "Includes a 3-tier cake, 60 snack boxes and setup.",
  quoteLink: null,
};
const customer = { fullName: "Ada Okafor", email: "ada@example.com", phone: "+2348098765432" };
const product = {
  id: "item-sample",
  name: "Tigernut Wheat Cake",
  description: "Nutty tigernut wheat cake, high in fibre and naturally sweet.",
  image: null,
  basePrice: 150000,
  categorySlug: "cakes",
};

const all = [
  ["01-signup-code", T.otpEmail(ctx, { code: "482913", purpose: "signup", name: "Ada" })],
  ["02-signin-code", T.otpEmail(ctx, { code: "482913", purpose: "login", name: "Ada" })],
  ["03-admin-signin-code", T.otpEmail(ctx, { code: "482913", purpose: "admin" })],
  ["04-welcome", T.welcomeEmail(ctx, { name: "Ada Okafor" })],
  ["05-order-confirmed", T.orderConfirmedEmail(ctx, { name: "Ada", order })],
  ["06-order-on-the-way", T.orderUpdateEmail(ctx, { name: "Ada", order, status: "out_for_delivery" })],
  ["07-order-ready-for-pickup", T.orderUpdateEmail(ctx, { name: "Ada", order: pickupOrder, status: "ready_for_delivery" })],
  ["08-order-preparing", T.orderUpdateEmail(ctx, { name: "Ada", order, status: "preparing" })],
  ["09-order-complete-thank-you", T.orderCompletedEmail(ctx, { name: "Ada", order })],
  ["10-order-cancelled", T.orderCancelledEmail(ctx, { name: "Ada", order, reason: "Out of coconut today" })],
  ["11-event-received", T.eventReceivedEmail(ctx, { name: "Ada", event })],
  ["12-event-quote", T.eventUpdatedEmail(ctx, { name: "Ada", event })],
  ["13-new-product", T.newProductEmail(ctx, { name: "Ada", product, unsubscribeUrl: `${ctx.appUrl}/api/v1/email/unsubscribe?t=sample` })],
  ["14-staff-invite", T.staffInviteEmail(ctx, { name: "Bisi", role: "STAFF" })],
  ["15-admin-new-order", T.adminNewOrderEmail(ctx, { order, customer })],
  ["16-admin-new-event", T.adminNewEventEmail(ctx, { event, customer })],
  ["17-admin-new-customer", T.adminNewCustomerEmail(ctx, { customer, via: "Google" })],
  ["18-admin-payment-issue", T.adminPaymentIssueEmail(ctx, { orderNo: "DHT1042", reference: "DHT1042-9F3A21", message: "Paid ₦12,000 but the order total is ₦15,000." })],
];

if (mode === "preview") {
  const out = path.join(root, "email-previews");
  fs.mkdirSync(out, { recursive: true });
  for (const [name, mail] of all) fs.writeFileSync(path.join(out, `${name}.html`), mail.html);
  const index = `<!doctype html><meta charset="utf-8"><title>Email previews</title>
<body style="font-family:Helvetica,Arial,sans-serif;background:#F7F3EE;margin:0;padding:24px">
<h1 style="font-family:Georgia,serif;color:#3F5F46">Dripping Honey Treats emails (${all.length})</h1>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:20px">
${all
  .map(
    ([name, mail]) => `<div><p style="margin:0 0 4px;font-weight:600">${name}</p><p style="margin:0 0 8px;color:#6B6B6B;font-size:13px">Subject: ${mail.subject.replace(/</g, "&lt;")}</p>
<iframe src="${name}.html" style="width:100%;height:720px;border:0;border-radius:16px;background:#fff"></iframe></div>`,
  )
  .join("")}
</div></body>`;
  fs.writeFileSync(path.join(out, "index.html"), index);
  const file = path.join(out, "index.html");
  console.log(`Wrote ${all.length} previews → ${file}`);
  if (process.platform === "darwin") execFile("open", [file]);
} else if (mode === "test") {
  const to = process.argv[3];
  const which = process.argv[4] === "all" ? all : all.slice(1, 2);
  if (!to || !to.includes("@")) {
    console.error("Usage: npm run email:test -- you@example.com [all]");
    process.exit(1);
  }
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set in .env");
    process.exit(1);
  }
  if (process.env.SMTP_HOST) console.warn("Note: SMTP_HOST is set, so the APP will use SMTP, not Resend. Clear it to use Resend.\n");
  const from = process.env.EMAIL_FROM || "Dripping Honey Treats <hello@drippinghoneytreats.com>";
  const replyTo = process.env.EMAIL_REPLY_TO || "hello@drippinghoneytreats.com";
  for (const [name, mail] of which) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject: `[TEST] ${mail.subject}`, html: mail.html, text: mail.text }),
    });
    const body = await res.text();
    console.log(`${res.ok ? "✓" : "✗"} ${name}${res.ok ? "" : ` → ${res.status} ${body}`}`);
    if (!res.ok) {
      if (res.status === 403 && /domain/i.test(body)) {
        console.error("\nResend says the domain isn't verified yet. Finish Resend → Domains → Verify first.");
      }
      process.exit(1);
    }
  }
  console.log(`\nSent from ${from} to ${to}. Check the inbox (and spam the first time).`);
} else {
  console.log("Usage: npm run email:preview  |  npm run email:test -- you@example.com [all]");
}
