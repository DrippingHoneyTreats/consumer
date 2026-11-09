# PRD (Backend): Dripping Honey Treats API

**Scope:** NestJS API, PostgreSQL data model, integrations, realtime and admin APIs. UI behaviour is in `PRD_FRONTEND.md`. Section numbers match the full PRD so prompts can refer to them.
**Timezone:** Africa/Lagos. **Currency:** NGN, stored as integer kobo.

---

## 1. Overview
API for a pastry-ordering and event-booking PWA for Dripping Honey Treats (pastry delivery in Lagos; events in Lagos, and Ibadan when booked early). It handles OTP accounts, catalogue, one-draft-order carts, distance-based delivery fees, gateway payments with webhooks, real-time order tracking, event requests and an admin dashboard.

**Goals:** server is the source of truth for prices, fees, totals and statuses; payments are safe (no double charge, amount verified); order status changes reach customers in seconds; configuration lives in admin settings.
**Non-goals (MVP):** rider app/dispatch automation, loyalty, multi-branch inventory, in-app event payments, automated refunds.

## 2. Actors
Customer (guest or authenticated), Staff admin, Super Admin, external systems (payment gateway webhooks, WhatsApp/SMS/email providers, Google Maps).

## 3. Scope
**MVP:** auth + OTP, catalogue and home feed, wishlist, cart/orders, delivery quote, payments + webhook + reconciliation, realtime tracking, events, notifications, admin APIs, promo codes.
**Should have:** web push, scheduled orders, reorder, delivery confirmation code, order notes.
**Later:** loyalty, referrals, event payments/invoices, rider app.

---

## 6. Core Flows (backend view)
1. **Register/login:** register or login with phone/email → OTP sent (WhatsApp, SMS fallback, or email) → verify → session cookies.
2. **Cart:** one `draft` order per user; add/update/remove items; qty 0 removes the item.
3. **Checkout:** require authenticated user and address → `POST /delivery/quote` → server recomputes totals → `POST /payments/initiate` → gateway → webhook → order `placed` → realtime event + notifications.
4. **Fulfilment:** admin moves the order through statuses; each change logs and emits events.
5. **Events:** customer submits a request → admin reviews, quotes, confirms.

---

## 7. Functional Requirements

### 7.1 Authentication
| ID | Requirement |
|---|---|
| AUTH-1 | Collect full name (min 2 chars) and phone or email. Phone accepts Nigerian formats and is normalised to E.164. |
| AUTH-2 | OTP: 6 digits, 5 min expiry, max 5 verify attempts, max 3 sends per 15 min per contact and per IP/device. Store hashed. |
| AUTH-3 | Phone OTP via WhatsApp (preferred) with automatic SMS fallback on failure or request. Email OTP via transactional email. |
| AUTH-4 | Login = phone/email + OTP. No passwords for customers. |
| AUTH-5 | Short-lived access token + rotating refresh token in httpOnly secure cookies. |
| AUTH-6 | Guest cart is client-side; provide an endpoint/logic to merge it into the account draft after login (quantities summed). |
| AUTH-7 | Phone and email unique per account. Register with an existing contact → switch to login flow and send OTP. |
| AUTH-8 | Users can add the second contact later (verified by OTP). |
| AUTH-9 | Record consent timestamp (NDPR). Support data export and account deletion. |

### 7.3 Catalogue rules
- Item status values: `available`, `few_left`, `sold_out`, `pre_order` (with `lead_time_hours`). `sold_out` items cannot be added.
- Items have optional variants (name + price) and per-item `max_qty`.
- One active draft order per user; items from any category join the same draft.
- Wishlist is separate from the cart and requires an account.

### 7.4 Cart and order rules
- Add item: validate availability, variant, max qty; snapshot name and unit price in `OrderItem`.
- Update qty: allowed only while the order status is `draft`; qty 0 deletes the item; empty drafts remain valid.
- Totals (subtotal, delivery fee, discount, total) are computed server-side on every change; never accept client totals.
- Re-validate stock and prices at payment initiation; return a clear error listing changed/sold-out items.
- Paid orders are read-only for customers. Customer cancel request allowed before `preparing` (admin approves in MVP).
- Orders list tabs: **Ongoing** = `draft, pending_payment, placed, seen, accepted, preparing, ready_for_delivery, out_for_delivery`; **Completed** = `delivered`; **Cancelled** = `cancelled`.
- Reorder copies items from a completed order into a new draft (skipping unavailable items).

### 7.6 Address and delivery fee
- Addresses store formatted address, lat/lng, place ID, landmark, note, contact phone, default flag.
- Autocomplete endpoint proxies Google Places (Nigeria only, biased to Lagos); keep the API key server-side.
- Distance: Google Distance Matrix (driving) from kitchen coordinates; fallback haversine x 1.3.
- Formula: `fee = base_fee + max(0, distance_km - free_km) x per_km_rate`, rounded to nearest ₦50, clamped to `min_fee` and `max_fee`; free-delivery threshold supported.
- Placeholder defaults (business to confirm): base ₦1,000, free first 3 km, ₦150/km after, min ₦1,000, max ₦6,000, max radius 30 km.
- Beyond max radius → reject with a clear error code. Fee is stored on the order with distance and recomputed when the address changes. All values come from admin `Settings`.
- Respect operating hours and the pause-orders flag when initiating payment (allow scheduled orders where enabled).

