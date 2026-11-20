import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "../env";
import type { PaymentProvider, VerifyResult } from "./types";

/**
 * Flutterwave (v3).
 *  - Inline: the browser opens Flutterwave's popup on our page (needs FLW_PUBLIC_KEY).
 *    Docs: https://developer.flutterwave.com/docs/collecting-payments/inline
 *  - Standard: hosted checkout page, used as the fallback (e.g. popup blocked).
 *    Docs: https://developer.flutterwave.com/docs/collecting-payments/standard
 * Either way the server verifies the transaction with Flutterwave before
 * marking anything paid — the browser's word is never trusted.
 *
 * Env: FLW_PUBLIC_KEY (FLWPUBK_TEST-… / FLWPUBK-…)
 *      FLW_SECRET_KEY (FLWSECK_TEST-… / FLWSECK-…)
 *      FLW_SECRET_HASH (any string; paste the same into Dashboard → Settings → Webhooks)
 */
const BASE = "https://api.flutterwave.com/v3";

/** Exact reason Flutterwave can't be used, or null when the keys look right. */
function configProblem(): string | null {
  const { publicKey, secretKey } = env.payments.flutterwave;
  // Show only the first few characters of what was found, never the key itself.
  const peek = (v: string) => `"${v.slice(0, 8)}…"`;
  if (!secretKey) return "Flutterwave secret key (FLW_SECRET_KEY) is not set.";
  if (!secretKey.startsWith("FLWSECK")) {
    return `FLW_SECRET_KEY is not a Flutterwave secret key (it should start with FLWSECK, but starts with ${peek(secretKey)}).`;
  }
  if (publicKey && !publicKey.startsWith("FLWPUBK")) {
    return `FLW_PUBLIC_KEY is not a Flutterwave public key (it should start with FLWPUBK, but starts with ${peek(publicKey)}).`;
  }
  return null;
}

async function flw<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.payments.flutterwave.secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string } & T;
  if (!res.ok || body.status !== "success") {
    throw new Error(`Flutterwave ${res.status}: ${body.message ?? "request failed"}`);
  }
  return body;
}

type FlwTx = {
  id: number;
  tx_ref: string;
  status: string; // successful | failed | pending
  amount: number; // naira
  charged_amount: number;
  currency: string;
};

function toResult(tx: FlwTx): VerifyResult {
  const status = tx.status === "successful" ? "success" : tx.status === "failed" ? "failed" : "pending";
  return {
    status,
    amountPaid: Math.round(Number(tx.amount) * 100),
    currency: tx.currency,
    providerTxId: String(tx.id),
    raw: tx,
  };
}

export const flutterwave: PaymentProvider = {
  name: "flutterwave",

  isConfigured: () => configProblem() === null,
  configProblem,

  async initialize(input) {
    const res = await flw<{ data: { link: string } }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amount / 100,
        currency: input.currency,
        redirect_url: input.redirectUrl,
        customer: {
          email: input.customer.email,
          name: input.customer.name,
          ...(input.customer.phone ? { phonenumber: input.customer.phone } : {}),
        },
        customizations: {
          title: "Dripping Honey Treats",
          description: input.description,
          logo: `${env.appUrl}/assets/icons/icon-192.png`,
        },
        meta: input.meta,
      }),
    });
    const { publicKey } = env.payments.flutterwave;
    return {
      checkoutUrl: res.data.link,
      inline: publicKey
        ? {
            provider: "flutterwave",
            publicKey,
            reference: input.reference,
            amount: input.amount / 100,
            currency: input.currency,
            customer: input.customer,
            title: "Dripping Honey Treats",
            description: input.description,
            logo: `${env.appUrl}/assets/icons/icon-192.png`,
            meta: input.meta,
          }
        : undefined,
    };
  },

  async verify(reference, hints) {
    // Prefer the transaction id (exact), fall back to our tx_ref.
    if (hints?.transactionId && /^\d+$/.test(hints.transactionId)) {
      try {
        const res = await flw<{ data: FlwTx }>(`/transactions/${hints.transactionId}/verify`);
        if (res.data.tx_ref === reference) return toResult(res.data);
      } catch {
        /* fall through to tx_ref lookup */
      }
    }
    try {
      const res = await flw<{ data: FlwTx }>(
        `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      );
      return toResult(res.data);
    } catch (err) {
      // No transaction yet (customer closed the page) → still pending.
      console.warn("[flutterwave] verify", reference, (err as Error).message);
      return { status: "pending", amountPaid: 0, currency: "NGN" };
    }
  },

  async parseWebhook(headers, rawBody) {
    const expected = env.payments.flutterwave.secretHash;
    const given = headers.get("verif-hash") ?? "";
    if (!expected || expected.length !== given.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(given))) return null;
    try {
      const body = JSON.parse(rawBody) as { data?: { id?: number; tx_ref?: string }; txRef?: string; id?: number };
      const reference = body.data?.tx_ref ?? body.txRef;
      if (!reference) return null;
      const id = body.data?.id ?? body.id;
      return { reference, hints: { transactionId: id ? String(id) : null } };
    } catch {
      return null;
    }
  },
};
