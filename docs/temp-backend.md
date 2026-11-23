# Temporary backend (launch setup)

The real API (`apps/api` / `../server`) isn't ready, so the customer app now has its
own backend at **`/api/v1/*`** (Next.js route handlers in `apps/customer/src/server/`)
backed by **Supabase** (free hosted Postgres with a spreadsheet-style dashboard).

It uses the **same endpoints** the apps already call (`/auth/*`, `/orders/*`,
`/payments/*`, `/admin/*`). When the real API is ready, point
`NEXT_PUBLIC_API_URL` at it; no UI changes are needed.

```
customer site ──/api/v1──▶ src/server/routes/* ──▶ Supabase (data + photo storage)
admin site ──/api/v1 (proxy)──┘        │
                                       ├─▶ Email (Gmail SMTP or Resend)
                                       ├─▶ WhatsApp Cloud API
                                       └─▶ Flutterwave (payments/ folder: + Paystack, Kora)
```

## Who gets what

| Event | Customer | Admin (`ADMIN_NOTIFY_*`) |
|---|---|---|
| Sign-up / login code | WhatsApp **and** email (every channel on file) | — |
| Ready (pickup orders) | WhatsApp "ready for pickup at …" | — |
| New account | Welcome email | Email |
| Order paid | WhatsApp + email confirmation | WhatsApp + email |
| Admin changes order status / dispatches rider | WhatsApp (email if no phone) | — |
| Event request | WhatsApp + email | WhatsApp + email |
| Admin sends event quote / status | WhatsApp + email | — |

Every send is recorded in the **`notification_log`** table. Check it first when
someone says "I didn't get my code".

---

## 1. Supabase (≈5 min)

1. Create a free project at https://supabase.com (region: closest to Lagos, e.g. `eu-west`).
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
3. **New query** → paste `supabase/seed.sql` → **Run**.
   This loads the menu from the PRODUCT IN FULL sheet (chinchin, cakes, puff-puff).
