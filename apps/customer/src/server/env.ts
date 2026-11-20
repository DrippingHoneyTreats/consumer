import "server-only";

/**
 * Server-only configuration for the temporary backend (Next route handlers
 * under /api/v1 + Supabase). Nothing here is ever sent to the browser.
 */
function str(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

function list(name: string): string[] {
  return str(name)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  /** Public URL of the customer app, e.g. https://drippinghoneytreats.netlify.app */
  appUrl: str("APP_URL", process.env.URL ?? "http://localhost:3000").replace(/\/$/, ""),
  /** Public URL of the admin app (CORS + links in admin emails). */
  adminUrl: str("ADMIN_APP_URL", "http://localhost:3001").replace(/\/$/, ""),
  isProd: process.env.NODE_ENV === "production",

  supabaseUrl: str("SUPABASE_URL"),
  supabaseServiceKey: str("SUPABASE_SERVICE_ROLE_KEY"),

  /** Long random string — signs session cookies. */
  sessionSecret: str("SESSION_SECRET"),
  /** Only for local dev: lets this code always verify. Never set in production. */
  devOtpCode: str("DEV_OTP_CODE"),

  /** Emails that become SUPER_ADMIN on first sign-in (comma-separated). */
  adminEmails: list("ADMIN_EMAILS").map((e) => e.toLowerCase()),
  /** Who gets new-order / new-event alerts. */
  adminNotifyEmails: list("ADMIN_NOTIFY_EMAILS"),
  adminNotifyWhatsapp: list("ADMIN_NOTIFY_WHATSAPP"),

  /** Image hosting for admin uploads. If unset, uploads go to Supabase Storage. */
  cloudinary: {
    cloudName: str("CLOUDINARY_CLOUD_NAME"),
    apiKey: str("CLOUDINARY_API_KEY"),
    apiSecret: str("CLOUDINARY_API_SECRET"),
    folder: str("CLOUDINARY_FOLDER", "dripping-honey-treats"),
  },

  google: {
    clientId: str("GOOGLE_CLIENT_ID"),
    clientSecret: str("GOOGLE_CLIENT_SECRET"),
  },

  /** Shared by both email transports. */
  emailFrom: str("EMAIL_FROM", "Dripping Honey Treats <hello@drippinghoneytreats.com>"),
  /** Optional absolute logo URL for emails (e.g. the logo uploaded to Cloudinary). */
  emailLogoUrl: str("EMAIL_LOGO_URL"),
  /** Customer replies land in the business inbox (Zoho). */
  emailReplyTo: str("EMAIL_REPLY_TO", "hello@drippinghoneytreats.com"),

  /** Option A (simplest today): any SMTP mailbox, e.g. Gmail with an App Password. Used when SMTP_HOST is set. */
  smtp: {
    host: str("SMTP_HOST"),
    port: Number(str("SMTP_PORT", "465")) || 465,
    user: str("SMTP_USER"),
    pass: str("SMTP_PASS"),
  },

  /** Option B: Resend (needs a verified domain to email customers). */
  resend: {
    apiKey: str("RESEND_API_KEY"),
  },

  whatsapp: {
    token: str("WHATSAPP_TOKEN"),
    phoneNumberId: str("WHATSAPP_PHONE_NUMBER_ID"),
    apiVersion: str("WHATSAPP_API_VERSION", "v21.0"),
    lang: str("WHATSAPP_TEMPLATE_LANG", "en"),
    /** Authentication template: body {{1}} = code, copy-code button. */
    otpTemplate: str("WHATSAPP_TEMPLATE_OTP"),
    /** Utility template: name, subject, message (3 body params). */
    updateTemplate: str("WHATSAPP_TEMPLATE_UPDATE"),
    /** Utility template for staff: message (1 body param). */
    adminTemplate: str("WHATSAPP_TEMPLATE_ADMIN"),
  },

  payments: {
    provider: str("PAYMENT_PROVIDER", "flutterwave").toLowerCase(),
    /** Used when a customer has no email (phone-only sign-up) — gateways require one. */
    fallbackEmailDomain: str("PAYMENT_FALLBACK_EMAIL_DOMAIN", "drippinghoneytreats.com"),
    flutterwave: {
      secretKey: str("FLW_SECRET_KEY"),
      secretHash: str("FLW_SECRET_HASH"),
    },
    paystack: {
      secretKey: str("PAYSTACK_SECRET_KEY"),
    },
    kora: {
      secretKey: str("KORA_SECRET_KEY"),
    },
  },
};

export function requireEnv(value: string, name: string): string {
  if (!value) throw new Error(`Missing server env var ${name}`);
  return value;
}
