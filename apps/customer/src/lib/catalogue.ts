/**
 * Catalogue loader: always live from the API (/api/v1 → Supabase today,
 * the real backend later). Whatever the admin uploads shows up here.
 */
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { CatalogueCategory, CatalogueItem, EventType, HomePayload } from "@/lib/catalogue-types";

export type HomeCatalogue = HomePayload & {
  popular: CatalogueItem[];
};

function sortCategories(cats: CatalogueCategory[]) {
  return [...cats].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

export async function getHomeCatalogue(): Promise<HomeCatalogue> {
  const home = await apiClient.get<HomePayload & { popular?: CatalogueItem[] }>("/home");
  return {
    banners: home.banners ?? [],
    categories: sortCategories((home.categories ?? []) as CatalogueCategory[]),
    settings: home.settings,
    popular: home.popular ?? [],
  };
}

export async function getCategories(): Promise<{ categories: CatalogueCategory[] }> {
  const res = await apiClient.get<CatalogueCategory[] | { data: CatalogueCategory[] }>("/categories");
  return { categories: sortCategories(asArray<CatalogueCategory>(res)) };
}

export async function getCategoryItems(
  slug: string,
): Promise<{ category: CatalogueCategory | null; items: CatalogueItem[] }> {
  const res = await apiClient.get<{ data: CatalogueItem[]; category: CatalogueCategory | null }>(
    `/categories/${encodeURIComponent(slug)}/items`,
  );
  return { category: res.category ?? null, items: asArray<CatalogueItem>(res) };
}

export async function getItemById(id: string): Promise<CatalogueItem | null> {
  try {
    return await apiClient.get<CatalogueItem>(`/items/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

export async function getEventTypes(): Promise<{ types: EventType[] }> {
  const res = await apiClient.get<EventType[] | { data: EventType[] }>("/events/types");
  return { types: asArray<EventType>(res) };
}

export async function searchItems(query: string): Promise<CatalogueItem[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await apiClient.get<{ data: CatalogueItem[] }>("/search", { q });
    return asArray<CatalogueItem>(res);
  } catch {
    return [];
  }
}
