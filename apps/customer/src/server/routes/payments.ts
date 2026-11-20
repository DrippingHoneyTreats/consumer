import "server-only";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { camel, db, maybe, must } from "../db";
import { env } from "../env";
import { badRequest, notFound, optStr, str } from "../http";
import { notifyOrderPlaced, notifyPaymentIssue } from "../notify";
import { activeProvider, providerByName } from "../payments";
import type { VerifyHints } from "../payments/types";
import { route } from "../router";
import { requireUser, type DbUser } from "../session";
import { DRAFT_STATUSES, getOrder, getOwnOrder, getSettings, logStatus, recalc } from "../services/orders";

type PaymentRow = {
  id: string;
  orderId: string;
  userId: string;
  provider: string;
  reference: string;
  amount: number;
  status: "pending" | "success" | "failed";
  createdAt: string;
};

async function loadPayment(reference: string): Promise<PaymentRow | null> {
  const row = maybe(await db().from("payments").select("*").eq("reference", reference).maybeSingle(), "payment");
  return row ? camel<PaymentRow>(row) : null;
}

async function loadUser(id: string): Promise<DbUser> {
  return camel<DbUser>(must(await db().from("users").select("*").eq("id", id).single(), "payment user"));
}

/**
 * Ask the gateway what happened and move the order forward. Safe to call
 * any number of times (redirect, polling and webhook all race here).
 */