### 7.7 Payments
- `PaymentProvider` interface; Paystack default, Flutterwave swappable.
- `POST /payments/initiate`: validate order and address, lock totals, create `Payment` with unique reference (idempotency key), call gateway initialise, return the authorisation URL. Order → `pending_payment`.
- **Webhook is the source of truth:** verify signature, process idempotently by reference, check currency and that paid amount (kobo) equals order total, then set order `placed`, write status log, emit realtime event, send notifications.
- `GET /payments/:ref/status` for client polling. `POST /payments/verify` calls the gateway to verify a reference (for "I have made this payment").
- Reconciliation job (BullMQ): re-verify `pending` payments every 2 minutes for 1 hour.
- Failed/abandoned: keep the order retryable; never create a second charge for the same order reference.
- Refunds are triggered manually from admin in MVP and recorded on `Payment`.
- Never store card data; store gateway payload for audit.

### 7.8 Order tracking and status workflow
Allowed transitions:

`draft → pending_payment → placed → seen → accepted → preparing → ready_for_delivery → out_for_delivery → delivered`; `cancelled` from `placed/seen/accepted` (admin) or customer request before `preparing`; `payment_failed` from `pending_payment`.

- Each change writes `OrderStatusLog` (who, when, note) and emits `order.status_changed`.
- `seen` is set automatically when an admin opens a placed order.
- `out_for_delivery` requires rider name, rider phone and ETA minutes (stored in `Delivery`); emit `order.delivery_updated`.
- Backwards transitions: Super Admin only, always logged.
- Optional 4-digit delivery confirmation code (Should have).
- Realtime: Socket.IO gateway. Channels `order:{id}` (owner only) and `admin:orders` (admins). Authorise every subscription. Events: `order.new`, `order.status_changed`, `order.delivery_updated`. Clients also have REST polling as a fallback.

### 7.9 Events
- `EventRequest` status: `submitted, reviewing, quote_sent, confirmed, completed, cancelled`.
- Fields: type, title, date, time, city (`EventCity`: Lagos or Ibadan only), venue address, guests, budget, services[], notes, contact method.
- Coverage: pastry order delivery is Lagos-only (maps/fee radius). Events may be Lagos or Ibadan; Ibadan means travel and needs early booking (`min_event_lead_days`).
- Validation: date at least `min_event_lead_days` (default 3) ahead; customer can edit until `confirmed`; cancel allowed before `completed`.
- Admin: filter by city/status/date, change status, internal notes, attach quote (amount, notes, link/PDF), assign staff. Notify the customer on status changes. Event type cards are admin-editable content.
- Event payments/deposits are out of scope for MVP (manual transfer).

### 7.12 Notifications
| Trigger | Channels |
|---|---|
| OTP | WhatsApp/SMS or email |
| Payment success, order status changes | In-app, web push, WhatsApp (optional), email receipt |
| Event received / quote sent / confirmed | In-app, email, WhatsApp |
| Abandoned cart (draft idle 2h) | Push/WhatsApp (opt-in) |
| Promos | Push (opt-in) |

Store notifications in DB (unread count); respect user channel preferences; send through queues with retries.

---

## 8. Admin APIs (role-based: Super Admin, Staff)
Login by email + OTP. Endpoints and rules for: live orders (list, status update, delivery details, reject with reason), order history (filters, search, CSV export), catalogue CRUD (categories, items, variants, images, status, max qty, sort), banners (schedule, priority, CTA target) and promo codes (% or fixed, min order, expiry, usage limit), delivery settings (kitchen coordinates, fee parameters, max radius, free-delivery threshold, operating hours, pause flag), events management, customers, reports (daily sales, orders by status, top items, average delivery distance, event leads by city), staff accounts and notification templates. Keep an admin audit log for all writes.

---

## 10. Data Model (core entities)
| Entity | Key fields |
|---|---|
| User | id, full_name, phone (E.164, unique, nullable), email (unique, nullable), phone_verified, email_verified, avatar, birthday, role, consent_at, created_at |
| OtpRequest | id, user_id/contact, channel, code_hash, expires_at, attempts, status |
| Address | id, user_id, label, formatted_address, lat, lng, place_id, landmark, note, contact_phone, is_default |
| Category | id, name, slug, image, sort, active |
| Item | id, category_id, name, description, images, base_price, status, max_qty, lead_time_hours, active |
| ItemVariant | id, item_id, name, price |
| Wishlist | user_id, item_id |
| Order | id, order_no, user_id, status, subtotal, delivery_fee, discount, total, address_snapshot, distance_km, notes, scheduled_for, promo_id, created_at |
| OrderItem | id, order_id, item_id, variant_id, name_snapshot, unit_price, qty, note |
| OrderStatusLog | id, order_id, status, set_by, note, created_at |
| Delivery | order_id, rider_name, rider_phone, vehicle, eta_minutes, dispatched_at |
| Payment | id, order_id, gateway, reference, amount, currency, status, raw_payload, paid_at |
| Banner | id, title, image, cta_type, cta_target, start_at, end_at, priority, active |
| Promo | id, code, type, value, min_order, expires_at, usage_limit |
| EventRequest | id, ref_no, user_id, type, title, date, time, city, venue_address, guests, budget, services[], notes, contact_method, status, quote_amount, quote_note, assigned_to |
| Notification | id, user_id, type, title, body, read, created_at |
| Settings | delivery config, hours, kitchen coordinates, pause flag, min_event_lead_days |

