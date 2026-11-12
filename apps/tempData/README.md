# Local temp catalogue (gitignored)

Mock banners, product photos, and `catalogue.json` for local UI work when the API or Cloudinary assets are unavailable.

**Not pushed to origin.** Production images/banners come from admin → Cloudinary.

## Layout

- `catalogue.json` — categories, items (fibre notes, nutrition), banners, event types
- `images/` — category / product photos
- `banners/` — promo SVGs
- `productDetails/` — fibre guide and related notes

## Sync into the customer app

Next can only serve static files from `apps/customer/public`. After you add or edit files here, run from the `consumer/` monorepo root:

```bash
npm run temp:sync
```

That mirrors this folder into `apps/customer/public/temp/` (also gitignored) with short filenames for images/banners.

## Current behaviour (UI testing)

[`apps/customer/src/lib/catalogue.ts`](../customer/src/lib/catalogue.ts) imports the bundled copy at `apps/customer/src/data/catalogue.json` — **no catalogue API calls**, no network fetch.

`npm run temp:sync` also refreshes that bundled file (and `public/temp` images/banners).

When endpoints are ready, set `NEXT_PUBLIC_USE_TEMP_CATALOGUE=false` and restore API paths in `catalogue.ts`.
