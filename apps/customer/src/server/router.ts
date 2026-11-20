import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { errorResponse, json, notFound, type Ctx } from "./http";

export type Handler = (ctx: Ctx & { raw: string }) => Promise<unknown>;

type Route = { method: string; parts: string[]; handler: Handler };

const routes: Route[] = [];

/** Register a route. Pattern like "/orders/:id/items/:itemId". First match wins. */
export function route(method: string, pattern: string, handler: Handler) {
  routes.push({ method, parts: pattern.split("/").filter(Boolean), handler });
}

function match(method: string, segments: string[]) {
  let methodMismatch = false;
  for (const r of routes) {
    if (r.parts.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < r.parts.length; i++) {
      const p = r.parts[i];
      if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(segments[i]);
      else if (p !== segments[i]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (r.method !== method) {
      methodMismatch = true;
      continue;
    }
    return { route: r, params };
  }
  return { route: null, params: {}, methodMismatch };
}

export async function dispatch(req: NextRequest, segments: string[]): Promise<NextResponse> {
  try {
    const found = match(req.method, segments);
    if (!found.route) {
      if (found.methodMismatch) return json({ code: "METHOD_NOT_ALLOWED", message: "Method not allowed" }, 405);
      throw notFound(`No endpoint ${req.method} /${segments.join("/")}`);
    }

    const isMultipart = req.headers.get("content-type")?.includes("multipart/form-data");
    const raw = req.method === "GET" || req.method === "HEAD" || isMultipart ? "" : await req.text();
    let body: Record<string, unknown> = {};
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
      } catch {
        /* non-JSON body (e.g. webhook form posts) — handler can read `raw` */
      }
    }

    const result = await found.route.handler({
      req,
      method: req.method,
      params: found.params,
      query: req.nextUrl.searchParams,
      body,
      raw,
    });
    if (result instanceof NextResponse) return result;
    if (result === undefined) return new NextResponse(null, { status: 204 });
    return json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
