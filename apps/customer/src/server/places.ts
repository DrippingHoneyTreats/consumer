import "server-only";
import { env } from "./env";

/**
 * Google Maps Platform (Places API "New" + Maps Static API), called from
 * the server so the API key never reaches the browser.
 * Without GOOGLE_MAPS_API_KEY everything falls back to typed addresses
 * plus a text-based Lagos check.
 */

const LAGOS_CENTER = { latitude: 6.5244, longitude: 3.3792 };

export type PlaceSuggestion = { placeId: string; description: string; mainText: string; secondaryText: string };
export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  /** State (administrative_area_level_1), e.g. "Lagos". */
  state: string | null;
  inLagos: boolean;
};

export const mapsEnabled = () => Boolean(env.googleMapsKey);

export async function autocomplete(input: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": env.googleMapsKey },
    body: JSON.stringify({
      input,
      includedRegionCodes: ["ng"],
      // Prefer results around Lagos (50 km is the API maximum), without excluding elsewhere,
      // so customers outside Lagos still find their address and get a clear message.
      locationBias: { circle: { center: LAGOS_CENTER, radius: 50000 } },
      languageCode: "en",
      ...(sessionToken ? { sessionToken } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Places autocomplete ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId: string;
        text?: { text: string };
        structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } };
      };
    }[];
  };
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .slice(0, 6)
    .map((p) => ({
      placeId: p.placeId,
      description: p.text?.text ?? p.structuredFormat?.mainText?.text ?? "",
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
    }));
}

export async function placeDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);
  const res = await fetch(url, {
    headers: { "X-Goog-Api-Key": env.googleMapsKey, "X-Goog-FieldMask": "id,formattedAddress,location,addressComponents" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Place details ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const p = (await res.json()) as {
    id: string;
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    addressComponents?: { longText: string; shortText: string; types: string[] }[];
  };
  const state = p.addressComponents?.find((c) => c.types.includes("administrative_area_level_1"))?.longText ?? null;
  const formattedAddress = p.formattedAddress ?? "";
  return {
    placeId: p.id,
    formattedAddress,
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    state,
    inLagos: state ? /lagos/i.test(state) : lagosFromText(formattedAddress).inLagos !== false,
  };
}

/** Image bytes for a small map preview (proxied so the key stays secret). */
export async function staticMap(lat: number, lng: number): Promise<Response> {
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${lat},${lng}`);
  url.searchParams.set("zoom", "16");
  url.searchParams.set("size", "640x280");
  url.searchParams.set("scale", "2");
  url.searchParams.set("markers", `color:0x3F5F46|${lat},${lng}`);
  url.searchParams.set("key", env.googleMapsKey);
  return fetch(url, { signal: AbortSignal.timeout(8000) });
}

// ───────────────────────── Text fallback (no API key / typed address) ─────────────────────────

/** Nigerian states + major non-Lagos cities. Seeing one of these (and not "Lagos") means "outside Lagos". */
const OUTSIDE_LAGOS = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Nasarawa", "Niger State", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara", "Abuja", "FCT", "Ibadan", "Abeokuta", "Port Harcourt", "Benin City", "Ilorin", "Owerri",
  "Uyo", "Calabar", "Jos", "Akure", "Osogbo", "Asaba", "Warri", "Onitsha", "Aba", "Sango Ota", "Ota", "Mowe",
  "Ibafo", "Sagamu",
];

/** Best-effort Lagos check from free text. null = can't tell (allowed). */
export function lagosFromText(text: string): { inLagos: boolean | null; state: string | null } {
  if (/\blagos\b/i.test(text)) return { inLagos: true, state: "Lagos" };
  const hit = OUTSIDE_LAGOS.find((s) => new RegExp(`\\b${s.replace(/ /g, "\\s+")}\\b`, "i").test(text));
  return hit ? { inLagos: false, state: hit } : { inLagos: null, state: null };
}
