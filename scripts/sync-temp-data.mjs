#!/usr/bin/env node
/**
 * Mirrors apps/tempData → apps/customer/public/temp for local Next serving.
 * Both folders are gitignored — run after editing catalogue/images/banners.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const src = join(root, "apps/tempData");
const dest = join(root, "apps/customer/public/temp");

if (!existsSync(src)) {
  console.error("Missing apps/tempData — nothing to sync.");
  process.exit(1);
}

const imageMap = {
  "wheat chinchin.jpg": "chinchin.jpg",
  "wheat puff puff.jpg": "puff-puff.jpg",
  "wholewheat donut.jpg": "donut.jpg",
  "wholewheatcake.jpg": "cake-wholewheat.jpg",
  "wholewheatcake-nobg.png": "cake-wholewheat-nobg.png",
  "wholewheat2-nobg.png": "cake-wholewheat2-nobg.png",
  "carrot cake.jpg": "cake-carrot.jpg",
  "citrus wheat cake.jpg": "cake-citrus.jpg",
};

const bannerMap = {
  "Gold Black and White Modern New Year Sale Banner.jpg": "new-year.jpg",
  "Orange Modern Catering Services Outdoor Banner.jpg": "catering.jpg",
  "Purple and Yellow Dynamic Food Delivery Banner.jpg": "delivery.jpg",
  "Red and Pink Modern Special Valentine Cake Sale Promotion Outdoor Banner.jpg": "valentine.jpg",
  "done.jpg": "done.jpg",
};

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function copyDirMapped(fromDir, toDir, map, { mappedOnly = false } = {}) {
  if (!existsSync(fromDir)) return;
  mkdirSync(toDir, { recursive: true });
  for (const name of readdirSync(fromDir)) {
    const from = join(fromDir, name);
    if (!statSync(from).isFile()) continue;
    if (mappedOnly && !map[name]) continue;
    const out = map[name] || slugify(name);
    cpSync(from, join(toDir, out));
    console.log(`  ${name} → ${out}`);
  }
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

console.log("Syncing tempData → public/temp (+ assets for Netlify)");
copyDirMapped(join(src, "images"), join(dest, "images"), imageMap);
copyDirMapped(join(src, "banners"), join(dest, "banners"), bannerMap, { mappedOnly: true });

// Staging/Netlify: also mirror product photos + compressed banners under public/assets
const assetsCatalogue = join(root, "apps/customer/public/assets/catalogue");
mkdirSync(assetsCatalogue, { recursive: true });
copyDirMapped(join(src, "images"), assetsCatalogue, imageMap);
console.log("  images → public/assets/catalogue");

const assetsBanners = join(root, "apps/customer/public/assets/banners");
mkdirSync(assetsBanners, { recursive: true });
copyDirMapped(join(src, "banners"), assetsBanners, bannerMap, { mappedOnly: true });
console.log("  banners → public/assets/banners");

if (existsSync(join(src, "catalogue.json"))) {
  cpSync(join(src, "catalogue.json"), join(dest, "catalogue.json"));
  const bundled = join(root, "apps/customer/src/data/catalogue.json");
  mkdirSync(join(root, "apps/customer/src/data"), { recursive: true });
  cpSync(join(src, "catalogue.json"), bundled);
  console.log("  catalogue.json → public/temp + src/data");
}

const details = join(src, "productDetails");
if (existsSync(details)) {
  mkdirSync(join(dest, "productDetails"), { recursive: true });
  for (const name of readdirSync(details)) {
    const from = join(details, name);
    if (!statSync(from).isFile()) continue;
    cpSync(from, join(dest, "productDetails", name));
    if (name.endsWith(".json")) {
      cpSync(from, join(dest, name));
    }
    console.log(`  productDetails/${name}`);
  }
}

console.log("Done:", dest);
