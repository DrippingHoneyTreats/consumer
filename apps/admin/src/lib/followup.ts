import { formatNgn } from "./format";

export type FollowUpOrder = {
  orderNo: string;
  total: number;
  status: string;
  stage?: "cart" | "checkout" | "payment";
  addressSnapshot?: unknown;
  items: { nameSnapshot: string; qty: number }[];
  user?: { fullName?: string | null } | null;
};

/** Where an unpaid order stopped: cart → checkout (delivery chosen) → payment. */
export function stageOf(o: FollowUpOrder & { paymentTries?: number }): "cart" | "checkout" | "payment" {
  if (o.stage) return o.stage;
  if ((o.paymentTries ?? 0) > 0 || o.status === "pending_payment") return "payment";
  return o.addressSnapshot ? "checkout" : "cart";
}

export const STAGE_LABEL = {
  cart: { label: "In cart", hint: "Added items, didn't start checkout", tone: "bg-sage-soft text-deep" },
  checkout: { label: "At checkout", hint: "Chose delivery/pickup, didn't pay", tone: "bg-honey-soft text-deep" },
  payment: { label: "Payment stopped", hint: "Opened payment but didn't finish", tone: "bg-[#fdecea] text-[#7a1a12]" },
} as const;

function itemsLine(o: FollowUpOrder) {
  const names = o.items.map((i) => `${i.nameSnapshot}${i.qty > 1 ? ` ×${i.qty}` : ""}`);
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} and ${names.length - 2} more` : names.join(" and ");
}

/** Friendly, non-pushy follow-up message, tuned to where they stopped. */
export function followUpMessage(o: FollowUpOrder & { paymentTries?: number }) {
  const first = o.user?.fullName?.trim().split(/\s+/)[0] || "there";
  const hi = `Hi ${first}, this is Dripping Honey Treats 👋`;
  const items = itemsLine(o);
  const stage = stageOf(o);
  const body =
    stage === "payment"
      ? `We noticed your payment for ${items} (${formatNgn(o.total)}) didn't go through. Did something go wrong? We're happy to help you complete it, or you can pay by transfer.`
      : stage === "checkout"
        ? `You were almost done with your order of ${items} (${formatNgn(o.total)}). Was there anything stopping you? We can help with delivery, sizes or anything else.`
        : `You left ${items} in your order. Would you like us to help you finish it, or answer any questions?`;
  return { text: `${hi}\n\n${body}`, subject: `Your Dripping Honey Treats order ${o.orderNo}` };
}
