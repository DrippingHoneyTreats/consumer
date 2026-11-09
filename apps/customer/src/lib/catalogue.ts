/**
 * Catalogue — bundled tempData only (no API) for UI testing.
 * `src/data/catalogue.json` is mirrored from apps/tempData via `npm run temp:sync`.
 *
 * Later: set NEXT_PUBLIC_USE_TEMP_CATALOGUE=false and restore API loaders.
 */
import bundled from "@/data/catalogue.json";
import type {
  CatalogueCategory,
  CatalogueItem,
  EventType,
  HomePayload,
  TempCatalogue,
} from "@/lib/catalogue-types";

export const USE_TEMP_CATALOGUE = process.env.NEXT_PUBLIC_USE_TEMP_CATALOGUE !== "false";

export type CatalogueSource = "api" | "temp";

export type HomeCatalogue = HomePayload & {
  popular: CatalogueItem[];
  source: CatalogueSource;
};

const temp = bundled as TempCatalogue;

function sortCategories(cats: CatalogueCategory[]) {
  return [...cats].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

function homeFromTemp(): HomeCatalogue {
  const byId = new Map(temp.items.map((i) => [i.id, i]));
  const popular = temp.popularIds.map((id) => byId.get(id)).filter(Boolean) as CatalogueItem[];
  return {
    banners: temp.banners,
    categories: sortCategories(temp.categories),
    settings: temp.settings,
    popular,
    source: "temp",
  };
}

export async function getTempHome(): Promise<HomeCatalogue> {
  return homeFromTemp();
}

export async function getHomeCatalogue(): Promise<HomeCatalogue> {
  if (!USE_TEMP_CATALOGUE) {
    throw new Error("Live catalogue API is not enabled yet. Keep NEXT_PUBLIC_USE_TEMP_CATALOGUE unset/true.");
  }
  return homeFromTemp();
}

export async function getCategories(): Promise<{ categories: CatalogueCategory[]; source: CatalogueSource }> {
  return { categories: sortCategories(temp.categories), source: "temp" };
}

export async function getCategoryItems(
  slug: string,
): Promise<{ category: CatalogueCategory | null; items: CatalogueItem[]; source: CatalogueSource }> {
  const category = temp.categories.find((c) => c.slug === slug) ?? null;
  const items = temp.items.filter((i) => i.categoryId === category?.id);
  return { category, items, source: "temp" };
}

export async function getItemById(id: string): Promise<CatalogueItem | null> {
  return temp.items.find((i) => i.id === id) ?? null;
}

export async function getEventTypes(): Promise<{ types: EventType[]; source: CatalogueSource }> {
  return { types: temp.eventTypes, source: "temp" };
}

export async function searchItems(query: string): Promise<CatalogueItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return temp.items.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.fibre?.bestFibres.some((f) => f.toLowerCase().includes(q)),
  );
}