Order status enum: `draft, pending_payment, placed, seen, accepted, preparing, ready_for_delivery, out_for_delivery, delivered, cancelled, payment_failed`. Event status enum: `submitted, reviewing, quote_sent, confirmed, completed, cancelled`.

---

## 11. API Outline (REST under `/api/v1` + WebSocket)
| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/otp/send`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout` |
| User | `GET/PATCH /me`, `GET/POST/PATCH/DELETE /me/addresses`, `GET/POST/DELETE /me/wishlist` |
| Catalogue | `GET /home`, `/categories`, `/categories/:id/items`, `/items/:id`, `/search?q=` |
| Cart/Orders | `GET /orders?tab=ongoing/completed/cancelled`, `GET /orders/:id`, `POST /orders/draft/items`, `PATCH /orders/:id/items/:itemId` (qty; 0 removes), `DELETE /orders/:id/items/:itemId`, `POST /orders/:id/address`, `POST /orders/:id/promo`, `POST /orders/:id/cancel` |
| Delivery | `GET /places/autocomplete?q=`, `POST /delivery/quote` |
| Payments | `POST /payments/initiate`, `GET /payments/:ref/status`, `POST /payments/verify`, `POST /webhooks/paystack` (or flutterwave) |
| Events | `GET /events/types`, `POST /events`, `GET /events`, `GET /events/:id`, `PATCH /events/:id`, `POST /events/:id/cancel` |
| Notifications | `GET /notifications`, `POST /push/subscribe` |
| Admin | `GET /admin/orders`, `PATCH /admin/orders/:id/status`, `POST /admin/orders/:id/delivery`, catalogue/banner/promo/settings CRUD, `GET/PATCH /admin/events` |

Error shape: `{ code, message, details? }`. Paginate list endpoints. Realtime channels and events as in 7.8.

---

## 12. Recommended Stack
NestJS + TypeScript, Prisma, PostgreSQL, Redis (OTP, rate limits, queues), BullMQ (OTP, reconciliation, notifications), Socket.IO. Integrations: WhatsApp Business Cloud API with Termii (or similar) SMS fallback; Resend/SendGrid email; Paystack/Flutterwave; Google Maps (Places, Distance Matrix); Web Push (VAPID); Cloudinary/S3 + CDN for images. Monitoring: Sentry, analytics (PostHog/GA4).

## 13. Non-Functional
Availability 99.5%+ with graceful degradation if maps, WhatsApp or gateway fail; HTTPS, OWASP Top 10, input validation, OTP rate limiting, signed webhooks, no card data stored, admin audit logs, encrypted PII at rest; NDPR consent, export and deletion; API p95 under 300ms for reads; realtime updates delivered within 3 seconds.

## 14. Edge Cases and Rules
Duplicate account on register → login flow. Sold-out or price change while in cart → block payment with details. Address outside radius → reject. Store closed/paused → block immediate orders. Webhook arrives after the user closes the app → still confirm and notify. Double submit → idempotency keys. `max_qty` exceeded → error. Admin backwards status change → Super Admin only, logged. Refunds are manual in MVP. Timezone Africa/Lagos.

## 15. Release Plan (~8 weeks)
0. Discovery/API contract (1 wk) → 1. Foundations: auth, catalogue, admin login and catalogue CRUD (2-3) → 2. Ordering: carts/orders, address and fee, payments and webhook (4-5) → 3. Realtime and events (6) → 4. Hardening and launch: QA, load and security tests, soft launch (7-8). Definition of done: acceptance criteria met, tests passing, live-mode payment tested with small amounts, monitoring in place.

## 16. Key Acceptance Criteria
1. A successful gateway webhook moves the order to `placed` within 5 seconds and emits a realtime event.
2. A duplicate or replayed webhook does not change state twice.
3. A webhook with a mismatching amount does not confirm the order.
4. Admin status change reaches the customer's tracking channel within 3 seconds.
5. Customers cannot read, edit or subscribe to other users' orders.
6. Delivery fee matches the formula for test distances (including free km, min, max and out-of-radius cases).
7. Qty update to 0 removes the item; edits on non-draft orders are rejected.
8. OTP limits (5 attempts, 3 sends per 15 min, 5 min expiry) are enforced.

## 17. Open Questions
Payment gateway (Paystack or Flutterwave); delivery fee values and radius; WhatsApp Business API approval and templates; pickup option; minimum order value; pastry delivery is Lagos-only (events may travel to Ibadan if booked early); refund policy wording.
