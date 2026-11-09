# PRD (Frontend): Dripping Honey Treats PWA

**Scope:** customer PWA and admin dashboard UI (Next.js). Backend rules, data model and API contracts are in `PRD_BACKEND.md`. Section numbers match the full PRD so prompts can refer to them.
**Market:** Pastry delivery in Lagos, Nigeria. Event catering in Lagos, and Ibadan when booked early.

---

## 1. Overview

Dripping Honey Treats (DHT) sells fibre-based pastries and manages events. The PWA must feel like a native mobile app and let customers: sign up in seconds (name + phone/email, OTP), browse pastry categories, add to cart, pay securely, track orders live, and book events.

**Goals:** no account needed to browse (account forced only at payment); order-to-payment under 3 minutes for returning users; live tracking; structured event leads; lean scope.
**Non-goals (MVP):** rider app, loyalty/referrals, native store apps, in-app event payments.

## 2. Users
Chioma (office worker, mobile-only, patchy data, wants WhatsApp OTP and fast load); Tunde (event host, wants clear event types and easy booking); Admin/Ops (tablet/phone/laptop, wants loud new-order alerts and one-tap status updates); Super Admin (manages menu, prices, banners, delivery fee).

## 3. Scope
**MVP:** onboarding with OTP, home with category tiles and promo banners, category/item listing, cart, orders list and detail, account gate at checkout with address capture, payment redirect, real-time tracking, events page and booking form, account/profile, wishlist, admin dashboard, notifications.
**Should have:** PWA install prompt, web push, reorder, promo codes, scheduled delivery, order notes.
**Later:** loyalty, referrals, gift cards, corporate accounts, event payments.

---

## 4. Design Principles and PWA Requirements

### 4.1 Design principles
- **Mobile-first, thumb-first.** Design at 360x800; scale up (centred app shell, max-width ~480px on desktop).
- **Warm and "at home".** Brand palette (4.3), rounded containers (16-24px), soft shadows, friendly microcopy, light Lagos tone (section 9).
- **Native feel.** Bottom tab bar, slide page transitions, bottom sheets, skeleton loaders, pull-to-refresh on lists, press states.
- **Low friction.** Never a long form; ask only when needed.
- **Data-light.** WebP images, lazy loading, cached shell.

### 4.2 PWA requirements
- Manifest: name, short name, icons (192/512, maskable), theme colour, `display: standalone`, `start_url`.
- Service worker: precache shell; runtime cache catalogue and images (stale-while-revalidate); offline fallback page; never cache payment or auth calls.
- Install prompt after second visit or first successful order; iOS instructions sheet (no install event on Safari).
- Web Push (Android/desktop, iOS 16.4+ when installed), opt-in after first order.
- HTTPS only; Lighthouse PWA >= 90, performance >= 85 on mid-range Android over 3G/4G; safe-area insets respected.

### 4.3 Brand colours, typography and UI elements
Mood: fresh, elegant, natural, timeless.

| Colour | Hex | Share | Use |
|---|---|---|---|
| White | #FFFFFF | 40% | Main backgrounds |
| Off-white | #F9F7F3 | 20% | Secondary backgrounds, cards |
| Blush pink | #F7C8CE | 20% | Accents, primary buttons, active tab pill |
| Sage green | #A7BFA7 | 15% | Brand elements, icons, product labels, secondary buttons |
| Tea green | #6E8F72 | Supporting | Secondary icons, dividers, success states |
| Deep green | #3F5F46 | 5% | Headings, body text, important CTAs, active icons |

- Fonts: Playfair Display (headings), Montserrat (body/UI). Script font for short brand moments only.
- Buttons: primary = blush fill + deep green text; secondary = sage fill; tertiary = outlined with heart icon.
- Icons: simple deep-green line icons; leaf motif. Rounded corners 16-24px.
- Accessibility: deep green text on white/off-white/blush; no small text on sage; 4.5:1 contrast; 44px tap targets.

---

## 5. Information Architecture and Navigation

