import "server-only";
import type { Order } from "@dht/types";
import { absUrl, camel, db, maybe, must } from "../db";
import { BUSINESS_WHATSAPP, cleanWhatsapp } from "@/lib/format";
import { badRequest, forbidden, notFound } from "../http";
import type { DbUser } from "../session";

export const DRAFT_STATUSES = ["draft", "pending_payment"];
export const ONGOING_STATUSES = ["placed", "seen", "accepted", "preparing", "ready_for_delivery", "out_for_delivery"];
export const COMPLETED_STATUSES = ["delivered", "completed"];
export const CANCELLED_STATUSES = ["cancelled", "payment_failed"];

type Row = Record<string, unknown>;

export type OrderRow = Order & {
  userId: string;
  promoCode?: string | null;
  paidAt?: string | null;
  fulfillment: "delivery" | "pickup";
  deliveryFeeAgreed: boolean;
};

export function mapOrder(row: Row, items: Row[], logs: Row[]): OrderRow {
  const o = camel<OrderRow>(row);
  return {
    ...o,
    items: items.map((i) => {
      const it = camel<Order["items"][number] & { image?: string | null }>(i);
      return {
        ...it,
        item: it.image
          ? ({ id: it.itemId, images: [absUrl(it.image)], name: it.nameSnapshot } as unknown as Order["items"][number]["item"])
          : undefined,
      };
    }),
    statusLogs: logs.map((l) => camel<{ status: string; createdAt: string; note?: string | null }>(l)),
  };
}

/** Load full orders (items + logs) for a set of order rows. */
export async function hydrateOrders(rows: Row[]): Promise<OrderRow[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id as string);
  const [items, logs] = await Promise.all([
    db().from("order_items").select("*").in("order_id", ids).order("created_at"),
    db().from("order_status_logs").select("*").in("order_id", ids).order("created_at"),
  ]);
  const itemRows = must(items, "order items") as Row[];
  const logRows = must(logs, "order logs") as Row[];
  return rows.map((r) =>
    mapOrder(
      r,
      itemRows.filter((i) => i.order_id === r.id),
      logRows.filter((l) => l.order_id === r.id),
    ),
  );
}

export async function getOrder(id: string): Promise<OrderRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Order not found.");
  const row = maybe(await db().from("orders").select("*").eq("id", id).maybeSingle(), "get order");
  if (!row) throw notFound("Order not found.");
  const [o] = await hydrateOrders([row]);
  return o;
}

export async function getOwnOrder(id: string, user: DbUser): Promise<OrderRow> {
  const o = await getOrder(id);
  if (o.userId !== user.id) throw notFound("Order not found.");
  return o;
}

export async function getSettings() {
  const row = maybe(await db().from("settings").select("*").eq("id", 1).maybeSingle(), "settings");
  return {
    pauseOrders: Boolean(row?.pause_orders),
    // Admin-set number wins; placeholders are ignored in favour of NEXT_PUBLIC_WHATSAPP.
    whatsappNumber: cleanWhatsapp(row?.whatsapp_number as string | null) ?? BUSINESS_WHATSAPP,
    pickupEnabled: row?.pickup_enabled !== false,
    pickupAddress: (row?.pickup_address as string | null) ?? null,
    pickupHours: (row?.pickup_hours as string | null) ?? null,
  };
}

async function promoDiscount(code: string | null | undefined, subtotal: number): Promise<{ discount: number; valid: boolean }> {
  if (!code) return { discount: 0, valid: false };
  const p = maybe(
    await db().from("promos").select("*").eq("code", code.toUpperCase()).eq("active", true).maybeSingle(),
    "promo",
  );
  if (!p) return { discount: 0, valid: false };
  if (p.expires_at && new Date(p.expires_at as string) < new Date()) return { discount: 0, valid: false };
  if (p.usage_limit != null && (p.used_count as number) >= (p.usage_limit as number)) return { discount: 0, valid: false };
  if (p.min_order != null && subtotal < (p.min_order as number)) return { discount: 0, valid: false };
  const d = p.type === "percent" ? Math.round((subtotal * (p.value as number)) / 100) : (p.value as number);
  return { discount: Math.min(d, subtotal), valid: true };
}

/** Recompute subtotal / delivery / discount / total from the DB. */
export async function recalc(orderId: string): Promise<OrderRow> {
  const order = await getOrder(orderId);
  const subtotal = order.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  // Delivery is paid to the rider on arrival — never charged online.
  const deliveryFee = 0;
  const { discount } = await promoDiscount(order.promoCode, subtotal);
  const total = Math.max(0, subtotal + deliveryFee - discount);
  must(
    await db()
      .from("orders")
      .update({ subtotal, delivery_fee: deliveryFee, discount, total, updated_at: new Date().toISOString() })
      .eq("id", orderId),
    "recalc",
  );
  return { ...order, subtotal, deliveryFee, discount, total };
}

