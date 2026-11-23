"use client";

/**
 * Paystack Popup (InlineJS v2): opens Paystack's secure checkout on our page.
 * Docs: https://paystack.com/docs/payments/accept-payments/#popup
 *
 * The server already initialized the transaction (amount, email, reference),
 * so the popup only resumes it with the access code — nothing about the
 * amount comes from the browser. The server always verifies with Paystack
 * before the order is marked as paid.
 */

import type { InlineCheckout, InlineOutcome } from "./flutterwave";

const SCRIPT_URL = "https://js.paystack.co/v2/inline.js";

type PaystackTransaction = { id?: number | string; reference?: string; status?: string; message?: string };

type PaystackPopInstance = {
  resumeTransaction: (
    accessCode: string,
    callbacks?: {
      onSuccess?: (tx: PaystackTransaction) => void;
      onCancel?: () => void;
      onError?: (err: { message?: string }) => void;
    },
  ) => unknown;
};

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance;
  }
}

let loading: Promise<void> | null = null;

/** Load Paystack's script once. Rejects if it's blocked (ad blocker, offline). */
export function loadPaystack(timeoutMs = 12_000): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.PaystackPop) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    const timer = window.setTimeout(() => fail(new Error("Paystack took too long to load")), timeoutMs);
    function fail(err: Error) {
      window.clearTimeout(timer);
      script.remove();
      loading = null;
      reject(err);
    }
    script.onload = () => {
      window.clearTimeout(timer);
      if (window.PaystackPop) resolve();
      else fail(new Error("Paystack script loaded without PaystackPop"));
    };
    script.onerror = () => fail(new Error("Couldn't load Paystack"));
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Open the popup and resolve once the customer finishes or closes it.
 *  - "finished": Paystack reported a successful charge. The server verifies it.
 *  - "closed": they closed the popup without paying.
 * Throws if the popup can't start, so the caller can fall back to the hosted page.
 */
export async function payWithPaystack(cfg: InlineCheckout): Promise<InlineOutcome> {
  if (!cfg.accessCode) throw new Error("Missing Paystack access code");
  await loadPaystack();
  return new Promise<InlineOutcome>((resolve, reject) => {
    let settled = false;
    const done = (o: InlineOutcome) => {
      if (settled) return;
      settled = true;
      resolve(o);
    };
    try {
      const popup = new window.PaystackPop!();
      popup.resumeTransaction(cfg.accessCode!, {
        onSuccess: (tx) =>
          done({
            kind: "finished",
            transactionId: tx?.id != null ? String(tx.id) : null,
            status: String(tx?.status ?? "success").toLowerCase(),
          }),
        onCancel: () => done({ kind: "closed" }),
        onError: (err) => {
          if (settled) return;
          settled = true;
          reject(new Error(err?.message || "Paystack popup failed"));
        },
      });
    } catch (e) {
      settled = true;
      reject(e instanceof Error ? e : new Error("Paystack popup failed"));
    }
  });
}
