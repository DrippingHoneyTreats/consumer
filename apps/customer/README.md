# Dripping Honey Treats — Customer & Admin Frontend

Next.js 15 (App Router) PWA shell for customers and a full-width admin dashboard for kitchen and ops staff.

## Prerequisites

- Node.js 20+
- Running [dhtcustomers-server](https://github.com) API (default `http://localhost:4000/api/v1`)

## Environment

Copy `.env.example` to `.env.local` and adjust:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:4000/realtime
```

## Development

```bash
npm install
npm run dev
```

- Customer app: `http://localhost:3000`
- Admin: `http://localhost:3000/admin` (staff email OTP at `/admin/login`)

Admin routes render in a full-viewport layer outside the 480px customer shell. Sign-in requires a user with role `STAFF` or `SUPER_ADMIN`.

## Production build

```bash
npm run build
npm start
```

## Docker

Build with API URLs baked in at build time:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=https://api.example.com/realtime \
  -t dhtcustomers-app .
docker run -p 3000:3000 dhtcustomers-app
```

Optional `docker-compose.yml` includes a placeholder API service — wire it to your server image or run the API separately.

## Admin areas

| Route | Purpose |
|-------|---------|
| `/admin/orders` | Live order board, status actions, delivery dispatch |
| `/admin/orders/history` | Search and filter completed orders |
| `/admin/catalogue` | Categories and items, sold-out toggle |
| `/admin/banners` | Home carousel banners |
| `/admin/promos` | Promo codes |
| `/admin/settings` | Delivery fees, pause orders, hours |
| `/admin/events` | Event enquiries and quotes |
| `/admin/customers` | Customer list |
| `/admin/reports` | Daily summary metrics |
