#!/usr/bin/env node
/**
 * One-time move: product / category / banner / event photos → Cloudinary.
 *
 *   npm run images:to-cloudinary -- --dry-run   # preview, changes nothing
 *   npm run images:to-cloudinary                # upload + update the database
 *
 * - Local paths (/assets/…) are uploaded from apps/customer/public.
 * - Other non-Cloudinary links (e.g. Supabase Storage) are fetched by
 *   Cloudinary directly from their URL.
 * - Already-Cloudinary links are left alone, so re-running is safe.
 * Reads SUPABASE_* and CLOUDINARY_* from the root .env.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

// ── env ────────────────────────────────────────────────────────────────
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const [k, v] of Object.entries(parseEnv(fs.readFileSync(envFile, "utf8")))) {
    if (!process.env[k]) process.env[k] = v;
  }
}
const need = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", ...(dryRun ? [] : ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"])];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}
const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
const baseFolder = process.env.CLOUDINARY_FOLDER || "dripping-honey-treats";

const require = createRequire(path.join(root, "apps/customer/package.json"));
const { createClient } = require("@supabase/supabase-js");
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── helpers ────────────────────────────────────────────────────────────
const isCloudinary = (u) => typeof u === "string" && u.includes("res.cloudinary.com");
const optimised = (u) => u.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_limit,w_1600/");

/** Turn whatever is stored into a local file path or a fetchable URL. */
function sourceOf(url) {
  if (!url || isCloudinary(url)) return null;
  let p = url;
  try {
    const u = new URL(url);
    if (["localhost", "127.0.0.1"].includes(u.hostname) || u.pathname.startsWith("/assets/")) p = u.pathname;
    else return { remote: url };
  } catch {
    /* relative path */
  }
  const file = path.join(root, "apps/customer/public", decodeURIComponent(p));
  return fs.existsSync(file) ? { file } : { missing: file };
}

const uploaded = new Map(); // source → cloudinary url

async function upload(src, folder) {
  const key = src.file ?? src.remote;
  if (uploaded.has(key)) return uploaded.get(key);
  const publicId = path.parse(src.file ?? new URL(src.remote).pathname).name.replace(/[^\w-]+/g, "-").toLowerCase();
  const fullFolder = `${baseFolder}/${folder}`;
  if (dryRun) {
    const fake = `https://res.cloudinary.com/<cloud>/image/upload/${fullFolder}/${publicId}`;
    uploaded.set(key, fake);
    return fake;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${fullFolder}&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const form = new FormData();
  form.append(
    "file",
    src.file ? new Blob([fs.readFileSync(src.file)]) : src.remote,
    src.file ? path.basename(src.file) : undefined,
  );
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", fullFolder);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", createHash("sha1").update(toSign).digest("hex"));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || !data.secure_url) throw new Error(data.error?.message ?? `HTTP ${res.status}`);
  const url = optimised(data.secure_url);
  uploaded.set(key, url);
  return url;
}

async function move(url, folder, label) {
  const src = sourceOf(url);
  if (!src) return url; // empty or already on Cloudinary
  if (src.missing) {
    console.warn(`  ⚠ ${label}: file not found (${path.relative(root, src.missing)}). Left as is.`);
    return url;
  }
  const next = await upload(src, folder);
  console.log(`  ✓ ${label}\n      ${url}\n    → ${next}`);
  return next;
}

// ── tables ─────────────────────────────────────────────────────────────
const plan = [
  { table: "items", column: "images", label: "name", folder: "catalogue", many: true },
  { table: "categories", column: "image", label: "name", folder: "catalogue" },
  { table: "banners", column: "image", label: "title", folder: "banners" },
  { table: "event_types", column: "image", label: "name", folder: "events" },
];

let changed = 0;
let failed = 0;
console.log(dryRun ? "DRY RUN: nothing will be uploaded or saved.\n" : "Moving images to Cloudinary…\n");

for (const { table, column, label: labelCol, folder, many } of plan) {
  const { data: rows, error } = await db.from(table).select(`id, ${labelCol}, ${column}`).order("id");
  if (error) {
    console.error(`${table}: ${error.message}`);
    failed++;
    continue;
  }
  console.log(`${table}`);
  for (const row of rows) {
    try {
      const label = `${row[labelCol] ?? row.id}`;
      let next;
      if (many) {
        const list = Array.isArray(row[column]) ? row[column] : [];
        next = [];
        for (const u of list) next.push(await move(u, folder, label));
        if (JSON.stringify(next) === JSON.stringify(list)) continue;
      } else {
        next = await move(row[column], folder, label);
        if (next === row[column]) continue;
      }
      if (!dryRun) {
        const { error: upErr } = await db.from(table).update({ [column]: next }).eq("id", row.id);
        if (upErr) throw new Error(upErr.message);
      }
      changed++;
    } catch (e) {
      failed++;
      console.error(`  ✗ ${row[labelCol] ?? row.id}: ${e.message}`);
    }
  }
}

console.log(
  `\n${dryRun ? "Would update" : "Updated"} ${changed} row(s) · ${uploaded.size} unique image(s)${failed ? ` · ${failed} failed` : ""}.`,
);
if (dryRun) console.log("Run again without --dry-run to do it.");
process.exit(failed ? 1 : 0);
