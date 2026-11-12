# Customer app — Netlify staging (QA)

Deploy the **`staging`** branch so the PM can QA the customer UI with **bundled temp catalogue data** (no live API yet).

## One-time Netlify setup

1. Create a Netlify site linked to this repo.
2. **Build settings**
   - **Base directory:** leave empty (repo root)
   - **Package directory:** `apps/customer`
   - **Branch to deploy:** `staging` (Site configuration → Build & deploy → Continuous Deployment → Branches — enable branch deploys / set production branch to `staging` for now if this site is QA-only)
3. Config is already in `apps/customer/netlify.toml` (temp catalogue env vars included).
4. Trigger a deploy from `staging`.

## Temp / dummy data

- Catalogue JSON: `apps/customer/src/data/catalogue.json` (imported by the app)
- Product images: `apps/customer/public/assets/catalogue/` (Netlify-safe; mirrored from temp sync)
- Home banners: `apps/customer/public/assets/banners/`

`NEXT_PUBLIC_USE_TEMP_CATALOGUE` defaults to **true**. When the API is ready, set it to `false` in Netlify env and point `NEXT_PUBLIC_API_URL` at staging API.

### Updating mock data

```bash
# edit apps/tempData locally, then:
npm run temp:sync
git add apps/customer/src/data/catalogue.json apps/customer/public/temp/images
git commit -m "chore: refresh staging temp catalogue"
git push origin staging
```

## Local check before push

```bash
npm ci
npm run build -w @dht/customer
```
