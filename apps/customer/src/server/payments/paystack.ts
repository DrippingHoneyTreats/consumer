import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";
import type { PaymentProvider, VerifyResult } from "./types";

/**
 * Paystack.
 *  - Inline: the server initializes the transaction, then the browser resumes it
 *    in Paystack's popup on our page (InlineJS v2 `resumeTransaction(access_code)`).
 *    Docs: https://paystack.com/docs/payments/accept-payments/#popup
 *  - Redirect: Paystack's hosted page (authorization_url), used as the fallback.
 * Either way the server verifies the transaction with Paystack before marking
 * anything paid — the browser's word is never trusted.
 *
 * Env: PAYSTACK_PUBLIC_KEY (pk_test_… / pk_live_…)
 *      PAYSTACK_SECRET_KEY (sk_test_… / sk_live_…) — also signs webhooks.
 * Webhook URL: {APP_URL}/api/v1/payments/webhook/paystack
 */
const BASE = "https://api.paystack.co";
const TITLE = "Dripping Honey Treats";

/** Exact reason Paystack can't be used, or null when the keys look right. */
function configProblem(): string | null {
  const { publicKey, secretKey } = env.payments.paystack;
  // Show only the first few characters of what was found, never the key itself.
  const peek = (v: string) => `"${v.slice(0, 8)}…"`;
  if (!secretKey) return "Paystack secret key (PAYSTACK_SECRET_KEY) is not set.";
  if (!/^sk_(test|live)_/.test(secretKey)) {
    return `PAYSTACK_SECRET_KEY is not a Paystack secret key (it should start with sk_test_ or sk_live_, but starts with ${peek(secretKey)}).`;
  }
  if (publicKey && !/^pk_(test|live)_/.test(publicKey)) {
    return `PAYSTACK_PUBLIC_KEY is not a Paystack public key (it should start with pk_test_ or pk_live_, but starts with ${peek(publicKey)}).`;
  }
  if (publicKey && publicKey.startsWith("pk_test_") !== secretKey.startsWith("sk_test_")) {
    return "PAYSTACK_PUBLIC_KEY and PAYSTACK_SECRET_KEY must both be test keys or both be live keys.";
  }
  return null;
}

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

type PsTx = {
  id: number;
  reference: string;
  /** success | failed | abandoned | ongoing | pending | processing | queued | reversed */
  status: string;
  amount: number; // kobo
  currency: string;
};

function toResult(tx: PsTx): VerifyResult {
  // "abandoned" just means not paid YET (the customer can still finish), so keep it pending.
  // An explicit cancel from the popup still settles it as failed (see routes/payments.ts).
  const status =
    tx.status === "success" ? "success" : tx.status === "failed" || tx.status === "reversed" ? "failed" : "pending";
  return {
    status,
    amountPaid: Number(tx.amount) || 0,
    currency: tx.currency,
    providerTxId: String(tx.id),
    raw: tx,
  };
}

export const paystack: PaymentProvider = {
  name: "paystack",

  isConfigured: () => configProblem() === null,
  configProblem,

  async initialize(input) {
    const res = await ps<{ data: { authorization_url: string; access_code: string; reference: string } }>(
      "/transaction/initialize",
      {
        method: "POST",
        body: JSON.stringify({
          reference: input.reference,
          amount: input.amount, // Paystack takes kobo, same as us
          currency: input.currency,
          email: input.customer.email,
          callback_url: input.redirectUrl,
          metadata: {
            ...input.meta,
            customer_name: input.customer.name,
            ...(input.customer.phone ? { customer_phone: input.customer.phone } : {}),
            // Shown on the Paystack dashboard / receipt.
            custom_fields: [
              { display_name: "Order", variable_name: "order_no", value: input.meta.orderNo ?? input.description },
              { display_name: "Customer", variable_name: "customer_name", value: input.customer.name },
            ],
          },
        }),
      },
    );
    const { publicKey } = env.payments.paystack;
    return {
      checkoutUrl: res.data.authorization_url,
      providerRef: res.data.reference,
      inline: {
        provider: "paystack",
        publicKey,
        accessCode: res.data.access_code,
        reference: input.reference,
        amount: input.amount / 100,
        currency: input.currency,
        customer: input.customer,
        title: TITLE,
        description: input.description,
        logo: `${env.appUrl}/assets/icons/icon-192.png`,
        meta: input.meta,
      },
    };
  },

  async verify(reference) {
    try {
      const res = await ps<{ data: PsTx }>(`/transaction/verify/${encodeURIComponent(reference)}`);
      if (res.data.reference !== reference) {
        console.error("[paystack] verify returned a different reference", reference, res.data.reference);
        return { status: "pending", amountPaid: 0, currency: "NGN" };
      }
      return toResult(res.data);
    } catch (err) {
      // Unknown reference / network trouble → still pending; the webhook or next poll settles it.
      console.warn("[paystack] verify", reference, (err as Error).message);
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
      // Any event type is fine: settle() asks Paystack for the real status anyway.
      const body = JSON.parse(rawBody) as { data?: { reference?: string } };
      return body.data?.reference ? { reference: body.data.reference } : null;
    } catch {
      return null;
    }
  },
};
