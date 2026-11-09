import { Op } from "sequelize";
import { env } from "../config/env";
import { OtpRequest } from "../models/OtpRequest";
import { User } from "../models/User";
import { badRequest, unauthorized } from "../utils/errors";
import { detectContactKind, normalizePhone } from "../utils/phone";
import { generateOtpCode, hashOtp } from "../utils/tokens";

function normalizeContact(contact: string): { kind: "email" | "phone"; value: string } {
  const kind = detectContactKind(contact);
  return {
    kind,
    value: kind === "email" ? contact.trim().toLowerCase() : normalizePhone(contact),
  };
}

export async function registerUser(input: {
  fullName: string;
  contact: string;
  channel: "sms" | "email" | "whatsapp";
  consent?: boolean;
}): Promise<{ created: boolean; user: User }> {
  const { kind, value } = normalizeContact(input.contact);
  const existing =
    kind === "email"
      ? await User.findOne({ where: { email: value } })
      : await User.findOne({ where: { phone: value } });

  if (existing) {
    return { created: false, user: existing };
  }

  const user = await User.create({
    fullName: input.fullName.trim(),
    email: kind === "email" ? value : null,
    phone: kind === "phone" ? value : null,
    consentAt: input.consent ? new Date() : null,
  });

  return { created: true, user };
}

export async function sendOtp(input: {
  contact: string;
  channel: "sms" | "email" | "whatsapp";
  purpose: string;
}): Promise<{ sent: true; devHint?: string }> {
  const { value } = normalizeContact(input.contact);

  await OtpRequest.update(
    { status: "expired" },
    {
      where: {
        contact: value,
        status: "pending",
      },
    },
  );

  const code =
    env.NODE_ENV !== "production" && env.DEV_OTP_CODE
      ? env.DEV_OTP_CODE
      : generateOtpCode();

  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60_000);

  await OtpRequest.create({
    contact: value,
    channel: input.channel,
    purpose: input.purpose,
    codeHash: hashOtp(code),
    expiresAt,
  });

  // Phase 1: no WhatsApp/SMS provider. Dev code is accepted via DEV_OTP_CODE.
  if (env.NODE_ENV !== "production" && env.DEV_OTP_CODE) {
    console.log(`[otp] DEV code for ${value}: ${env.DEV_OTP_CODE}`);
    return { sent: true, devHint: "Use DEV_OTP_CODE from .env" };
  }

  console.log(`[otp] Generated code for ${value} (provider not wired yet)`);
  return { sent: true };
}

export async function verifyOtp(input: {
  contact: string;
  code: string;
}): Promise<User> {
  const { kind, value } = normalizeContact(input.contact);

  const otp = await OtpRequest.findOne({
    where: {
      contact: value,
      status: "pending",
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "DESC"]],
  });

  if (!otp) {
    throw unauthorized("Invalid or expired code");
  }

  if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
    await otp.update({ status: "locked" });
    throw unauthorized("Too many attempts. Request a new code.");
  }

  const isDevBypass =
    env.NODE_ENV !== "production" &&
    env.DEV_OTP_CODE &&
    input.code === env.DEV_OTP_CODE;

  const matches = isDevBypass || otp.codeHash === hashOtp(input.code);

  if (!matches) {
    await otp.update({ attempts: otp.attempts + 1 });
    throw unauthorized("Invalid code");
  }

  await otp.update({ status: "verified" });

  let user =
    kind === "email"
      ? await User.findOne({ where: { email: value } })
      : await User.findOne({ where: { phone: value } });

  if (!user) {
    throw badRequest("No account for this contact. Register first.");
  }

  if (kind === "email") {
    await user.update({ emailVerified: true });
  } else {
    await user.update({ phoneVerified: true });
  }

  await user.reload();
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  return User.findByPk(id);
}
