import type { NextRequest } from "next/server";
import { dispatch } from "@/server/routes";

/**
 * Temporary backend: every /api/v1/* request lands here and is routed to
 * src/server/routes/*, backed by Supabase. Same contract as apps/api, so
 * switching to the real API later = change NEXT_PUBLIC_API_URL only.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, { params }: Params) {
  const { path } = await params;
  return dispatch(req, path ?? []);
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
