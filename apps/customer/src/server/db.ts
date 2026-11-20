import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, requireEnv } from "./env";
import { HttpError } from "./http";

let client: SupabaseClient | null = null;

/** Service-role Supabase client. Bypasses RLS — server routes only. */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv(env.supabaseUrl, "SUPABASE_URL"),
      requireEnv(env.supabaseServiceKey, "SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

/** Untyped DB row (snake_case columns). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbRow = Record<string, any>;

type PgResult = { data: unknown; error: { message: string; code?: string } | null };

/** Unwrap a Supabase result, throwing a 500 on DB errors. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function must<T = any>(res: PgResult, context: string): T {
  if (res.error) {
    console.error(`[db] ${context}:`, res.error);
    throw new HttpError(500, "DB_ERROR", "Something went wrong. Please try again.");
  }
  return res.data as T;
}

/** Single-row lookup that returns null for "no rows" instead of throwing. */
export function maybe<T = DbRow>(res: PgResult, context: string): T | null {
  if (res.error) {
    if (res.error.code === "PGRST116") return null;
    console.error(`[db] ${context}:`, res.error);
    throw new HttpError(500, "DB_ERROR", "Something went wrong. Please try again.");
  }
  return (res.data as T) ?? null;
}

const toCamelKey = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const toSnakeKey = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Shallow snake_case → camelCase (JSON columns keep their own shape). */
export function camel<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamelKey(k)] = v;
  return out as T;
}

/** Shallow camelCase → snake_case, dropping undefined values. */
export function snake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[toSnakeKey(k)] = v;
  return out;
}

/** Make /assets/… paths absolute so the admin app (other domain) can load them. */
export function absUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("/") ? `${env.appUrl}${path}` : path;
}
