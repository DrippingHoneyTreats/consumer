import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";
import type { PaymentProvider } from "./types";

/**
 * Korapay checkout — ready but NOT yet tested against a live account.
 * Turn on with PAYMENT_PROVIDER=kora + KORA_SECRET_KEY.
 * Webhook URL: {APP_URL}/api/v1/payments/webhook/kora
 */
const BASE = "https://api.korapay.com/merchant/api/v1";

async function kora<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.payments.kora.secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string } & T;
  if (!res.ok || !body.status) throw new Error(`Kora ${res.status}: ${body.message ?? "request failed"}`);
  return body;
}

export const korapay: PaymentProvider = {
  name: "kora",

  isConfigured: () => Boolean(env.payments.kora.secretKey),

  async initialize(input) {
    const res = await kora<{ data: { checkout_url: string; reference: string } }>("/charges/initialize", {
      method: "POST",
      body: JSON.stringify({
        reference: input.reference,
        amount: input.amount / 100, // Kora takes naira
        currency: input.currency,
        redirect_url: input.redirectUrl,
        notification_url: `${env.appUrl}/api/v1/payments/webhook/kora`,
        narration: input.description,
        customer: { email: input.customer.email, name: input.customer.name },
        metadata: input.meta,
      }),
    });
    return { checkoutUrl: res.data.checkout_url, providerRef: res.data.reference };
  },

  async verify(reference) {
    try {
      const res = await kora<{ data: { reference: string; status: string; amount: string | number; currency: string } }>(
        `/charges/${encodeURIComponent(reference)}`,
      );
      const s = res.data.status;
      return {
        status: s === "success" ? "success" : s === "failed" ? "failed" : "pending",
        amountPaid: Math.round(Number(res.data.amount) * 100),
        currency: res.data.currency,
        providerTxId: res.data.reference,
        raw: res.data,
      };
    } catch {
      return { status: "pending", amountPaid: 0, currency: "NGN" };
    }
  },

  async parseWebhook(headers, rawBody) {
    const key = env.payments.kora.secretKey;
    const given = headers.get("x-korapay-signature") ?? "";
    if (!key || !given) return null;
    try {
      const body = JSON.parse(rawBody) as { data?: { reference?: string } };
      // Kora signs only the `data` object.
      const expected = createHmac("sha256", key).update(JSON.stringify(body.data)).digest("hex");
      if (expected.length !== given.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return null;
      return body.data?.reference ? { reference: body.data.reference } : null;
    } catch {
      return null;
    }
  },
};
