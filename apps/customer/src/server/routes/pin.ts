import "server-only";
import { camel, db, maybe, must } from "../db";
import { HttpError, badRequest, json, optStr, str } from "../http";
import { isEmail, isNigerianMobile, normalizePhone } from "../contact";
import { notifyWelcome, sendOtpCode } from "../notify";
import { assertPin, consumeCode, hashPin, issueCode, maskEmail, verifyPin } from "../otp";
import { route } from "../router";
import { publicUser, requireUser, setSessionCookie, type DbUser } from "../session";

/**
 * Phone-first sign-in with a 4-digit PIN.
 *
 * Verifying phone ownership needs paid SMS/WhatsApp messages, so for now
 * customers choose a PIN when they sign up and use it to sign in. Wrong
 * PINs are counted and the account locks for 15 minutes after 5 misses.
 * A forgotten PIN is reset with a code sent to the account's email.
 */

const MAX_PIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

type PinUser = DbUser & { pinHash?: string | null; pinFailedAttempts?: number; pinLockedUntil?: string | null };

function readPhone(raw: unknown): string {
  const phone = normalizePhone(str(raw, "WhatsApp number", { max: 20 }));
  if (!isNigerianMobile(phone)) throw badRequest("Enter a valid Nigerian mobile number, e.g. 0803 123 4567.");
  return phone;
}

async function userByPhone(phone: string): Promise<PinUser | null> {
  const row = maybe(await db().from("users").select("*").eq("phone", phone).maybeSingle(), "user by phone");
  return row ? camel<PinUser>(row) : null;
}

function signedIn(user: DbUser) {
  const res = json(publicUser(user));
  setSessionCookie(res, user.id);
  return res;
}

/** Step 1: what should the app ask next for this number? */
route("POST", "/auth/phone/start", async ({ body }) => {
  const phone = readPhone(body.phone);
  const user = await userByPhone(phone);
  if (!user) return { next: "create" as const };
  if (user.pinHash) return { next: "pin" as const, name: user.fullName?.split(/\s+/)[0] || null };
  // Older account without a PIN: if it has an email, prove ownership with an emailed code first.
  if (user.email) {
    const code = await issueCode(user.email, "set_pin", user.fullName);
    await sendOtpCode({ email: user.email, code, purpose: "login", name: user.fullName });
    return { next: "create_with_code" as const, sentTo: maskEmail(user.email) };
  }
  return { next: "create" as const };
});

