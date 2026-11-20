import "server-only";
import { env } from "../env";
import { HttpError } from "../http";
import { flutterwave } from "./flutterwave";
import { korapay } from "./kora";
import { paystack } from "./paystack";
import type { PaymentProvider } from "./types";

export type { PaymentProvider } from "./types";

const providers: Record<string, PaymentProvider> = {
  flutterwave,
  paystack,
  kora: korapay,
};

/** Gateway used for NEW payments (PAYMENT_PROVIDER, default flutterwave). */
export function activeProvider(): PaymentProvider {
  const p = providers[env.payments.provider];
  const problem = !p
    ? `Payment provider "${env.payments.provider}" is not supported. Use one of: ${Object.keys(providers).join(", ")}.`
    : (p.configProblem?.() ?? (p.isConfigured() ? null : `${p.name} payment keys are not set.`));
  if (problem) {
    console.error(`[payments] ${problem}`);
    throw new HttpError(503, "PAYMENTS_UNAVAILABLE", problem);
  }
  return p!;
}

/** Gateway that created an existing payment row (so switching never strands old payments). */
export function providerByName(name: string): PaymentProvider | null {
  return providers[name] ?? null;
}
