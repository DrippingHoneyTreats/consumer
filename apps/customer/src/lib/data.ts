/** Normalise API payloads that may be bare or wrapped in `{ data }`. */

export function unwrapData<T>(payload: T | { data: T } | null | undefined): T | undefined {
  if (payload == null) return undefined;
  if (typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function asArray<T>(payload: T[] | { data: T[] } | unknown): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "data" in payload) {
    const inner = (payload as { data: unknown }).data;
    return Array.isArray(inner) ? inner : [];
  }
  return [];
}
