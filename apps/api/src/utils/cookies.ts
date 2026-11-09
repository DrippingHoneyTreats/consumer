import type { Response } from "express";
import { env } from "../config/env";
import { parseDurationMs } from "./tokens";

export const ACCESS_COOKIE = "access_token";

export function setAccessCookie(res: Response, token: string): void {
  res.cookie(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: parseDurationMs(env.JWT_ACCESS_TTL),
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
}

export function clearAccessCookie(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
}
