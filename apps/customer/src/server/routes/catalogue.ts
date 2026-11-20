import "server-only";
import { absUrl, camel, db, maybe, must } from "../db";
import { notFound } from "../http";
import { route } from "../router";
import { getSettings } from "../services/orders";

type Row = Record<string, unknown>;

export function mapCategory(r: Row) {
  const c = camel<{ id: string; name: string; slug: string; image?: string | null; tagline?: string | null; sort: number; active: boolean }>(r);
  return { ...c, image: absUrl(c.image) };
}

export function mapItem(r: Row) {
  const i = camel<{
    id: string;
    categoryId: string;
    name: string;
    description?: string | null;
    images: string[];
    basePrice: number;
    status: string;
    maxQty: number;
    leadTimeHours?: number | null;
    variants: { id: string; name: string; price: number }[];
    badge?: string | null;
    ingredients?: string[] | null;
    nutrition?: unknown;
    fibre?: unknown;
    popular: boolean;
    sort: number;
    active: boolean;
  }>(r);
  return {
    ...i,
    images: (Array.isArray(i.images) ? i.images : []).map((u) => absUrl(u)).filter(Boolean) as string[],
    variants: Array.isArray(i.variants) ? i.variants : [],
    ingredients: i.ingredients ?? undefined,
    nutrition: i.nutrition ?? undefined,
    fibre: i.fibre ?? undefined,
  };
}

export function mapBanner(r: Row) {
  const b = camel<{ image: string } & Record<string, unknown>>(r);
  return { ...b, image: absUrl(b.image) ?? "" };
}

export function mapEventType(r: Row) {
  const e = camel<{ image?: string | null; includes: string[] } & Record<string, unknown>>(r);
  return { ...e, image: absUrl(e.image), includes: Array.isArray(e.includes) ? e.includes : [] };
}

async function activeCategories() {
  const rows = must(
    await db().from("categories").select("*").eq("active", true).order("sort").order("name"),
    "categories",
  ) as Row[];
  return rows.map(mapCategory);
}

async function activeBanners() {
  const now = new Date().toISOString();
  const rows = must(
    await db()
      .from("banners")
      .select("*")
      .eq("active", true)
      .or(`start_at.is.null,start_at.lte."${now}"`)
      .or(`end_at.is.null,end_at.gte."${now}"`)
      .order("priority", { ascending: false }),
    "banners",
  ) as Row[];
  return rows.map(mapBanner);
}

route("GET", "/home", async () => {
  const [banners, categories, settings, popularRows] = await Promise.all([
    activeBanners(),
    activeCategories(),
    getSettings(),
    db().from("items").select("*").eq("active", true).eq("popular", true).order("sort").limit(12),
  ]);
  return {
    banners,
    categories,
    settings: { pauseOrders: settings.pauseOrders, whatsappNumber: settings.whatsappNumber },
    popular: (must(popularRows, "popular") as Row[]).map(mapItem),
  };
});

route("GET", "/categories", async () => ({ data: await activeCategories() }));

route("GET", "/categories/:idOrSlug/items", async ({ params }) => {
  const key = params.idOrSlug;
  const cat = maybe(
    await db().from("categories").select("*").or(`id.eq.${key.replace(/[^\w-]/g, "")},slug.eq.${key.replace(/[^\w-]/g, "")}`).limit(1).maybeSingle(),
    "category",
  );
  if (!cat) return { data: [], category: null };
  const rows = must(
    await db().from("items").select("*").eq("category_id", cat.id).eq("active", true).order("sort").order("name"),
    "category items",
  ) as Row[];
  return { data: rows.map(mapItem), category: mapCategory(cat) };
});

route("GET", "/items/:id", async ({ params }) => {
  const row = maybe(await db().from("items").select("*").eq("id", params.id).eq("active", true).maybeSingle(), "item");
  if (!row) throw notFound("Item not found.");
  return mapItem(row);
});

route("GET", "/search", async ({ query }) => {
  const q = (query.get("q") ?? "").trim().replace(/[%_,()]/g, " ").slice(0, 60);
  if (!q) return { data: [] };
  const rows = must(
    await db()
      .from("items")
      .select("*")
      .eq("active", true)
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(30),
    "search",
  ) as Row[];
  return { data: rows.map(mapItem) };
});

route("GET", "/events/types", async () => {
  const rows = must(
    await db().from("event_types").select("*").eq("active", true).order("sort"),
    "event types",
  ) as Row[];
  return { data: rows.map(mapEventType) };
});

route("GET", "/health", async () => ({ ok: true, backend: "temp-supabase" }));
