# MVP cut (shipping focus)

## Keep
- OTP auth (customer + admin)
- Menu browse + add to cart + checkout + payment callback
- Event list + book (Lagos / Ibadan early)
- Admin: products, **promos/banners** (title, copy, image, CTA), orders, event leads
- Customer home promo slot: empty until admin publishes an active promo

## Removed from UI (for now)
- Wishlist, notifications centre, offline/PWA service worker
- Live order map tracking (`/orders/:id/track`)
- Hardcoded customer BrandHero promo
- Admin: reports, customers, delivery settings, order history, Socket.IO

## Still scalable
Layered Express folders + Sequelize migrations + shared packages (`@dht/ui`, `@dht/types`, `@dht/api-client`). Add features as new modules/routes later without rewriting the core flow.
