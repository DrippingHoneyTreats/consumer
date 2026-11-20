import "server-only";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { camel, db, maybe, must } from "../db";
import { env } from "../env";
import { HttpError, badRequest, forbidden, json, optStr, str } from "../http";
import { isEmail, isPhone, normalizeContact, normalizePhone } from "../contact";
import { notifyWelcome, sendOtpCode } from "../notify";
import { route } from "../router";
import {
  clearSessionCookie,

  publicUser,
  requireUser,
  setSessionCookie,
  signToken,
  verifyToken,
  type DbUser,
} from "../session";

const OTP_TTL_MIN = 10;
const OTP_MAX_SENDS_PER_15_MIN = 5;
const OTP_MAX_ATTEMPTS = 5;

function hashCode(contact: string, code: string) {
  return createHmac("sha256", env.sessionSecret).update(`${contact}:${code}`).digest("hex");
}

async function findUserByContact(kind: "email" | "phone", value: string): Promise<DbUser | null> {
  const row = maybe(await db().from("users").select("*").eq(kind, value).maybeSingle(), "find user");
  return row ? camel<DbUser>(row) : null;
}

const isStaff = (u: DbUser | null) => u?.role === "STAFF" || u?.role === "SUPER_ADMIN";

/** Kept for API compatibility — the name now travels with /auth/otp/send. */
route("POST", "/auth/register", async () => ({ ok: true }));

route("POST", "/auth/otp/send", async ({ body }) => {
  const contactRaw = str(body.contact, "Phone or email", { max: 120 });
  const { kind, value } = normalizeContact(contactRaw);
  if (kind === "phone" && !isPhone(value)) throw badRequest("Enter a valid phone number.");
  const audience = body.audience === "admin" ? "admin" : "customer";
  const fullName = optStr(body.fullName, 80);

  const user = await findUserByContact(kind, value);
  if (audience === "admin" && !isStaff(user) && !(kind === "email" && env.adminEmails.includes(value))) {
    throw forbidden("This email is not on the admin team. Ask a super admin to invite you.");
  }

  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count, error: countError } = await db()
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("contact", value)
    .gte("created_at", since);
  if (countError) console.error("[db] otp rate", countError);
  if ((count ?? 0) >= OTP_MAX_SENDS_PER_15_MIN) {
    throw new HttpError(429, "TOO_MANY_REQUESTS", "Too many codes requested. Please wait a few minutes.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  must(
    await db().from("otp_codes").insert({
      contact: value,
      code_hash: hashCode(value, code),
      purpose: audience === "admin" ? "admin" : String(body.purpose ?? "login"),
      full_name: fullName ?? null,
      expires_at: new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString(),
    }),
    "store otp",
  );

  // Send to the contact they typed, plus the other channel we already know.
  const { sent } = await sendOtpCode({
    code,
    email: kind === "email" ? value : user?.email,
    phone: kind === "phone" ? value : user?.phone,
    purpose: audience === "admin" ? "admin" : user ? "login" : "signup",
    name: user?.fullName || fullName,
  });

  if (!sent && !env.devOtpCode) {
    throw new HttpError(
      502,
      "OTP_NOT_SENT",
      kind === "phone"
        ? "We couldn't send a WhatsApp code to that number. Try signing in with email instead."
        : "We couldn't send your code. Please check the email and try again.",
    );
  }
  return { ok: true, channels: sent };
});

route("POST", "/auth/otp/verify", async ({ body }) => {
  const { kind, value } = normalizeContact(str(body.contact, "Phone or email", { max: 120 }));
  const code = str(body.code, "Code", { max: 10 }).replace(/\D/g, "");
  const audience = body.audience === "admin" ? "admin" : "customer";

  const otp = maybe(
    await db()
      .from("otp_codes")
      .select("*")
      .eq("contact", value)
      .is("consumed_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "load otp",
  );

  const devOk = Boolean(env.devOtpCode) && !env.isProd && code === env.devOtpCode;
  if (!devOk) {
    if (!otp) throw badRequest("That code has expired. Request a new one.");
    if ((otp.attempts as number) >= OTP_MAX_ATTEMPTS) throw badRequest("Too many wrong attempts. Request a new code.");
    const expected = Buffer.from(otp.code_hash as string);
    const given = Buffer.from(hashCode(value, code));
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      await db().from("otp_codes").update({ attempts: (otp.attempts as number) + 1 }).eq("id", otp.id);
      throw badRequest("Invalid code. Please try again.");
    }
  }
  if (otp) await db().from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

  let user = await findUserByContact(kind, value);
  let isNew = false;
  const verifiedFlag = kind === "email" ? { email_verified: true } : { phone_verified: true };
  if (!user) {
    const name = optStr(body.fullName, 80) ?? (otp?.full_name as string | null) ?? "";
    const role = kind === "email" && env.adminEmails.includes(value) ? "SUPER_ADMIN" : "CUSTOMER";
    const row = must(
      await db()
        .from("users")
        .insert({ full_name: name, [kind]: value, role, ...verifiedFlag })
        .select("*")
        .single(),
      "create user",
    );
    user = camel<DbUser>(row);
    isNew = true;
  } else {
    const patch: Record<string, unknown> = { ...verifiedFlag, updated_at: new Date().toISOString() };
    if (!user.fullName && otp?.full_name) patch.full_name = otp.full_name;
    if (kind === "email" && env.adminEmails.includes(value) && user.role === "CUSTOMER") patch.role = "SUPER_ADMIN";
    const row = must(await db().from("users").update(patch).eq("id", user.id).select("*").single(), "update user");
    user = camel<DbUser>(row);
  }

  if (audience === "admin" && !isStaff(user)) throw forbidden("This account does not have admin access.");
  if (isNew && audience === "customer") await notifyWelcome(user, kind === "email" ? "email code" : "WhatsApp code");

  const res = json(publicUser(user));
  setSessionCookie(res, user.id);
  return res;
});

