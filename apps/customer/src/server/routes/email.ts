import "server-only";
import { NextResponse } from "next/server";
import { db } from "../db";
import { env } from "../env";
import { route } from "../router";
import { verifyToken } from "../session";

/**
 * One-click unsubscribe from "new on the menu" emails.
 * GET  = customer clicked the link in the email (shows a confirmation page)
 * POST = mail apps' built-in "Unsubscribe" button (RFC 8058 one-click)
 * Order and account emails are never affected.
 */
async function unsubscribe(token: string | null): Promise<boolean> {
  const payload = verifyToken<{ uid: string; p: string; exp: number }>(token ?? undefined);
  if (!payload || payload.p !== "unsub") return false;
  const { error } = await db().from("users").update({ marketing_opt_in: false }).eq("id", payload.uid);
  if (error) {
    console.error("[unsubscribe]", error.message);
    return false;
  }
  return true;
}

function page(ok: boolean) {
  const title = ok ? "You're unsubscribed" : "This link has expired";
  const body = ok
    ? "You won't get any more new-menu emails from us. You'll still receive emails about your own orders."
    : "We couldn't process this unsubscribe link. Reply to any of our emails and we'll remove you by hand.";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F7F3EE;font-family:Helvetica,Arial,sans-serif;color:#2B2B2B">
<div style="max-width:420px;margin:24px;padding:32px;background:#fff;border-radius:24px;text-align:center">
<h1 style="margin:0 0 12px;font:600 24px Georgia,serif;color:#3F5F46">${title}</h1>
<p style="margin:0 0 24px;line-height:1.6;color:#6B6B6B">${body}</p>
<a href="${env.appUrl}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#3F5F46;color:#fff;text-decoration:none;font-weight:600">Back to Dripping Honey Treats</a>
</div></body></html>`;
  return new NextResponse(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

route("GET", "/email/unsubscribe", async ({ query }) => page(await unsubscribe(query.get("t"))));
route("POST", "/email/unsubscribe", async ({ query }) => {
  const ok = await unsubscribe(query.get("t"));
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
});
