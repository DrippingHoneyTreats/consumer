# Netlify deploys

Both apps deploy from this repo as two Netlify sites. Full setup (Supabase, env vars,
WhatsApp, email, payments): **[temp-backend.md](temp-backend.md)**.

| Site | Package directory | Config |
|---|---|---|
| Customer (+ `/api/v1` backend) | `apps/customer` | `apps/customer/netlify.toml` |
| Admin | `apps/admin` | `apps/admin/netlify.toml` |

The menu, promos and orders live in **Supabase**. There's no bundled demo data anymore.
All product, promo and event photos are Cloudinary links stored in the database; missing photos show as a plain grey block.

## Local check before push

```bash
npm ci
npm run build -w @dht/customer
npm run build -w @dht/admin
```
