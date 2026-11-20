import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env";
import type { Email } from "./templates";

export type OutgoingEmail = Email & {
  to: string | string[];
  /** e.g. List-Unsubscribe for marketing mail. */
  headers?: Record<string, string>;
};

let smtpTransport: Transporter | null = null;

function smtp(): Transporter {
  smtpTransport ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return smtpTransport;
}

const list = (to: string | string[]) => (Array.isArray(to) ? to : [to]);

function resendPayload(msg: OutgoingEmail) {
  return {
    from: env.emailFrom,
    to: list(msg.to),
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    ...(env.emailReplyTo ? { reply_to: env.emailReplyTo } : {}),
    ...(msg.headers ? { headers: msg.headers } : {}),
  };
}

async function resend(path: string, body: unknown) {
  if (!env.resend.apiKey) throw new Error("No email provider: set RESEND_API_KEY (or SMTP_HOST/SMTP_USER/SMTP_PASS)");
  const res = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resend.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

/** Sends via SMTP when SMTP_HOST is set, otherwise Resend. Throws on failure. */
export async function sendEmail(msg: OutgoingEmail): Promise<void> {
  if (env.smtp.host) {
    await smtp().sendMail({
      from: env.emailFrom,
      to: list(msg.to).join(", "),
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      headers: msg.headers,
      ...(env.emailReplyTo ? { replyTo: env.emailReplyTo } : {}),
    });
    return;
  }
  await resend("/emails", resendPayload(msg));
}

/**
 * Many different emails at once (e.g. product announcements). Resend's batch
 * API takes up to 100 per call; SMTP falls back to one-by-one.
 * Returns how many were accepted.
 */
export async function sendEmailBatch(messages: OutgoingEmail[]): Promise<number> {
  if (!messages.length) return 0;
  if (env.smtp.host) {
    let ok = 0;
    for (const m of messages) {
      try {
        await sendEmail(m);
        ok++;
      } catch (e) {
        console.warn("[email] batch item failed:", (e as Error).message);
      }
    }
    return ok;
  }
  let ok = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    await resend("/emails/batch", chunk.map(resendPayload));
    ok += chunk.length;
  }
  return ok;
}