export async function applyPromo(order: OrderRow, code: string): Promise<OrderRow> {
  const subtotal = order.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const { valid } = await promoDiscount(code, subtotal);
  if (!valid) throw badRequest("That promo code is not valid.");
  must(await db().from("orders").update({ promo_code: code.toUpperCase() }).eq("id", order.id), "apply promo");
  return recalc(order.id);
}

/** The user's open cart order, created on demand. */
export async function getOrCreateDraft(user: DbUser): Promise<string> {
  const existing = maybe(
    await db()
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .in("status", DRAFT_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "find draft",
  );
  if (existing) return existing.id as string;
  const created = must(
    await db().from("orders").insert({ user_id: user.id, status: "draft" }).select("id").single(),
    "create draft",
  );
  return created.id as string;
}

/** Editing an order that was sent to the gateway puts it back in draft. */
export async function ensureEditable(order: OrderRow) {
  if (!DRAFT_STATUSES.includes(order.status)) throw forbidden("This order can no longer be changed.");
  if (order.status === "pending_payment") {
    must(await db().from("orders").update({ status: "draft" }).eq("id", order.id), "reset to draft");
  }
}

type CatalogueRow = {
  id: string;
  name: string;
  base_price: number;
  status: string;
  max_qty: number;
  active: boolean;
  images: string[];
  variants: { id: string; name: string; price: number }[];
};

/**
 * Change a line's size/option (and qty). Price and name come from the DB.
 * If the order already has a line for the new size, the two are merged.
 */
export async function changeLineVariant(
  orderId: string,
  line: { id: string; itemId: string },
  next: { variantId: string | null; qty: number; note?: string | null },
) {
  const item = maybe(await db().from("items").select("*").eq("id", line.itemId).maybeSingle(), "load item") as CatalogueRow | null;
  if (!item || !item.active) throw badRequest("That item is no longer on the menu.");
  if (item.status === "sold_out") throw badRequest(`${item.name} is sold out right now.`);

  let unitPrice = item.base_price;
  let name = item.name;
  let variantId: string | null = null;
  if (item.variants?.length) {
    const v = item.variants.find((x) => x.id === next.variantId);
    if (!v) throw badRequest("Please pick a size for this item.");
    unitPrice = v.price;
    name = `${item.name} · ${v.name}`;
    variantId = v.id;
  }
  const max = item.max_qty || 50;

  const base = db().from("order_items").select("id, qty").eq("order_id", orderId).eq("item_id", item.id).neq("id", line.id);
  const twin = maybe(await (variantId === null ? base.is("variant_id", null) : base.eq("variant_id", variantId)).maybeSingle(), "find twin");

  if (twin) {
    must(
      await db().from("order_items").update({ qty: Math.min(max, (twin.qty as number) + next.qty), unit_price: unitPrice }).eq("id", twin.id),
      "merge line",
    );
    must(await db().from("order_items").delete().eq("id", line.id), "remove old line");
  } else {
    const patch: Record<string, unknown> = { variant_id: variantId, name_snapshot: name, unit_price: unitPrice, qty: Math.min(max, next.qty) };
    if (next.note !== undefined) patch.note = next.note;
    must(await db().from("order_items").update(patch).eq("id", line.id), "change line");
  }
}

/** Add (or increment) a line — price always comes from the DB, never the client. */
export async function addLine(
  orderId: string,
  line: { itemId: string; variantId?: string | null; qty: number; note?: string | null },
) {
  const item = maybe(
    await db().from("items").select("*").eq("id", line.itemId).maybeSingle(),
    "load item",
  ) as CatalogueRow | null;
  if (!item || !item.active) throw badRequest("That item is no longer on the menu.");
  if (item.status === "sold_out") throw badRequest(`${item.name} is sold out right now.`);

  let unitPrice = item.base_price;
  let name = item.name;
  let variantId: string | null = null;
  if (item.variants?.length) {
    const v = item.variants.find((x) => x.id === line.variantId) ?? (line.variantId ? null : item.variants[0]);
    if (!v) throw badRequest("Please pick a size for this item.");
    unitPrice = v.price;
    name = `${item.name} · ${v.name}`;
    variantId = v.id;
  }

  const base = db().from("order_items").select("id, qty").eq("order_id", orderId).eq("item_id", item.id);
  const existing = maybe(
    await (variantId === null ? base.is("variant_id", null) : base.eq("variant_id", variantId)).maybeSingle(),
    "find line",
  );

  const max = item.max_qty || 50;
  if (existing) {
    const qty = Math.min(max, (existing.qty as number) + line.qty);
    must(await db().from("order_items").update({ qty, unit_price: unitPrice }).eq("id", existing.id), "inc line");
  } else {
    must(
      await db().from("order_items").insert({
        order_id: orderId,
        item_id: item.id,
        variant_id: variantId,
        name_snapshot: name,
        unit_price: unitPrice,
        qty: Math.min(max, line.qty),
        note: line.note ?? null,
        image: item.images?.[0] ?? null,
      }),
      "add line",
    );
  }
}

export async function logStatus(orderId: string, status: string, note?: string | null) {
  must(await db().from("order_status_logs").insert({ order_id: orderId, status, note: note ?? null }), "log status");
}