/** Sign in with phone + PIN. */
route("POST", "/auth/pin/login", async ({ body }) => {
  const phone = readPhone(body.phone);
  const pin = String(body.pin ?? "");
  const user = await userByPhone(phone);
  if (!user || !user.pinHash) throw badRequest("No account with that number yet. Create one to continue.");

  if (user.pinLockedUntil && new Date(user.pinLockedUntil) > new Date()) {
    const mins = Math.ceil((new Date(user.pinLockedUntil).getTime() - Date.now()) / 60_000);
    throw new HttpError(429, "PIN_LOCKED", `Too many wrong PINs. Try again in ${mins} min, or reset your PIN.`);
  }

  if (!(await verifyPin(pin, user.pinHash))) {
    const attempts = (user.pinFailedAttempts ?? 0) + 1;
    const locked = attempts >= MAX_PIN_ATTEMPTS;
    await db()
      .from("users")
      .update({
        pin_failed_attempts: locked ? 0 : attempts,
        pin_locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", user.id);
    throw badRequest(
      locked
        ? `Too many wrong PINs. Your account is locked for ${LOCK_MINUTES} minutes. You can reset your PIN.`
        : `Wrong PIN. ${MAX_PIN_ATTEMPTS - attempts} ${MAX_PIN_ATTEMPTS - attempts === 1 ? "try" : "tries"} left.`,
    );
  }

  const row = must(
    await db().from("users").update({ pin_failed_attempts: 0, pin_locked_until: null }).eq("id", user.id).select("*").single(),
    "pin ok",
  );
  return signedIn(camel<DbUser>(row));
});

/** Create an account (or add a PIN to an older account) with phone + PIN + name. */
route("POST", "/auth/pin/register", async ({ body }) => {
  const phone = readPhone(body.phone);
  const pin = assertPin(body.pin);
  const fullName = str(body.fullName, "Your name", { min: 2, max: 80 });
  const existing = await userByPhone(phone);

  if (existing?.pinHash) throw badRequest("This number already has an account. Sign in with your PIN instead.");
  if (existing?.email) await consumeCode(existing.email, String(body.code ?? "")); // older account: prove ownership

  const pinHash = await hashPin(pin);
  let user: DbUser;
  let isNew = false;
  if (existing) {
    user = camel<DbUser>(
      must(
        await db()
          .from("users")
          .update({ pin_hash: pinHash, full_name: existing.fullName || fullName, pin_failed_attempts: 0, pin_locked_until: null })
          .eq("id", existing.id)
          .select("*")
          .single(),
        "add pin",
      ),
    );
  } else {
    user = camel<DbUser>(
      must(
        await db().from("users").insert({ phone, full_name: fullName, pin_hash: pinHash, phone_verified: false }).select("*").single(),
        "create phone user",
      ),
    );
    isNew = true;
  }
  if (isNew) await notifyWelcome(user, "WhatsApp number + PIN");
  return signedIn(user);
});

/** Forgot PIN: email a reset code if the account has an email. */
route("POST", "/auth/pin/forgot", async ({ body }) => {
  const phone = readPhone(body.phone);
  const user = await userByPhone(phone);
  // Same answer whether or not the number exists, so this can't be used to probe accounts.
  if (!user?.email) return { method: "whatsapp" as const };
  const code = await issueCode(user.email, "pin_reset", user.fullName);
  await sendOtpCode({ email: user.email, code, purpose: "login", name: user.fullName });
  return { method: "email" as const, sentTo: maskEmail(user.email) };
});

/** Reset the PIN with the emailed code, then sign in. */
route("POST", "/auth/pin/reset", async ({ body }) => {
  const phone = readPhone(body.phone);
  const pin = assertPin(body.pin);
  const user = await userByPhone(phone);
  if (!user?.email) throw badRequest("We couldn't reset this PIN. Please message us on WhatsApp.");
  await consumeCode(user.email, String(body.code ?? ""));
  const row = must(
    await db()
      .from("users")
      .update({ pin_hash: await hashPin(pin), pin_failed_attempts: 0, pin_locked_until: null })
      .eq("id", user.id)
      .select("*")
      .single(),
    "reset pin",
  );
  return signedIn(camel<DbUser>(row));
});

// ───────────────────────── Profile: PIN + email verification ─────────────────────────

/** Set or change the signed-in user's PIN. */
route("POST", "/me/pin", async ({ req, body }) => {
  const me = (await requireUser(req)) as PinUser;
  const pin = assertPin(body.pin);
  if (me.pinHash && !(await verifyPin(String(body.currentPin ?? ""), me.pinHash))) {
    throw badRequest("Your current PIN is wrong.");
  }
  const row = must(
    await db()
      .from("users")
      .update({ pin_hash: await hashPin(pin), pin_failed_attempts: 0, pin_locked_until: null })
      .eq("id", me.id)
      .select("*")
      .single(),
    "set pin",
  );
  return publicUser(camel<DbUser>(row));
});

/** Send a code to the user's email so they can verify it. */
route("POST", "/me/email/send-code", async ({ req }) => {
  const me = await requireUser(req);
  if (!me.email || !isEmail(me.email)) throw badRequest("Add your email address first.");
  if (me.emailVerified) return { ok: true, alreadyVerified: true };
  const code = await issueCode(me.email, "verify_email", me.fullName);
  const { sent } = await sendOtpCode({ email: me.email, code, purpose: "login", name: me.fullName });
  if (!sent) throw new HttpError(502, "EMAIL_NOT_SENT", "We couldn't send the code. Please check the email address.");
  return { ok: true, sentTo: maskEmail(me.email) };
});

route("POST", "/me/email/verify", async ({ req, body }) => {
  const me = await requireUser(req);
  if (!me.email) throw badRequest("Add your email address first.");
  await consumeCode(me.email, optStr(body.code, 10) ?? "");
  const row = must(await db().from("users").update({ email_verified: true }).eq("id", me.id).select("*").single(), "verify email");
  return publicUser(camel<DbUser>(row));
});
