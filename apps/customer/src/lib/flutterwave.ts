"use client";

/**
 * Flutterwave Inline: opens Flutterwave's secure payment popup on our page.
 * Docs: https://developer.flutterwave.com/docs/collecting-payments/inline
 *
 * The popup only tells us what the customer did. The server always verifies
 * the transaction with Flutterwave before the order is marked as paid.
 */

const SCRIPT_URL = "https://checkout.flutterwave.com/v3.js";

/** Settings sent by our server (POST /payments/initiate → inline). No secrets. */
export type InlineCheckout = {
  provider: string;
  publicKey: string;
  /** Paystack: the server-initialized transaction the popup resumes. */
  accessCode?: string;
  reference: string;
  amount: number;
  currency: "NGN";
  customer: { email: string; name: string; phone?: string | null };
  title: string;
  description: string;
  logo: string;
  meta: Record<string, string>;
};

type FlwCallbackData = {
  status?: string; // "successful" | "completed" | "failed" | "cancelled"
  transaction_id?: number | string;
  tx_ref?: string;
};

type FlwModal = { close: () => void };

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: Record<string, unknown>) => FlwModal | void;
  }
}

let loading: Promise<void> | null = null;

/** Load Flutterwave's script once. Rejects if it's blocked (ad blocker, offline). */
export function loadFlutterwave(timeoutMs = 12_000): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.FlutterwaveCheckout) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    const timer = window.setTimeout(() => fail(new Error("Flutterwave took too long to load")), timeoutMs);
    function fail(err: Error) {
      window.clearTimeout(timer);
      script.remove();
      loading = null;
      reject(err);
    }
    script.onload = () => {
      window.clearTimeout(timer);
      if (window.FlutterwaveCheckout) resolve();
      else fail(new Error("Flutterwave script loaded without FlutterwaveCheckout"));
    };
    script.onerror = () => fail(new Error("Couldn't load Flutterwave"));
    document.head.appendChild(script);
  });
  return loading;
}

export type InlineOutcome =
  | { kind: "finished"; transactionId: string | null; status: string }
  | { kind: "closed" };

/**
 * Open the popup and resolve once the customer finishes or closes it.
 *  - "finished": Flutterwave reported a result (success or failure). The
 *    server verifies it before anything is marked paid.
 *  - "closed": they closed the popup without completing a payment.
 */
export async function payWithFlutterwave(cfg: InlineCheckout): Promise<InlineOutcome> {
  await loadFlutterwave();
  return new Promise<InlineOutcome>((resolve) => {
    let settled = false;
    const done = (o: InlineOutcome) => {
      if (settled) return;
      settled = true;
      resolve(o);
    };

    const modal = window.FlutterwaveCheckout!({
      public_key: cfg.publicKey,
      tx_ref: cfg.reference,
      amount: cfg.amount,
      currency: cfg.currency,
      payment_options: "card, banktransfer, ussd",
      meta: cfg.meta,
      customer: {
        email: cfg.customer.email,
        name: cfg.customer.name,
        ...(cfg.customer.phone ? { phone_number: cfg.customer.phone } : {}),
      },
      customizations: { title: cfg.title, description: cfg.description, logo: cfg.logo },
      // Called while the popup is still open. Closing it here doesn't trigger onclose.
      callback: (data: FlwCallbackData) => {
        done({
          kind: "finished",
          transactionId: data?.transaction_id != null ? String(data.transaction_id) : null,
          status: String(data?.status ?? "").toLowerCase(),
        });
        try {
          (modal as FlwModal | undefined)?.close();
        } catch {
          /* already closed */
        }
      },
      onclose: () => done({ kind: "closed" }),
    });
  });
}