4. **Project settings → API**: copy the Project URL into `SUPABASE_URL` and the
   **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`. The service_role key
   is server-only; never put it in a `NEXT_PUBLIC_` variable.
5. **Table editor → settings** (one row): set `pickup_address` (e.g. `12 Admiralty Way, Lekki`),
   `pickup_hours` (e.g. `Mon–Sat, 9am–6pm`) and `whatsapp_number`. Set `pickup_enabled` to false to offer delivery only.

> **Pickup or delivery:** customers choose at checkout. Delivery is **never charged online**.
> The customer must tick *"I agree to pay the delivery fee to the rider when my order arrives"*,
> and the online total is items only.

> All money in the database is **kobo** (₦1 = 100). The admin dashboard forms use naira.

### Managing data without the admin dashboard

Everything is editable in **Supabase → Table editor**:
- `items`: `status` = `available` / `few_left` / `sold_out` / `pre_order`; `active=false` hides an item;
  `popular=true` puts it on the home screen; `variants` is JSON, e.g.
  `[{"id":"v-x-3","name":"Pack of 3","price":400000}]`. **Don't change an existing variant `id`**,
  because carts reference it.
- `orders`: you can change `status` here, but **use the admin dashboard** to send the customer a WhatsApp.
- `promos`: add a row (`code` in UPPER CASE, `type` `percent`/`fixed`, `value` = % or kobo).
- `users`: set `role` to `STAFF` / `SUPER_ADMIN` to give admin access.

## 2. Email: sends as hello@drippinghoneytreats.com

The mailbox is on **Zoho Mail** and the domain's DNS is on **Netlify DNS**.

**Resend (recommended, free 3,000 emails/month, works on any Zoho plan):**
1. https://resend.com → **Domains → Add domain** → `drippinghoneytreats.com` (region: Ireland/EU).
2. Netlify → **Domains → drippinghoneytreats.com → DNS settings → Add record**: add each record Resend
   shows (an MX + TXT on the `send` subdomain and a DKIM TXT `resend._domainkey`). These don't
   touch Zoho's records, so your inbox keeps working. Click **Verify** in Resend.
3. **API Keys → Create** (Sending access) → set `RESEND_API_KEY`, and leave `SMTP_HOST` empty.

**Zoho SMTP (only on a paid Zoho plan; the free plan has no SMTP):** Zoho → My Account → Security →
App Passwords → create one, then set `SMTP_HOST=smtp.zoho.com`, `SMTP_PORT=465`,
`SMTP_USER=hello@drippinghoneytreats.com`, `SMTP_PASS=<app password>`.

Either way, emails come **from** `hello@drippinghoneytreats.com` and customer replies go to your Zoho inbox.

**Templates** live in `apps/customer/src/server/notify/templates.ts` (18 branded emails: sign-up /
sign-in / admin codes, welcome, order confirmed, on the way, ready for pickup, complete & thank you,
cancelled, event received / quote, new product, staff invite, and admin alerts).
- `npm run email:preview`: opens every email in your browser with sample data.
- `npm run email:test -- you@example.com`: sends a real test email through Resend (`all` sends every template).
- **New-product emails:** Admin → Catalogue → **Announce** on a product. Goes to opted-in customers,
  90 per press (Resend free = 100/day), never twice to the same person, with one-click unsubscribe.

## 2b. Product photos: Cloudinary (≈3 min, recommended)

Supabase's free plan has 1 GB of file storage and 5 GB/month of downloads, and photos
use that up fastest. Cloudinary's free plan (25 monthly credits ≈ 25 GB of storage + bandwidth)
also serves every photo as WebP/AVIF at the right size, often 70–90% smaller.

1. Sign up at https://cloudinary.com → **Dashboard**: copy *Cloud name*, *API Key*, *API Secret*.
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Admin uploads then go **straight from the browser to Cloudinary** (signed by our server, up to
8 MB each). If these are empty, uploads fall back to Supabase Storage (4 MB each).
Each product can have **1 main photo + 4 more**. In admin, upload several at once and tap
**★ Main** to choose the cover.

The Supabase database itself (500 MB free) only stores text (orders, users, products), which is
enough for hundreds of thousands of orders.

## 3. WhatsApp Cloud API

1. https://developers.facebook.com → Create app → **Business** → add **WhatsApp**.
2. WhatsApp → API Setup: add and verify the business phone number. Copy the
   **Phone number ID** into `WHATSAPP_PHONE_NUMBER_ID`.
3. Create a **permanent token**: Business Settings → System users → add an admin system user →
   Generate token with `whatsapp_business_messaging` + `whatsapp_business_management`, then set `WHATSAPP_TOKEN`.
   (The 24-hour temporary token on API Setup is fine for testing only.)
4. WhatsApp Manager → **Message templates**. Create these three (language: English):

| Env var | Name (suggested) | Category | Content |
|---|---|---|---|
| `WHATSAPP_TEMPLATE_OTP` | `dht_otp` | **Authentication** | Code delivery: *Copy code* button. Meta writes the body. |
| `WHATSAPP_TEMPLATE_UPDATE` | `dht_update` | **Utility** | `Hi {{1}}, here's an update on your {{2}}: {{3}}` *(new line)* `Thank you for choosing Dripping Honey Treats.` |
| `WHATSAPP_TEMPLATE_ADMIN` | `dht_admin_alert` | **Utility** | `Dripping Honey Treats alert: {{1}}` *(new line)* `Open the admin dashboard for details.` |

   Sample values for review: `{{1}}` = `Ada`, `{{2}}` = `order DHT1001`, `{{3}}` = `your order is on its way!`

> ⚠️ WhatsApp only lets a business message people first through **approved
> templates**. Until they're approved (usually minutes, sometimes hours) leave the
> template vars empty. The app then sends plain text, which **only reaches numbers
> that messaged your business number in the last 24 h**. For launch day, email codes
> and Google sign-in work regardless.

## 4. Flutterwave

1. Dashboard → Settings → **API keys**: copy the secret key into `FLW_SECRET_KEY`
   (`FLWSECK_TEST-…` for test mode, `FLWSECK-…` for live).
2. Settings → **Webhooks**: URL = `https://<customer-site>/api/v1/payments/webhook/flutterwave`,
   **Secret hash** = any long random string. Put the same string in `FLW_SECRET_HASH`.
   Tick *charge.completed*.
3. `PAYMENT_PROVIDER=flutterwave`.

The server always re-verifies with Flutterwave (amount + currency) before marking
an order paid. The redirect, page polling and webhook can arrive in any order.

