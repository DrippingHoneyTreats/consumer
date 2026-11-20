import "server-only";
import { cache } from "react";
import { absUrl, db } from "./db";

/**
 * Read-only menu data for server-rendered SEO pages (/menu, /about, category
 * metadata, sitemap, llms.txt). Never throws: if the database is unreachable
 * (e.g. a local build without env vars) it returns empty data so builds and
 * pages still work.
 */

export type SeoItem = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  basePrice: number;
  status: string;
  variants: { id: string; name: string; price: number }[];
  nutrition: { kcal?: number; fibre?: string } | null;
  updatedAt: string | null;
};

export type SeoCategory = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  image: string | null;
  items: SeoItem[];
};

export type SeoEventType = { id: string; name: string; description: string | null; includes: string[] };

export type SeoMenu = {
  categories: SeoCategory[];
  eventTypes: SeoEventType[];
  pickupAddress: string | null;
  pickupHours: string | null;
};

const EMPTY: SeoMenu = { categories: [], eventTypes: [], pickupAddress: null, pickupHours: null };

/** Cached per request, so metadata + page share one DB round-trip. */
export const getSeoMenu = cache(async function getSeoMenu(): Promise<SeoMenu> {
  try {
    const [cats, items, events, settings] = await Promise.all([
      db().from("categories").select("id, name, slug, tagline, image, sort").eq("active", true).order("sort"),
      db()
        .from("items")
        .select("id, category_id, name, description, images, base_price, status, variants, nutrition, sort, updated_at")
        .eq("active", true)
        .order("sort"),
      db().from("event_types").select("id, name, description, includes, sort").eq("active", true).order("sort"),
      db().from("settings").select("pickup_address, pickup_hours").eq("id", 1).maybeSingle(),
    ]);
    if (cats.error || items.error) return EMPTY;

    const byCat = new Map<string, SeoItem[]>();
    for (const r of items.data ?? []) {
      const list = byCat.get(r.category_id) ?? [];
      list.push({
        id: r.id,
        name: r.name,
        description: r.description,
        image: absUrl((Array.isArray(r.images) ? r.images : [])[0] ?? null),
        basePrice: r.base_price,
        status: r.status,
        variants: Array.isArray(r.variants) ? r.variants : [],
        nutrition: r.nutrition ?? null,
        updatedAt: r.updated_at ?? null,
      });
      byCat.set(r.category_id, list);
    }

    return {
      categories: (cats.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        tagline: c.tagline,
        image: absUrl(c.image),
        items: byCat.get(c.id) ?? [],
      })),
      eventTypes: (events.data ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        includes: Array.isArray(e.includes) ? e.includes : [],
      })),
      pickupAddress: settings.data?.pickup_address ?? null,
      pickupHours: settings.data?.pickup_hours ?? null,
    };
  } catch {
    return EMPTY;
  }
});

/** Lowest and highest price an item can cost (variants or base price), in kobo. */
export function priceRange(item: SeoItem): { low: number; high: number } {
  const prices = item.variants.length ? item.variants.map((v) => v.price) : [item.basePrice];
  return { low: Math.min(...prices), high: Math.max(...prices) };
}

export const naira = (kobo: number) => "₦" + Math.round(kobo / 100).toLocaleString("en-NG");
