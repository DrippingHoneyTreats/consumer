/**
 * Thin fetch client for the DHT API.
 * Cookies carry auth; credentials are always included.
 */

/**
 * Absolute (https://api.example.com/api/v1) or same-origin relative
 * (/api/v1 — the temporary Next.js + Supabase backend).
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

function apiBase(): string {
  if (/^https?:\/\//.test(API_URL)) return API_URL;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  return `${origin}${API_URL}`;
}

/** Full URL for browser navigations (e.g. Google sign-in redirect). */
export function apiUrl(path: string): string {
  return `${apiBase()}${path}`;
}

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, body: ApiError) {
    super(body.message || "Request failed");
    this.code = body.code || "REQUEST_FAILED";
    this.status = status;
    this.details = body.details;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Give up after this many ms (default 30s) so nothing can spin forever. */
  timeoutMs?: number;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${apiBase()}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, timeoutMs = 30_000, signal, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  let res: Response;
  let data: unknown;
  try {
    res = await fetch(buildUrl(path, query), {
      ...rest,
      signal: controller.signal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return undefined as T;
    data = await res.json().catch(() =>
      // No JSON back: usually the server isn't running or a proxy couldn't reach it.
      res.status >= 500
        ? { code: "SERVER_UNREACHABLE", message: "The DHT server isn't responding right now. Please try again in a moment." }
        : { code: "INVALID_JSON", message: res.statusText || "Unexpected response" },
    );
  } catch (err) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new ApiRequestError(0, {
        code: "TIMEOUT",
        message: "This is taking too long. Please check your connection and try again.",
      });
    }
    throw new ApiRequestError(0, {
      code: "NETWORK",
      message: "We couldn't reach DHT. Please check your connection and try again.",
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new ApiRequestError(res.status, data as ApiError);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions["query"]) =>
    api<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) => api<T>(path, { method: "POST", body }),
  /** multipart/form-data upload (browser sets the boundary header). */
  upload: async <T>(path: string, form: FormData): Promise<T> => {
    const res = await fetch(buildUrl(path), {
      method: "POST",
      body: form,
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const data = await res.json().catch(() => ({ code: "INVALID_JSON", message: res.statusText }));
    if (!res.ok) throw new ApiRequestError(res.status, data as ApiError);
    return data as T;
  },
  patch: <T>(path: string, body?: unknown) => api<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => api<T>(path, { method: "DELETE" }),
};
