import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";
import type { PaymentProvider } from "./types";

/**
 * Paystack — ready but NOT yet tested against a live account.
 * Turn on with PAYMENT_PROVIDER=paystack + PAYSTACK_SECRET_KEY.
 * Webhook URL: {APP_URL}/api/v1/payments/webhook/paystack
 */
const BASE = "https://api.paystack.co";

async function ps<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.payments.paystack.secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string } & T;
  if (!res.ok || !body.status) throw new Error(`Paystack ${res.status}: ${body.message ?? "request failed"}`);
  return body;
}

export const paystack: PaymentProvider = {
  name: "paystack",

  isConfigured: () => Boolean(env.payments.paystack.secretKey),

  async initialize(input) {
    const res = await ps<{ data: { authorization_url: string; reference: string } }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        reference: input.reference,
        amount: input.amount, // Paystack already uses kobo
        currency: input.currency,
        email: input.customer.email,
        callback_url: input.redirectUrl,
        metadata: { ...input.meta, customer_name: input.customer.name },
      }),
    });
    return { checkoutUrl: res.data.authorization_url, providerRef: res.data.reference };
  },

  async verify(reference) {
    try {
      const res = await ps<{ data: { id: number; status: string; amount: number; currency: string } }>(
        `/transaction/verify/${encodeURIComponent(reference)}`,
      );
      const s = res.data.status;
      return {
        status: s === "success" ? "success" : s === "failed" || s === "abandoned" ? "failed" : "pending",
        amountPaid: res.data.amount,
        currency: res.data.currency,
        providerTxId: String(res.data.id),
        raw: res.data,
      };
    } catch {
      return { status: "pending", amountPaid: 0, currency: "NGN" };
    }
  },

  async parseWebhook(headers, rawBody) {
    const key = env.payments.paystack.secretKey;
    const given = headers.get("x-paystack-signature") ?? "";
    if (!key || !given) return null;
    const expected = createHmac("sha512", key).update(rawBody).digest("hex");
    if (expected.length !== given.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return null;
    try {
      const body = JSON.parse(rawBody) as { data?: { reference?: string } };
      return body.data?.reference ? { reference: body.data.reference } : null;
    } catch {
      return null;
    }
  },
};
