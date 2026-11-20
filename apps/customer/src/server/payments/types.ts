/**
 * Every gateway implements this interface. To add/switch a gateway:
 *   1. implement it in this folder (see flutterwave.ts)
 *   2. register it in index.ts
 *   3. set PAYMENT_PROVIDER=<name> and its secret key env vars
 * Nothing outside this folder knows which gateway is in use.
 */

export type InitializeInput = {
  reference: string;
  /** Integer kobo. */
  amount: number;
  currency: "NGN";
  customer: { email: string; name: string; phone?: string | null };
  /** Where the gateway sends the customer back to. */
  redirectUrl: string;
  description: string;
  meta: Record<string, string>;
};

export type InitializeResult = {
  /** Hosted checkout page to send the customer to (also the fallback if the popup can't load). */
  checkoutUrl: string;
  providerRef?: string;
  /** Settings for the gateway's on-page popup, when it has one. */
  inline?: InlineCheckout;
};

/** Everything the browser needs to open an on-page checkout popup. No secrets. */
export type InlineCheckout = {
  provider: string;
  publicKey: string;
  reference: string;
  /** Naira (the popup takes major units). */
  amount: number;
  currency: "NGN";
  customer: { email: string; name: string; phone?: string | null };
  title: string;
  description: string;
  logo: string;
  meta: Record<string, string>;
};

export type VerifyResult = {
  status: "success" | "failed" | "pending";
  /** Integer kobo actually paid (0 if unknown). */
  amountPaid: number;
  currency: string;
  providerTxId?: string;
  raw?: unknown;
};

/** Hints the gateway put on the redirect URL (e.g. Flutterwave's transaction_id). */
export type VerifyHints = { transactionId?: string | null };

export type WebhookResult = { reference: string; hints?: VerifyHints } | null;

export interface PaymentProvider {
  name: string;
  isConfigured(): boolean;
  /** Why it can't take payments right now (shown as-is), or null when ready. */
  configProblem?(): string | null;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  /** Always ask the gateway directly — never trust redirect query params. */
  verify(reference: string, hints?: VerifyHints): Promise<VerifyResult>;
  /** Authenticate a webhook and pull out the reference, or null if invalid. */
  parseWebhook(headers: Headers, rawBody: string): Promise<WebhookResult>;
}
