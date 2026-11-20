import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { camel, db, maybe } from "./db";
import { env, requireEnv } from "./env";
import { forbidden, unauthorized } from "./http";
import type { User } from "@dht/types";

export const SESSION_COOKIE = "dht_session";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

type Payload = { uid: string; exp: number };

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", requireEnv(env.sessionSecret, "SESSION_SECRET"))
    .update(data)
    .digest("base64url");
}

/** Generic signed token (sessions, OAuth state). */
export function signToken(payload: object): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken<T extends { exp: number }>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    if (!payload.exp || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, userId: string) {
  const token = signToken({ uid: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE_S } satisfies Payload);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export type DbUser = User & { createdAt: string; googleSub?: string | null };

export function publicUser(u: DbUser): User & { createdAt: string } {
  return {
    id: u.id,
    fullName: u.fullName,
    phone: u.phone ?? null,
    email: u.email ?? null,
    phoneVerified: u.phoneVerified,
    emailVerified: u.emailVerified,
    role: u.role,
    avatar: u.avatar ?? null,
    hasPin: Boolean((u as { pinHash?: string | null }).pinHash),
    createdAt: u.createdAt,
  };
}

export async function currentUser(req: NextRequest): Promise<DbUser | null> {
  const payload = verifyToken<Payload>(req.cookies.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const row = maybe(
    await db().from("users").select("*").eq("id", payload.uid).maybeSingle(),
    "load session user",
  );
  return row ? camel<DbUser>(row) : null;
}

export async function requireUser(req: NextRequest): Promise<DbUser> {
  const user = await currentUser(req);
  if (!user) throw unauthorized();
  return user;
}

export async function requireStaff(req: NextRequest): Promise<DbUser> {
  const user = await requireUser(req);
  if (user.role !== "STAFF" && user.role !== "SUPER_ADMIN") throw forbidden();
  return user;
}