**Paystack** (popup on our page, hosted page as fallback):
1. Paystack → Settings → API Keys & Webhooks: copy `PAYSTACK_PUBLIC_KEY` (pk_…) and
   `PAYSTACK_SECRET_KEY` (sk_…). Use both test or both live keys.
2. Same page: Webhook URL `{APP_URL}/api/v1/payments/webhook/paystack`,
   Callback URL `{APP_URL}/payment/callback`. Webhooks are signed with the secret key
   (no separate hash).
3. `PAYMENT_PROVIDER=paystack`.

**Kora:** built in `apps/customer/src/server/payments/` but not yet tested against a live
account. Set `KORA_SECRET_KEY`, `PAYMENT_PROVIDER=kora`, webhook `…/api/v1/payments/webhook/kora`.

Switching gateways is safe: payments that are already pending keep verifying with the
gateway that created them.

## 5. Google sign-in

1. https://console.cloud.google.com → APIs & Services → **OAuth consent screen**
   (External, app name, support email, logo) → **Publish app**.
2. Credentials → Create **OAuth client ID** → *Web application*.
   - Authorized JavaScript origin: `https://<customer-site>`
   - Authorized redirect URI: `https://<customer-site>/api/v1/auth/google/callback`
   - (local: `http://localhost:3000` and `http://localhost:3000/api/v1/auth/google/callback`)
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The "Continue with Google"
   button only appears once both are set.

Google users have no phone number, so checkout asks for a WhatsApp number on the
address step. Their delivery updates go there.

## 6. Netlify

**Customer site** (existing). In Site settings → Environment variables, add every
server variable from the root `.env.example` (CUSTOMER section):
`APP_URL` (exact public URL, no trailing slash), `ADMIN_APP_URL`, `SESSION_SECRET`
(`openssl rand -hex 32`), `SUPABASE_*`, `ADMIN_EMAILS`, `ADMIN_NOTIFY_EMAILS`,
`ADMIN_NOTIFY_WHATSAPP`, `CLOUDINARY_*`, `SMTP_*` (or `RESEND_API_KEY`), `WHATSAPP_*`, `GOOGLE_*`,
`PAYMENT_PROVIDER`, `FLW_*`, plus `NEXT_PUBLIC_WHATSAPP` (real business number).
Do **not** set `DEV_OTP_CODE` in production.

**Admin site** (new Netlify site, same repo). Package directory: `apps/admin`.
Env: `TEMP_API_ORIGIN=https://<customer-site>`. `apps/admin/netlify.toml` covers the rest.

Admin sign-in: go to `/login` and enter an email listed in `ADMIN_EMAILS`. A code
arrives by email. Super admins add other staff under **Staff**.

## 7. Launch checklist

- [ ] Schema + seed run; `settings.pickup_address` / `pickup_hours` set
- [ ] All env vars set on both Netlify sites; redeploy both
- [ ] `https://<customer-site>/api/v1/health` returns `{"ok":true}`
- [ ] Email code arrives (Gmail app password set)
- [ ] WhatsApp code arrives (templates approved)
- [ ] Google sign-in round-trips
- [ ] Test-mode Flutterwave order: confirmation on WhatsApp + email; admin alert received
- [ ] Delivery order: box must be ticked; total excludes delivery; Accept → Preparing → Ready → Out for delivery (rider) → Delivered, with a WhatsApp at each step
- [ ] Pickup order: Ready for pickup (WhatsApp shows the pickup address) → Picked up
- [ ] Switch Flutterwave to the **live** secret key

## Local development

```bash
cp .env.example .env    # ONE file at the repo root, read by both apps. Fill it in.
rm apps/customer/.env.local apps/admin/.env.local   # old files: they override .env with localhost:4000
npm run dev:customer   # :3000 (app + /api/v1)
npm run dev:admin      # :3001 (proxies /api/v1 → :3000)
```
Set `DEV_OTP_CODE=123456` locally to sign in without sending messages (ignored in production).

## Moving to the real backend later

1. Export Supabase tables (Table editor → Export CSV, or `pg_dump`) and import into the real DB.
2. Set `NEXT_PUBLIC_API_URL` to the real API on both sites (admin: remove `TEMP_API_ORIGIN`).
3. Delete `apps/customer/src/server` and `apps/customer/src/app/api`.
