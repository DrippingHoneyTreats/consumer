import "server-only";
import { NextResponse, type NextRequest } from "next/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, "BAD_REQUEST", message, details);
export const unauthorized = (message = "Please sign in to continue.") =>
  new HttpError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have access to this.") =>
  new HttpError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found.") => new HttpError(404, "NOT_FOUND", message);

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { code: err.code, message: err.message, details: err.details },
      { status: err.status },
    );
  }
  console.error("[api] unhandled", err);
  return NextResponse.json(
    { code: "INTERNAL", message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}

/** Parsed request handed to every route handler. */
export type Ctx = {
  req: NextRequest;
  method: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
};

export function str(v: unknown, field: string, opts: { min?: number; max?: number } = {}): string {
  if (typeof v !== "string") throw badRequest(`${field} is required.`);
  const s = v.trim();
  if (s.length < (opts.min ?? 1)) throw badRequest(`${field} is required.`);
  if (opts.max && s.length > opts.max) throw badRequest(`${field} is too long.`);
  return s;
}

export function optStr(v: unknown, max = 2000): string | undefined {
  if (v == null) return undefined;
  if (typeof v !== "string") throw badRequest("Invalid text field.");
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

export function int(v: unknown, field: string, opts: { min?: number; max?: number } = {}): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) throw badRequest(`${field} must be a number.`);
  const r = Math.round(n);
  if (opts.min != null && r < opts.min) throw badRequest(`${field} is too small.`);
  if (opts.max != null && r > opts.max) throw badRequest(`${field} is too large.`);
  return r;
}
