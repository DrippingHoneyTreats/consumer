/**
 * Fallback art from `public/assets` when the API sends no image.
 * Catalogue / promo content always comes from the API.
 */

export const ITEM_PLACEHOLDER = "/assets/placeholders/item-placeholder.svg";
export const EVENT_PLACEHOLDER = "/assets/placeholders/event-placeholder.svg";
export const AVATAR_PLACEHOLDER = "/assets/placeholders/avatar-placeholder.svg";
export const HERO_SPLASH = "/assets/placeholders/hero-splash.svg";
/** Single DHT brand logo — use everywhere (customer + admin). */
export const LOGO = "/assets/logo/logo.png";
export const LOGO_ICON = LOGO;
export const LOGO_FULL = LOGO;

export const tones = [
  "bg-gradient-to-br from-blush-soft to-blush",
  "bg-gradient-to-br from-sage-soft to-[#cddccb]",
  "bg-gradient-to-br from-white to-cream",
  "bg-gradient-to-br from-[#fdf3e7] to-blush-soft",
] as const;

export function toneFor(index: number): string {
  return tones[index % tones.length];
}
