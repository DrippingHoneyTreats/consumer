import type { Banner, Category, EventType, HomePayload, Item, ItemVariant } from "./types";

/** Extra fields used by the modern UI; safe to ignore when API catches up. */
export type FibreInfo = {
  targetPer100g: string;
  bestFibres: string[];
  tip?: string;
  flavourIdeas?: string[];
};

export type NutritionInfo = {
  kcal: number;
  fat: string;
  carbs: string;
  protein: string;
  fibre: string;
};

export type CatalogueItem = Item & {
  badge?: string | null;
  rating?: number;
  reviewCount?: number;
  ingredients?: string[];
  nutrition?: NutritionInfo;
  fibre?: FibreInfo;
};

export type CatalogueCategory = Category & {
  tagline?: string;
};

export type TempCatalogue = {
  settings?: HomePayload["settings"];
  banners: Banner[];
  categories: CatalogueCategory[];
  items: CatalogueItem[];
  eventTypes: EventType[];
  popularIds: string[];
};

export type { Banner, Category, EventType, HomePayload, Item, ItemVariant };
