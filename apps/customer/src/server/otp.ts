import "server-only";
import { createHmac, randomInt, scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, must } from "./db";
import { env } from "./env";
import { HttpError, badRequest } from "./http";

/**
 * One-time codes (emailed) and PIN hashing, shared by sign-in, PIN
 * recovery and email verification. Codes use the same HMAC scheme as
 * /auth/otp/*, so they're interchangeable.
 */

const OTP_TTL_MIN = 10;
const OTP_MAX_SENDS_PER_15_MIN = 5;
const OTP_MAX_ATTEMPTS = 5;

const hashCode = (contact: string, code: string) =>
  createHmac("sha256", env.sessionSecret).update(`${contact}:${code}`).digest("hex");

/** Create and store a 6-digit code for `contact` (rate-limited). Returns the code to send. */
export async function issueCode(contact: string, purpose: string, fullName?: string | null): Promise<string> {
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await db()
    .from("otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("contact", contact)
    .gte("created_at", since);
  if ((count ?? 0) >= OTP_MAX_SENDS_PER_15_MIN) {
    throw new HttpError(429, "TOO_MANY_REQUESTS", "Too many codes requested. Please wait a few minutes.");
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  must(
    await db().from("otp_codes").insert({
      contact,
      code_hash: hashCode(contact, code),
      purpose,
      full_name: fullName ?? null,
      expires_at: new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString(),
    }),
    "store code",
  );
  return code;
}

/** Check and consume the latest valid code for `contact`. Throws a friendly 400 if wrong/expired. */
export async function consumeCode(contact: string, codeRaw: string): Promise<void> {
  const code = String(codeRaw ?? "").replace(/\D/g, "");
  if (env.devOtpCode && !env.isProd && code === env.devOtpCode) return;
  const { data: otp } = await db()
    .from("otp_codes")
    .select("*")
    .eq("contact", contact)
    .is("consumed_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!otp) throw badRequest("That code has expired. Request a new one.");
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw badRequest("Too many wrong attempts. Request a new code.");
  const expected = Buffer.from(otp.code_hash as string);
  const given = Buffer.from(hashCode(contact, code));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await db().from("otp_codes").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    throw badRequest("Wrong code. Please check and try again.");
  }
  await db().from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);
}

// ───────────────────────── PINs ─────────────────────────

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export function assertPin(pin: unknown): string {
  const p = String(pin ?? "");
  if (!/^\d{4}$/.test(p)) throw badRequest("Your PIN must be exactly 4 digits.");
  if (/^(\d)\1{3}$/.test(p) || ["1234", "4321", "0123", "9876"].includes(p)) {
    throw badRequest("That PIN is too easy to guess. Please choose another one.");
  }
  return p;
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pin, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPin(pin: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(pin, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** "ad***@gmail.com" */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
}