route("POST", "/auth/logout", async () => {
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
});

route("GET", "/me", async ({ req }) => publicUser(await requireUser(req)));

route("PATCH", "/me", async ({ req, body }) => {
  const user = await requireUser(req);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.fullName !== undefined) patch.full_name = str(body.fullName, "Name", { min: 2, max: 80 });
  if (body.phone !== undefined && body.phone !== null && body.phone !== "") {
    const phone = normalizePhone(str(body.phone, "Phone"));
    if (!isPhone(phone)) throw badRequest("Enter a valid phone number.");
    if (phone !== user.phone) {
      const taken = await findUserByContact("phone", phone);
      if (taken && taken.id !== user.id) throw badRequest("That phone number is already on another account.");
      patch.phone = phone;
      patch.phone_verified = false;
    }
  }
  if (body.email !== undefined && body.email !== null && body.email !== "") {
    const email = str(body.email, "Email").toLowerCase();
    if (!isEmail(email)) throw badRequest("Enter a valid email.");
    if (email !== user.email) {
      const taken = await findUserByContact("email", email);
      if (taken && taken.id !== user.id) throw badRequest("That email is already on another account.");
      patch.email = email;
      patch.email_verified = false;
    }
  }
  const row = must(await db().from("users").update(patch).eq("id", user.id).select("*").single(), "update me");
  return publicUser(camel<DbUser>(row));
});

// ───────────────────────── Google sign-in ─────────────────────────

const GOOGLE_NONCE_COOKIE = "dht_g_nonce";
const redirectUri = () => `${env.appUrl}/api/v1/auth/google/callback`;

function safeReturnTo(v: string | null | undefined) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

route("GET", "/auth/google/start", async ({ query }) => {
  if (!env.google.clientId) {
    return NextResponse.redirect(`${env.appUrl}/verify?error=google_unavailable`);
  }
  const nonce = randomBytes(16).toString("hex");
  const state = signToken({
    r: safeReturnTo(query.get("returnTo")),
    n: nonce,
    exp: Math.floor(Date.now() / 1000) + 600,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.google.clientId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  const res = NextResponse.redirect(url.toString());
  res.cookies.set(GOOGLE_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
});

route("GET", "/auth/google/callback", async ({ req, query }) => {
  const fail = (reason: string) => {
    console.warn("[google] sign-in failed:", reason);
    return NextResponse.redirect(`${env.appUrl}/verify?error=google`);
  };
  const state = verifyToken<{ r: string; n: string; exp: number }>(query.get("state") ?? undefined);
  const code = query.get("code");
  if (!state || !code) return fail("bad state/code");
  if (state.n !== req.cookies.get(GOOGLE_NONCE_COOKIE)?.value) return fail("nonce mismatch");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenRes.ok) return fail(`token ${tokenRes.status} ${await tokenRes.text()}`);
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return fail("no access token");

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!infoRes.ok) return fail(`userinfo ${infoRes.status}`);
  const info = (await infoRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!info.sub || !info.email || !info.email_verified) return fail("email not verified");
  const email = info.email.toLowerCase();

  // Match by Google id first, then link an existing email account.
  let row = maybe(await db().from("users").select("*").eq("google_sub", info.sub).maybeSingle(), "google user");
  if (!row) row = maybe(await db().from("users").select("*").eq("email", email).maybeSingle(), "email user");

  let user: DbUser;
  let isNew = false;
  if (row) {
    const patch: Record<string, unknown> = {
      google_sub: info.sub,
      email_verified: true,
      updated_at: new Date().toISOString(),
    };
    if (!row.full_name && info.name) patch.full_name = info.name;
    if (!row.avatar && info.picture) patch.avatar = info.picture;
    if (env.adminEmails.includes(email) && row.role === "CUSTOMER") patch.role = "SUPER_ADMIN";
    user = camel<DbUser>(must(await db().from("users").update(patch).eq("id", row.id).select("*").single(), "link google"));
  } else {
    user = camel<DbUser>(
      must(
        await db()
          .from("users")
          .insert({
            full_name: info.name ?? "",
            email,
            email_verified: true,
            google_sub: info.sub,
            avatar: info.picture ?? null,
            role: env.adminEmails.includes(email) ? "SUPER_ADMIN" : "CUSTOMER",
          })
          .select("*")
          .single(),
        "create google user",
      ),
    );
    isNew = true;
  }
  if (isNew) await notifyWelcome(user, "Google");

  // Hand the session cookie over on a plain 200 page (not a redirect) and set
  // ONLY that one cookie. Cookies on redirects, and several Set-Cookie headers
  // on one response, can get dropped by serverless/CDN layers. The nonce
  // cookie simply expires on its own after 10 minutes.
  const target = `${env.appUrl}${safeReturnTo(state.r)}`;
  const safe = JSON.stringify(target).replace(/</g, "\\u003c");
  const res = new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=${target.replace(/"/g, "&quot;")}"><title>Signing you in…</title></head>
<body style="font-family:system-ui,sans-serif;background:#f7f3ee;color:#3f5f46;display:flex;min-height:100vh;align-items:center;justify-content:center">
<p>Signing you in…</p><script>location.replace(${safe})</script></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
  setSessionCookie(res, user.id);
  return res;
});

/** Used by the client to decide whether to show the Google button. */
route("GET", "/auth/providers", async () => ({
  google: Boolean(env.google.clientId && env.google.clientSecret),
}));