async function settle(
  reference: string,
  hints: VerifyHints & { gatewaySaysCancelled?: boolean } = {},
): Promise<{ status: string; orderId?: string }> {
  const payment = await loadPayment(reference);
  if (!payment) throw notFound("Payment not found.");
  if (payment.status === "success") return { status: "success", orderId: payment.orderId };

  const provider = providerByName(payment.provider);
  if (!provider) return { status: payment.status, orderId: payment.orderId };
  const result = await provider.verify(reference, hints);

  if (result.status === "pending" && !hints.gatewaySaysCancelled) {
    return { status: payment.status, orderId: payment.orderId };
  }

  if (result.status !== "success") {
    // Only flip pending → failed; a later webhook can still upgrade to success.
    await db()
      .from("payments")
      .update({ status: "failed", raw: result.raw ?? null, updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending");
    await db().from("orders").update({ status: "draft" }).eq("id", payment.orderId).eq("status", "pending_payment");
    return { status: "failed", orderId: payment.orderId };
  }

  if (result.currency !== "NGN" || result.amountPaid < payment.amount) {
    console.error("[payments] amount/currency mismatch", reference, result);
    await db()
      .from("payments")
      .update({ status: "failed", raw: result.raw ?? null, updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .neq("status", "success");
    const message = `Gateway reported ${result.currency} ${result.amountPaid / 100} for ${reference}, which is less than expected.`;
    await logStatus(payment.orderId, "payment_review", message);
    const o = await getOrder(payment.orderId);
    await notifyPaymentIssue({ orderNo: o.orderNo, reference, message });
    return { status: "failed", orderId: payment.orderId };
  }

  // Claim the success transition exactly once.
  const claimed = must(
    await db()
      .from("payments")
      .update({
        status: "success",
        provider_tx_id: result.providerTxId ?? null,
        raw: result.raw ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .neq("status", "success")
      .select("id"),
    "claim payment",
  ) as unknown[];
  if (!claimed.length) return { status: "success", orderId: payment.orderId };

  const order = await getOrder(payment.orderId);
  if (result.amountPaid < order.total) {
    // Cart changed after the payment link was created.
    const message = `Paid ₦${result.amountPaid / 100} but the order total is now ₦${order.total / 100} (cart changed after checkout).`;
    await logStatus(order.id, "payment_review", message);
    await notifyPaymentIssue({ orderNo: order.orderNo, reference, message });
    return { status: "success", orderId: order.id };
  }

  const placed = must(
    await db()
      .from("orders")
      .update({ status: "placed", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .in("status", DRAFT_STATUSES)
      .select("id"),
    "place order",
  ) as unknown[];

  if (placed.length) {
    await logStatus(order.id, "placed", `Paid via ${payment.provider} (${reference})`);
    if (order.promoCode) {
      const promo = maybe(await db().from("promos").select("id, used_count").eq("code", order.promoCode).maybeSingle(), "promo");
      if (promo) await db().from("promos").update({ used_count: (promo.used_count as number) + 1 }).eq("id", promo.id);
    }
    const customer = await loadUser(order.userId);
    const phone = customer.phone ?? (order.addressSnapshot?.contactPhone as string | undefined) ?? null;
    await notifyOrderPlaced({ ...order, status: "placed" }, { ...customer, phone });
  }
  return { status: "success", orderId: order.id };
}

route("POST", "/payments/initiate", async ({ req, body }) => {
  const user = await requireUser(req);
  const order = await getOwnOrder(str(body.orderId, "Order"), user);
  if (!DRAFT_STATUSES.includes(order.status)) throw badRequest("This order has already been paid.");
  if (!order.items.length) throw badRequest("Your order is empty.");
  if (!order.addressSnapshot) throw badRequest("Choose pickup or delivery first.");
  if (order.fulfillment === "delivery" && !order.deliveryFeeAgreed) {
    throw badRequest("Please agree to pay the delivery fee to the rider on arrival.");
  }
  const settings = await getSettings();
  if (settings.pauseOrders) throw badRequest("We're not taking new orders right now. Please check back soon.");

  // Re-check stock before taking money.
  const itemIds = [...new Set(order.items.map((i) => i.itemId))];
  const stock = must(await db().from("items").select("id, name, status, active").in("id", itemIds), "stock") as {
    id: string;
    name: string;
    status: string;
    active: boolean;
  }[];
  const unavailable = stock.filter((s) => !s.active || s.status === "sold_out");
  if (unavailable.length) {
    throw badRequest(`${unavailable.map((s) => s.name).join(", ")} just sold out — please remove it to continue.`);
  }

  const fresh = await recalc(order.id);
  if (fresh.total <= 0) throw badRequest("Order total must be more than zero.");

  const provider = activeProvider();
  const reference = `${fresh.orderNo}-${randomBytes(4).toString("hex").toUpperCase()}`;
  must(
    await db().from("payments").insert({
      order_id: fresh.id,
      user_id: user.id,
      provider: provider.name,
      reference,
      amount: fresh.total,
      currency: "NGN",
    }),
    "create payment",
  );

  const email = user.email ?? `customer-${user.id.slice(0, 8)}@${env.payments.fallbackEmailDomain}`;
  const phone = user.phone ?? (fresh.addressSnapshot?.contactPhone as string | undefined) ?? null;
  const init = await provider
    .initialize({
      reference,
      amount: fresh.total,
      currency: "NGN",
      customer: { email, name: user.fullName || "Customer", phone },
      redirectUrl: `${env.appUrl}/payment/callback?reference=${encodeURIComponent(reference)}`,
      description: `Order ${fresh.orderNo}`,
      meta: { orderId: fresh.id, orderNo: fresh.orderNo, userId: user.id },
    })
    .catch(async (err: Error) => {
      console.error("[payments] initialize failed", err.message);
      await db().from("payments").update({ status: "failed" }).eq("reference", reference);
      // Pass the gateway's own reason through.
      throw badRequest(err.message?.trim() || "Cannot proceed with payment, try again.");
    });

  must(
    await db().from("orders").update({ status: "pending_payment" }).eq("id", fresh.id).in("status", DRAFT_STATUSES),
    "pending payment",
  );
  return { authorizationUrl: init.checkoutUrl, reference, provider: provider.name, inline: init.inline ?? null };
});

route("POST", "/payments/verify", async ({ req, body }) => {
  const user = await requireUser(req);
  const reference = str(body.reference, "Reference", { max: 80 });
  const payment = await loadPayment(reference);
  if (!payment || payment.userId !== user.id) throw notFound("Payment not found.");
  return settle(reference, {
    transactionId: optStr(body.transactionId, 40) ?? null,
    gatewaySaysCancelled: body.gatewayStatus === "cancelled",
  });
});

route("GET", "/payments/:reference/status", async ({ req, params }) => {
  const user = await requireUser(req);
  const payment = await loadPayment(params.reference);
  if (!payment || payment.userId !== user.id) throw notFound("Payment not found.");
  if (payment.status !== "pending") return { status: payment.status, orderId: payment.orderId };
  return settle(payment.reference);
});

/** Gateway → us. Configure in each dashboard: {APP_URL}/api/v1/payments/webhook/{provider} */
route("POST", "/payments/webhook/:provider", async ({ req, params, raw }) => {
  const provider = providerByName(params.provider);
  if (!provider) return NextResponse.json({ ok: false }, { status: 404 });
  const parsed = await provider.parseWebhook(req.headers, raw);
  if (!parsed) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    await settle(parsed.reference, parsed.hints);
  } catch (err) {
    console.error("[payments] webhook settle failed", parsed.reference, err);
  }
  // Always 200 once authenticated, so the gateway stops retrying.
  return NextResponse.json({ ok: true });
});
