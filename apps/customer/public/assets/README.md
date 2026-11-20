# Static assets

Only brand files live in the app. **All product, category, promo and event
photos come from the database (Cloudinary links).** Where a photo is missing
or can't load, the UI shows a plain grey block (`IMAGE_PLACEHOLDER` in
`src/lib/placeholders.ts`).

| Folder | Used for |
|--------|----------|
| `logo/logo.png` | Brand mark across customer + admin (one file only) |
| `icons/` | Favicons + PWA install icons |
