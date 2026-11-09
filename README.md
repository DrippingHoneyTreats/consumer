# Dripping Honey Treats (monorepo)

Simple **pastry ordering** + **event booking** for Lagos (events may travel to Ibadan if booked early). Built to ship fast, still easy to grow.

```
apps/
  customer/   Order pastries + book events (port 3000)
  admin/      Products, orders, events (port 3001)
  api/        Express + Sequelize (port 4000)
packages/
  ui/  types/  api-client/
```

## MVP product scope

| Who | Can do |
|-----|--------|
| Customer | Sign in (OTP), browse menu, cart → pay, book event |
| Admin | Sign in, manage products + promos, see orders, see event leads |

**Out of MVP (do not build yet):** wishlist, push notifications, live map tracking, reports, delivery-settings UI, Socket.IO, Redis.

## Setup

```bash
cd DrippingHoneyTreats/dhtcustomers-app
cp apps/api/.env.example apps/api/.env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

| App | URL |
|-----|-----|
| Customer | http://localhost:3000 |
| Admin | http://localhost:3001 |
| API | http://localhost:4000/api/v1/health |

Dev OTP: `123456` · Admin seed: `admin@drippinghoneytreats.com`

## Build phases (ship in order)

1. **Auth** — done (`/auth/*`, `/me`)
2. **Catalogue** — customer menu + **admin product upload**
3. **Cart + checkout + Paystack test**
4. **Events** — book + admin list
5. **Deploy** — Vercel (customer + admin) + Railway/Render (api + Postgres)

After each phase: test in UI + TablePlus, then continue.

## Customer app map

`Welcome → Verify → Home / Pastries → Cart → Checkout → Pay`  
`Events → Book`  
`Account` (addresses + WhatsApp help)

## Admin app map

`Login → Products` · `Promos` · `Orders` · `Events`

## Deploy (when Phase 1–4 feel solid)

| App | Host |
|-----|------|
| `apps/customer` | Vercel |
| `apps/admin` | Vercel (separate project) |
| `apps/api` | Railway / Render + Postgres |

Set strong `JWT_ACCESS_SECRET`, `COOKIE_SECURE=true`, production `CORS_ORIGIN` for both frontends. Unset `DEV_OTP_CODE` when real OTP is ready.
