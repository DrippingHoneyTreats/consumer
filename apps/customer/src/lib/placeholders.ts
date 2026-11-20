import type { Category } from "./types";

/**
 * Plain grey fill used wherever an image is missing (no photo uploaded yet,
 * database or network down). All real images come from the API / Cloudinary.
 */
export const IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23e5e1db'/%3E%3C/svg%3E";
export const ITEM_PLACEHOLDER = IMAGE_PLACEHOLDER;
export const EVENT_PLACEHOLDER = IMAGE_PLACEHOLDER;
export const AVATAR_PLACEHOLDER = IMAGE_PLACEHOLDER;
/** Single DHT brand logo — use everywhere (customer + admin). */
export const LOGO = "/assets/logo/logo.png";
export const LOGO_ICON = LOGO;
export const LOGO_FULL = LOGO;

/** Event venues only. Pastry delivery is Lagos; Ibadan events need early booking. */
export const EVENT_CITIES = ["Lagos", "Ibadan"];

export function categoryImage(cat: Pick<Category, "slug" | "image"> | { image?: string | null }): string {
  return cat.image || ITEM_PLACEHOLDER;
}

/** Rotating card tones so any number of categories alternate nicely. */
export const tones = [
  "bg-gradient-to-br from-blush-soft to-blush",
  "bg-gradient-to-br from-sage-soft to-[#cddccb]",
  "bg-gradient-to-br from-white to-cream",
  "bg-gradient-to-br from-[#fdf3e7] to-blush-soft",
] as const;

export function toneFor(index: number): string {
  return tones[index % tones.length];
}