### 5.1 Sticky bottom navigation (five tabs)
| Order | Tab | Route |
|---|---|---|
| 1 | Orders | `/orders` |
| 2 | Events | `/events` |
| 3 | **Home** (centre, emphasised) | `/` |
| 4 | Pastries | `/pastries` |
| 5 | My Account | `/account` |

Always visible except onboarding, OTP, address picker and gateway screens. Active tab: deep green icon + bold label on blush pill. Cart count badge on Orders.

### 5.2 Sitemap
`/welcome`, `/verify`; `/` Home → `/pastries/:category` → item bottom sheet; `/pastries`; `/orders` (Ongoing | Completed | Cancelled) → `/orders/:id` → `/orders/:id/track`; `/checkout/address`, `/checkout/review`, `/payment/callback`; `/events` → `/events/book` → `/events/:id`; `/account` → profile, addresses, wishlist, notifications, help, logout; `/admin/*` (role-gated).

### 5.3 Global cart banner
Sticky above the tab bar whenever a draft order has items: "2 items · ₦4,500 · View order →". Tap opens `/orders/:id`.

---

## 6. Core User Flows

**A. Onboarding:** splash → 2-3 skippable intro cards → Welcome (Get started / Continue as guest) → full name + contact (toggle WhatsApp number default / Email) → 6-box OTP (auto-read, 60s resend, change number/email) → Home. Account has name + contact only.
**B. Browse → cart:** Home → category tile → items → tap + (qty 1, toast, cart banner) → heart adds to wishlist (not to cart) → banner/Orders tab → order detail.
**C. Checkout:** order detail → **Proceed to pay** ("Secure payment methods") → if guest, onboarding then return to the same order → if no address, address step → order review (items, address, fee, total) → **Pay now** → gateway → success → track page.
**D. Address (only when needed):** search box with live autocomplete dropdown (Google Places, Nigeria), "Use my current location", map with draggable pin, landmark/note/rider phone, fee shown (e.g., "Delivery to Yaba: ₦1,500 (7.2 km)"), save as Home/Work/Other → back to order review.
**E. Tracking:** after payment, `/orders/:id/track` with live status steps.
**F. Event booking:** Events → read types → **Book us now** → form → submit → back to Events showing the event under **Your events** with **Manage event**.

---

## 7. Screen Requirements

### 7.1 Onboarding and auth (UI)
Name (min 2 chars) and phone or email. Phone input defaults to +234 and accepts 0803... or +234803... formats. OTP screen: 6 boxes, resend timer, "Send via SMS" option, "Change number/email". Existing account on signup → "Welcome back, we sent you a code." Consent line: "By continuing you agree to our Terms and Privacy Policy." Guests keep a local cart that merges after login. Users can add the second contact later in Account.

