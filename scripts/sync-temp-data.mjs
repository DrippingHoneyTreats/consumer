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
  "carrot cake.jpg": "cake-carrot.jpg",
  "citrus wheat cake.jpg": "cake-citrus.jpg",
};

const bannerMap = {
  "Gold Black and White Modern New Year Sale Banner.svg": "new-year.svg",
  "Orange Modern Catering Services Outdoor Banner.svg": "catering.svg",
  "Purple and Yellow Dynamic Food Delivery Banner.svg": "delivery.svg",
  "Red and Pink Modern Special Valentine Cake Sale Promotion Outdoor Banner.svg": "valentine.svg",
  "done.svg": "done.svg",
};

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

function copyDirMapped(fromDir, toDir, map) {
  if (!existsSync(fromDir)) return;
  mkdirSync(toDir, { recursive: true });
  for (const name of readdirSync(fromDir)) {
    const from = join(fromDir, name);
    if (!statSync(from).isFile()) continue;
    const out = map[name] || slugify(name);
    cpSync(from, join(toDir, out));
    console.log(`  ${name} → ${out}`);
  }
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

console.log("Syncing tempData → public/temp");
copyDirMapped(join(src, "images"), join(dest, "images"), imageMap);
copyDirMapped(join(src, "banners"), join(dest, "banners"), bannerMap);

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
