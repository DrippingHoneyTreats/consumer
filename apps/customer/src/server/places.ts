import "server-only";
import { env } from "./env";

/**
 * Address search, called from the server.
 *  1. Google Maps Platform (Places API "New" + Maps Static API) when
 *     GOOGLE_MAPS_API_KEY is set — best coverage, like Uber/Bolt.
 *  2. Otherwise free OpenStreetMap search (Photon) — good for streets and
 *     areas, weaker on estate names.
 *  3. Always: "use what I typed", with a text-based Lagos check.
 */

const LAGOS_CENTER = { latitude: 6.5244, longitude: 3.3792 };

export type PlaceSuggestion = { placeId: string; description: string; mainText: string; secondaryText: string };
export type PlaceDetails = {
  placeId: string;
  /** Where the address came from (decides which map preview to show). */
  provider?: "google" | "osm" | "typed";
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
    provider: "google",
  };
}

// ───────────────────────── OpenStreetMap (free, no key) ─────────────────────────

const NIGERIA_BBOX = "2.6,4.2,14.7,13.9";

type OsmPayload = { a: string; lat: number; lng: number; s: string | null };

const encodeOsm = (p: OsmPayload) => `osm:${Buffer.from(JSON.stringify(p)).toString("base64url")}`;

function decodeOsm(placeId: string): OsmPayload | null {
  try {
    const p = JSON.parse(Buffer.from(placeId.slice(4), "base64url").toString("utf8")) as OsmPayload;
    if (typeof p.a !== "string" || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
    return { a: p.a.slice(0, 300), lat: p.lat, lng: p.lng, s: typeof p.s === "string" ? p.s.slice(0, 60) : null };
  } catch {
    return null;
  }
}

export const isOsmPlace = (placeId: string) => placeId.startsWith("osm:");

// Small in-memory cache: retyping/backspacing is instant and we stay polite to the free service.
const OSM_CACHE_MS = 10 * 60_000;
const osmCache = new Map<string, { at: number; data: PlaceSuggestion[] }>();

/** Free street/area search (Photon over OpenStreetMap), biased to Lagos, limited to Nigeria. */
export async function osmAutocomplete(input: string): Promise<PlaceSuggestion[]> {
  const key = input.trim().toLowerCase().replace(/\s+/g, " ");
  const hit = osmCache.get(key);
  if (hit && Date.now() - hit.at < OSM_CACHE_MS) return hit.data;
  const data = await osmSearch(input);
  if (osmCache.size > 500) osmCache.delete(osmCache.keys().next().value as string);
  osmCache.set(key, { at: Date.now(), data });
  return data;
}

/** Lagos shorthand people type → what the map calls it. */
const ABBREVIATIONS: [RegExp, string][] = [
  [/\bvgc\b/gi, "Victoria Garden City"],
  [/\bv\.?\s?i\.?(?=\s|,|$)/gi, "Victoria Island"],
  [/\bph\.?\s?(1|i)\b/gi, "Phase 1"],
  [/\bph\.?\s?(2|ii)\b/gi, "Phase 2"],
  [/\bgra\b/gi, "GRA"],
  [/\brd\b\.?/gi, "Road"],
  [/\bst\b\.?(?=\s|,|$)/gi, "Street"],
  [/\bave\b\.?/gi, "Avenue"],
  [/\bcl\b\.?(?=\s|,|$)/gi, "Close"],
  [/\bcres\b\.?/gi, "Crescent"],
];

/** Lagos areas people add to a search ("… vgc", "… in Yaba"). Longest first. */
const LAGOS_AREAS = [
  "victoria garden city", "lekki phase 1", "lekki phase 2", "victoria island", "banana island", "eko atlantic",
  "lagos island", "ebute metta", "abule egba", "igbo efon", "ikeja gra", "ikoyi", "lekki", "ajah", "ikeja", "yaba",
  "surulere", "magodo", "gbagada", "festac", "maryland", "ikota", "sangotedo", "oniru", "opebi", "allen", "ogudu",
  "omole", "ojodu", "ilupeju", "oshodi", "ikorodu", "egbeda", "ikotun", "agege", "apapa", "badagry", "epe", "ojo",
  "isolo", "ketu", "chevron", "osapa", "agungi", "jakande", "idado", "ologolo", "ilasan", "obalende", "anthony",
  "palmgrove", "onipanu", "mushin", "ipaja", "berger", "ojota", "ogba", "isheri", "akoka", "bariga", "awoyaya",
  "abijo", "lakowe", "badore", "ado", "mende", "anthony village", "akowonjo", "alimosho", "ikate", "elegushi",
];

function expandAbbreviations(q: string): string {
  return ABBREVIATIONS.reduce((acc, [re, full]) => acc.replace(re, full), q).replace(/\s+/g, " ").trim();
}

type PhotonFeature = { geometry: { coordinates: [number, number] }; properties: Record<string, string | undefined> };

async function photon(q: string, near: { lat: number; lng: number } = { lat: LAGOS_CENTER.latitude, lng: LAGOS_CENTER.longitude }, limit = 8) {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("lat", String(near.lat));
  url.searchParams.set("lon", String(near.lng));
  url.searchParams.set("bbox", NIGERIA_BBOX);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("lang", "en");
  const res = await fetch(url, {
    headers: { "User-Agent": "DrippingHoneyTreats/1.0 (+https://drippinghoneytreats.com)" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).filter((f) => !f.properties.countrycode || f.properties.countrycode.toUpperCase() === "NG");
}

function toSuggestion(f: PhotonFeature): PlaceSuggestion | null {
  const p = f.properties;
  const main = [p.housenumber, p.name ?? p.street].filter(Boolean).join(" ").trim();
  if (!main) return null;
  const secondary = [p.name && p.street && p.street !== p.name ? p.street : null, p.district ?? p.locality, p.city, p.state]
    .filter((x, i, arr): x is string => Boolean(x) && arr.indexOf(x) === i && x !== main)
    .join(", ");
  const label = secondary ? `${main}, ${secondary}` : main;
  const [lng, lat] = f.geometry.coordinates;
  return { placeId: encodeOsm({ a: label, lat, lng, s: p.state ?? null }), description: label, mainText: main, secondaryText: secondary };
}

const GENERIC_WORDS = new Set([
  "the", "and", "road", "street", "avenue", "close", "crescent", "estate", "drive", "way", "lane", "lagos", "nigeria",
  "phase", "off", "opposite", "beside", "behind", "junction", "bus", "stop", "house", "block", "flat", "plot",
]);

/** Does this result actually match what was typed? (drops nearby-but-unrelated places) */
function matchesWords(query: string, s: PlaceSuggestion): boolean {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
  if (!words.length) return true;
  const hay = s.description.toLowerCase();
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits >= Math.ceil(words.length / 2);
}

/** km between two points (good enough for "is it in this area"). */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const areaCache = new Map<string, PhotonFeature | null>();

/** Where is this Lagos area? (cached for the life of the server) */
async function locateArea(area: string): Promise<PhotonFeature | null> {
  if (areaCache.has(area)) return areaCache.get(area)!;
  const hits = await photon(`${area}, Lagos`, undefined, 8).catch(() => []);
  // Must really BE the area (a suburb/neighbourhood named like it), not a shop inside it.
  const norm = (x?: string) => (x ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const found =
    hits.find(
      (f) =>
        /lagos/i.test(f.properties.state ?? "") &&
        (f.properties.osm_key === "place" || f.properties.osm_key === "boundary" || f.properties.type === "district") &&
        (norm(f.properties.name).includes(area) || area.includes(norm(f.properties.name))),
    ) ??
    hits.find((f) => /lagos/i.test(f.properties.state ?? "") && norm(f.properties.name) === area) ??
    null;
  areaCache.set(area, found);
  return found;
}

/**
 * Street/place search like delivery apps do it:
 *  - expand shorthand (VGC, VI, Ph 1, Rd…)
 *  - if an area is named ("… VGC", "… Yaba"), search for the rest NEAR that
 *    area and rank the closest first, then offer the area itself so the
 *    customer can pick it and add a landmark when the exact building isn't mapped.
 */
async function osmSearch(input: string): Promise<PlaceSuggestion[]> {
  const q = expandAbbreviations(input);
  const lower = ` ${q.toLowerCase()} `;
  const area = LAGOS_AREAS.find((a) => lower.includes(` ${a} `) || lower.includes(` ${a},`));
  const out: PlaceSuggestion[] = [];
  const seen = new Set<string>();
  const add = (s: PlaceSuggestion | null) => {
    if (s && !seen.has(s.description)) {
      seen.add(s.description);
      out.push(s);
    }
  };

  if (area) {
    const where = await locateArea(area);
    const rest = q.replace(new RegExp(area.replace(/ /g, "\\s+"), "i"), " ").replace(/\b(in|at|by|near)\b/gi, " ").replace(/[\s,]+/g, " ").trim();
    if (where) {
      const center = { lat: where.geometry.coordinates[1], lng: where.geometry.coordinates[0] };
      if (rest.length >= 3) {
        const nearby = await photon(rest, center, 15).catch(() => []);
        nearby
          .map((f) => ({ f, d: distanceKm(center, { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }) }))
          .filter((x) => x.d <= 4)
          .sort((x, y) => x.d - y.d)
          .map((x) => toSuggestion(x.f))
          .filter((x): x is PlaceSuggestion => Boolean(x) && matchesWords(rest, x!))
          .forEach(add);
      }
      // The area itself: pick it, then describe the exact spot as a landmark.
      add(toSuggestion(where));
    }
  }

  if (out.length < 5) {
    try {
      (await photon(q))
        .map(toSuggestion)
        .filter((x): x is PlaceSuggestion => Boolean(x) && matchesWords(q, x!))
        .forEach(add);
    } catch (e) {
      // Free service busy: keep whatever we already found instead of failing the search.
      if (!out.length) throw e;
    }
  }
  return out.slice(0, 6);
}

export function osmDetails(placeId: string): PlaceDetails | null {
  const p = decodeOsm(placeId);
  if (!p) return null;
  const text = lagosFromText(`${p.a} ${p.s ?? ""}`);
  const inLagos = p.s ? /lagos/i.test(p.s) : text.inLagos !== false;
  return { placeId, provider: "osm", formattedAddress: p.a, lat: p.lat, lng: p.lng, state: p.s ?? text.state, inLagos };
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