### 7.2 Home (single screen, no scroll)
- Fits one viewport between top bar and tab bar; **no vertical scroll** at 360x640 and above (use `dvh`).
- Top bar: greeting ("Good morning, Chioma"), delivery area chip, notification bell, wishlist heart.
- **Promo carousel:** auto-rotates every 4s, swipeable, max 5 slides, ~20% screen height; banners from admin (launch discount, promos, Christmas, New Year, Valentine's, Sallah, Independence Day...).
- **Category tiles:** Cakes, Meat Pies, Doughnuts, Chinchin, Bread; 2-2-1 grid with the last tile full width; image, name, small tag. Tap → `/pastries/:category`.
- Skeleton, then cached data, if loading fails. Cart banner overlays above the tab bar.

### 7.3 Pastries
- `/pastries`: all categories, search by item name, category chips.
- Category page: item cards with **image, name, short description, status, price (₦), like icon, + button**. Status: Available, Few left, Sold out (+ disabled), Pre-order (X hrs notice).
- **+** adds qty 1 to the draft; the button becomes a - qty + stepper on the card.
- **Heart** toggles wishlist; guests see a bottom sheet to sign up, then the action completes.
- Item bottom sheet: larger image, description, variants (Cakes 6"/8"/10"; Chinchin 250g/500g), quantity, notes (e.g., "Write Happy Birthday on cake"), **Add to order**.

### 7.4 Cart and order detail (`/orders/:id`)
- Header: order number, status badge, date. Item rows: image, name, variant, unit price, qty stepper, line total.
- **Minus** at qty 0 auto-removes the item (Undo toast, 5s). **Plus** respects max qty.
- Editing only while status is **Draft**; paid orders are read-only (Help button to contact DHT).
- Empty draft: "No item in this order" + plus icon + "Add an order" → `/pastries`.
- Summary: subtotal, delivery fee ("Calculated at checkout" until address is set), discount, total. Order notes field and ASAP/schedule time.
- Primary CTA **Proceed to pay** with sub-text "Secure payment methods" and lock/gateway icons.

### 7.5 Orders tab
- Segments: **Ongoing** (default), **Completed**, **Cancelled**. Ongoing includes unpaid drafts (label "Not paid yet") and paid orders not yet delivered.
- Order card: number, thumbnails, total, status chip, date; tap → detail; paid orders show **Track order**.
- Empty states: "No ongoing order" + plus icon + "Order now" → `/pastries`; "No completed orders yet"; "No cancelled orders".
- Completed: **Reorder** and **Rate order** (1-5 stars + comment).

### 7.6 Checkout UI
- **Account gate** at Proceed to pay for guests; return to the same order after OTP.
- **Progressive profiling:** next required info is the delivery address only (plus a phone if they signed up with email).
- Address search: debounce 300ms, min 3 chars, dropdown suggestions, current location, pin adjustment.
- Show the fee from `POST /delivery/quote`. Outside radius → "We don't deliver here yet" + WhatsApp contact. Recalculate when the address changes.
- **Order review:** items, editable address, contact phone, delivery fee, promo field, total, **Pay now**.

### 7.7 Payment UI
- Pay now → call `POST /payments/initiate` → redirect to the gateway URL (or inline popup) → return to `/payment/callback?reference=...`.
- Callback page shows "Confirming your payment..." and polls `GET /payments/:ref/status`. Success → track page.
- Fallback button "I have made this payment" calls `POST /payments/verify`; if pending, show "We're confirming, we'll notify you".
- Failure/abandon: "Payment not completed" with Retry and Change method. Disable the Pay button while a request is in flight; never double-submit.

### 7.8 Order tracking UI (real time)
Timeline on `/orders/:id/track`, live via WebSocket with 15s polling fallback.

| Step | Customer text |
|---|---|
| 1 | Order placed (paid) |
| 2 | Order seen by DHT ("We've got your order") |
| 3 | Order accepted |
| 4 | Being prepared |
| 5 | Ready for delivery |
| 6 | On its way to you: ETA countdown, rider name, phone (tap to call/WhatsApp) |
| 7 | Delivered |

Show timestamps per step, collapsible order summary, "Need help?" WhatsApp link, and "Cancel order" (only before step 4). Cancelled orders show the reason.

### 7.9 Events
- Intro: non-clickable info cards for Birthdays, Get-togethers, Mini celebrations, Team hangouts (image, description, what's included). City chips: Lagos, Ibadan (Ibadan = travel for events when booked early).
- **Your events:** Ongoing/Completed/Cancelled; empty state "No event yet. Let's plan something sweet."
- Sticky **Book us now** button.
- Booking form (max 2 screens with progress): event type, title (optional), date (at least 3 days ahead) and time, city and venue (autocomplete), guests, budget (optional), services (multi-select), special requests, contact phone (prefilled) and preferred contact method, terms checkbox. Guests sign in on submit.
- On submit: confirmation with reference ID, return to Events with the new event under Ongoing and **Manage event**.
- **Manage event** (`/events/:id`): details, status timeline (Submitted → Reviewing → Quote sent → Confirmed → Completed), edit until Confirmed, cancel, WhatsApp link, view quote. Event bookings: Lagos, plus Ibadan when booked early. Pastry delivery remains Lagos-only.

### 7.10 My Account
Visible to everyone (guests see a sign-up/login card). Profile header (initials avatar, name, contact, verified badges); **Complete profile** progress card (not mandatory); sections: personal info, saved addresses, wishlist, notification settings, payment history, help (WhatsApp, call, FAQ), About, Terms/Privacy, logout, delete account.

### 7.11 Wishlist
Saved items list with + to add to cart and remove; sold-out items flagged.

### 7.12 Notifications UI
In-app notification centre (bell) with unread count; push opt-in after first order; settings toggles for push, WhatsApp and email.

---

## 8. Admin Dashboard UI (responsive; tablet/phone/desktop, role-gated)
- **Live orders:** real-time board by status; sound and visual alert on new paid orders; opening an order marks it Seen; buttons Accept, Reject (reason), Preparing, Ready, Out for delivery (rider name, phone, ETA minutes), Delivered; shows customer, phone, address with map link, items, notes, payment ref; print view.
- **Order history:** filters (date, status, payment), search by order no./phone, CSV export.
- **Catalogue:** CRUD categories/items (images, price, variants, status, max qty, visibility, sort), quick sold-out toggle.
- **Banners/promos:** banner CRUD with schedule; promo code CRUD.
- **Delivery settings:** kitchen coordinates, base fee, free km, per-km rate, min/max fee, max radius, free-delivery threshold, operating hours, Pause orders switch.
- **Events:** list with filters, detail with status update, internal notes, quote attachment, staff assignment.
- **Customers, Reports, Settings.**

---

## 9. Modern, Lagos-Feel Additions
Nigerian-first UX (₦ formatting, +234 default, transfer/USSD/card, Nigerian English microcopy such as "Sharp sharp!"); WhatsApp everywhere (OTP, updates, "Chat with us" `wa.me` links prefilled with order/event number); operating hours and scheduled orders ("We're closed, order for tomorrow"); seasonal and Owambe packages as banners and bundles; bundles ("Office Pastry Box", "Party Pack"); bulk-order prompt to book an event; low-data mode (respect `Save-Data`); offline browsing of the cached menu with queued cart edits; cake message and allergen notes; advance orders with lead times; ratings after delivery; search, recently ordered and Reorder; WhatsApp sharing; clear "don't pay twice" messaging; AA accessibility and scalable fonts.

---

## 13. Non-Functional (Frontend)
First load < 3s on 4G; interaction feedback < 100ms; Home payload < 300KB excluding images; browsers: Chrome Android, Safari iOS 15+, Samsung Internet, latest desktop. Analytics events: `signup_started`, `otp_verified`, `category_viewed`, `item_added`, `cart_viewed`, `checkout_started`, `address_added`, `payment_initiated`, `payment_success`, `payment_failed`, `track_viewed`, `event_started`, `event_submitted`, `pwa_installed`.

## 14. Edge Cases (Frontend)
OTP not received → resend, switch channel or change contact. Item sold out or price changed in cart → warn on order detail and block payment until resolved. Address outside radius → block payment, show contact option. Store closed/paused → browse and schedule only. Guest cart merges on login. Double tap on + or Pay → debounce. Max qty reached → disable + with note. User closes app during payment → webhook still confirms and a push is sent.

## 16. Key Acceptance Criteria
1. Guest taps Proceed to pay → name + contact + OTP → returns to the same order with cart intact.
2. Verified user with no address sees only the address step, then order review with the fee.
3. Minus on qty 1 removes the item; last item shows "No item in this order" with **Add an order**.
4. After a successful payment the customer lands on Track order.
5. Admin status change updates the tracking screen within 3 seconds without refresh.
6. User with no orders sees **No ongoing order** and **Order now**.
7. Submitted event appears under Ongoing with **Manage event**.
8. Home needs no vertical scroll at 360x640 and larger.

## 17. Open Questions
Five tabs vs four (this PRD uses five); pickup option; minimum order value; cancellation and refund wording; final gateway.
