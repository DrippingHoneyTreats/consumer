import "server-only";
import { camel, db, maybe, must } from "../db";
import { HttpError, badRequest, int, notFound, optStr, str } from "../http";
import { NextResponse } from "next/server";
import { autocomplete, isOsmPlace, lagosFromText, mapsEnabled, osmAutocomplete, osmDetails, placeDetails, staticMap } from "../places";
import { isPhone, normalizePhone } from "../contact";
import { route } from "../router";
import { requireUser } from "../session";
import {
  CANCELLED_STATUSES,
  COMPLETED_STATUSES,
  DRAFT_STATUSES,
  ONGOING_STATUSES,
  addLine,
  applyPromo,
  changeLineVariant,
  ensureEditable,
  getOrCreateDraft,
  getOwnOrder,
  getSettings,
  hydrateOrders,
  recalc,
} from "../services/orders";

type Row = Record<string, unknown>;

const notInLagos = (state: string | null) =>
  new HttpError(
    422,
    "NOT_IN_LAGOS",
    `Sorry, we don't deliver to ${state ? state.replace(/ State$/i, "") : "that area"} yet. We only deliver within Lagos for now. You can choose pickup instead.`,
  );

/** Insert/update an address; if the new state/place_id columns don't exist yet, retry without them. */
async function saveAddress(fields: Record<string, unknown>, id?: string) {
  const run = (f: Record<string, unknown>) =>
    id ? db().from("addresses").update(f).eq("id", id).select("*").single() : db().from("addresses").insert(f).select("*").single();
  let res = await run(fields);
  if (res.error && /state|place_id/.test(res.error.message) && ["PGRST204", "42703"].includes(res.error.code ?? "")) {
    const { state: _s, place_id: _p, ...rest } = fields;
    void _s;
    void _p;
    res = await run(rest);
  }
  return must(res, "save address");
}

// ───────────────────────── Orders ─────────────────────────

route("GET", "/orders", async ({ req, query }) => {
  const user = await requireUser(req);
  const tab = query.get("tab");
  const limit = Math.min(Number(query.get("limit")) || 50, 100);
  const statuses =
    tab === "ongoing"
      ? [...DRAFT_STATUSES, ...ONGOING_STATUSES]
      : tab === "completed"
        ? COMPLETED_STATUSES
        : tab === "cancelled"
          ? CANCELLED_STATUSES
          : null;
  let q = db().from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
  if (statuses) q = q.in("status", statuses);
  const rows = must(await q, "list orders") as Row[];
  // Hide empty drafts from the list.
  const orders = (await hydrateOrders(rows)).filter((o) => o.items.length > 0 || !DRAFT_STATUSES.includes(o.status));
  return { data: orders };
});

route("POST", "/orders/draft/items", async ({ req, body }) => {
  const user = await requireUser(req);
  const settings = await getSettings();
  if (settings.pauseOrders) throw badRequest("We're not taking new orders right now. Please check back soon.");
  const orderId = await getOrCreateDraft(user);
  const order = await getOwnOrder(orderId, user);
  await ensureEditable(order);
  await addLine(orderId, {
    itemId: str(body.itemId, "Item"),
    variantId: optStr(body.variantId, 80) ?? null,
    qty: int(body.qty ?? 1, "Quantity", { min: 1, max: 100 }),
    note: optStr(body.note, 300) ?? null,
  });
  return recalc(orderId);
});

route("POST", "/auth/cart/merge", async ({ req, body }) => {
  const user = await requireUser(req);
  const items = Array.isArray(body.items) ? (body.items as Row[]).slice(0, 50) : [];
  if (!items.length) return { ok: true };
  const orderId = await getOrCreateDraft(user);
  await ensureEditable(await getOwnOrder(orderId, user));
  for (const i of items) {
    try {
      await addLine(orderId, {
        itemId: String(i.itemId ?? ""),
        variantId: typeof i.variantId === "string" ? i.variantId : null,
        qty: Math.max(1, Math.min(100, Number(i.qty) || 1)),
        note: typeof i.note === "string" ? i.note.slice(0, 300) : null,
      });
    } catch {
      /* skip items that were removed / sold out since they were added */
    }
  }
  return recalc(orderId);
});

route("GET", "/orders/:id", async ({ req, params }) => getOwnOrder(params.id, await requireUser(req)));

route("PATCH", "/orders/:id", async ({ req, params, body }) => {
  const user = await requireUser(req);
  const order = await getOwnOrder(params.id, user);
  if (!DRAFT_STATUSES.includes(order.status)) throw badRequest("This order can no longer be changed.");
  const notes = body.notes === null ? null : (optStr(body.notes, 500) ?? null);
  must(await db().from("orders").update({ notes }).eq("id", order.id), "update notes");
  return { ...order, notes };
});

route("PATCH", "/orders/:id/items/:itemId", async ({ req, params, body }) => {
  const user = await requireUser(req);
  const order = await getOwnOrder(params.id, user);
  await ensureEditable(order);
  const line = order.items.find((i) => i.id === params.itemId);
  if (!line) throw notFound("That item is not in your order.");
  const qty = int(body.qty, "Quantity", { min: 0, max: 100 });
  if (qty === 0) {
    must(await db().from("order_items").delete().eq("id", line.id), "remove line");
  } else if (body.variantId !== undefined && (body.variantId ?? null) !== (line.variantId ?? null)) {
    // Size/option changed (e.g. small jar → big jar).
    await changeLineVariant(order.id, line, { variantId: optStr(body.variantId, 80) ?? null, qty });
  } else {
    must(await db().from("order_items").update({ qty }).eq("id", line.id), "update qty");
  }
  return recalc(order.id);
});

route("DELETE", "/orders/:id/items/:itemId", async ({ req, params }) => {
  const user = await requireUser(req);
  const order = await getOwnOrder(params.id, user);
  await ensureEditable(order);
  must(await db().from("order_items").delete().eq("id", params.itemId).eq("order_id", order.id), "remove line");
  return recalc(order.id);
});

route("POST", "/orders/:id/address", async ({ req, params, body }) => {
  const user = await requireUser(req);
  const order = await getOwnOrder(params.id, user);
  await ensureEditable(order);

  const fulfillment = body.fulfillment === "pickup" ? "pickup" : "delivery";
  const contactPhoneRaw = optStr(body.contactPhone, 30);
  if (contactPhoneRaw && !isPhone(contactPhoneRaw)) throw badRequest("Enter a valid WhatsApp number.");
  const contactPhone = contactPhoneRaw ? normalizePhone(contactPhoneRaw) : (user.phone ?? null);

  let snapshot: Record<string, unknown>;
  if (fulfillment === "pickup") {
    const settings = await getSettings();
    if (!settings.pickupEnabled) throw badRequest("Pickup isn't available right now — please choose delivery.");
    if (!contactPhone) throw badRequest("Add your WhatsApp number so we can tell you when it's ready.");
    snapshot = {
      pickup: true,
      formattedAddress: settings.pickupAddress ? `Pickup · ${settings.pickupAddress}` : "Pickup",
      contactPhone,
    };
  } else {
    if (body.agreeDeliveryFee !== true) {
      throw badRequest("Please tick the box to agree to pay the delivery fee to the rider on arrival.");
    }
    if (typeof body.addressId === "string") {
      const a = maybe(
        await db().from("addresses").select("*").eq("id", body.addressId).eq("user_id", user.id).maybeSingle(),
        "address",
      );
      if (!a) throw notFound("Address not found.");
      const check = a.state ? { inLagos: /lagos/i.test(a.state), state: a.state } : lagosFromText(a.formatted_address);
      if (check.inLagos === false) throw notInLagos(check.state);
      snapshot = camel(a);
      if (!snapshot.contactPhone && contactPhone) snapshot.contactPhone = contactPhone;
    } else {
      // Google-picked address: resolve it on the server (never trust the client's text/coords).
      let formattedAddress: string;
      let lat = 0;
      let lng = 0;
      let state: string | null = null;
      let placeId: string | null = null;
      if (typeof body.placeId === "string" && isOsmPlace(body.placeId)) {
        const d = osmDetails(body.placeId);
        if (!d) throw badRequest("We couldn't confirm that address. Please pick it again from the list.");
        if (!d.inLagos) throw notInLagos(d.state);
        formattedAddress = d.formattedAddress;
        ({ lat, lng, state } = d);
        placeId = null;
      } else if (typeof body.placeId === "string" && body.placeId && mapsEnabled()) {
        const d = await placeDetails(body.placeId, optStr(body.sessionToken, 100)).catch((e: Error) => {
          console.warn("[places] details failed", e.message);
          throw badRequest("We couldn't confirm that address. Please pick it again from the list.");
        });
        if (!d.inLagos) throw notInLagos(d.state);
        formattedAddress = d.formattedAddress;
        ({ lat, lng, state, placeId } = d);
      } else {
        formattedAddress = str(body.formattedAddress, "Address", { min: 5, max: 300 });
        const check = lagosFromText(formattedAddress);
        if (check.inLagos === false) throw notInLagos(check.state);
        state = check.state;
      }
      const fields: Record<string, unknown> = {
        user_id: user.id,
        label: optStr(body.label, 40) ?? "Home",
        formatted_address: formattedAddress,
        lat,
        lng,
        landmark: optStr(body.landmark, 200) ?? null,
        note: optStr(body.note, 300) ?? null,
        contact_phone: contactPhone,
        state,
        place_id: placeId,
      };
      if (body.saveAddress === true) {
        // Customer ticked "Save this address for next time".
        const existing = maybe(
          await db()
            .from("addresses")
            .select("*")
            .eq("user_id", user.id)
            .eq("formatted_address", formattedAddress)
            .limit(1)
            .maybeSingle(),
          "find address",
        );
        const saved = await saveAddress(fields, existing?.id as string | undefined);
        snapshot = camel(saved);
      } else {
        // Used for this order only: kept on the order, not in their saved addresses.
        const { user_id: _u, ...forOrder } = fields;
        void _u;
        snapshot = camel(forOrder);
      }
    }
  }

  // Phone-less accounts (e.g. Google sign-in): keep the number for WhatsApp updates.
  if (!user.phone && contactPhone) {
    const { error } = await db().from("users").update({ phone: contactPhone }).eq("id", user.id);
    if (error) console.warn("[orders] could not save phone to profile", error.message);
  }

  must(
    await db()
      .from("orders")
      .update({
        address_snapshot: snapshot,
        fulfillment,
        delivery_fee_agreed: fulfillment === "delivery",
      })
      .eq("id", order.id),
    "set fulfillment",
  );
  return recalc(order.id);
});

route("POST", "/orders/:id/promo", async ({ req, params, body }) => {
  const user = await requireUser(req);
  const order = await getOwnOrder(params.id, user);
  await ensureEditable(order);
  return applyPromo(order, str(body.code, "Promo code", { max: 40 }));
});

route("POST", "/orders/:id/reorder", async ({ req, params }) => {
  const user = await requireUser(req);
  const old = await getOwnOrder(params.id, user);
  const draftId = await getOrCreateDraft(user);
  await ensureEditable(await getOwnOrder(draftId, user));
  let added = 0;
  for (const line of old.items) {
    try {
      await addLine(draftId, { itemId: line.itemId, variantId: line.variantId ?? null, qty: line.qty, note: line.note });
      added++;
    } catch {
      /* sold out / removed */
    }
  }
  if (!added) throw badRequest("None of those items are available right now.");
  return recalc(draftId);
});

// ───────────────────────── Addresses & delivery ─────────────────────────

route("GET", "/me/addresses", async ({ req }) => {
  const user = await requireUser(req);
  const rows = must(
    await db().from("addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    "addresses",
  ) as Row[];
  return { data: rows.map((r) => camel(r)) };
});

route("DELETE", "/me/addresses/:id", async ({ req, params }) => {
  const user = await requireUser(req);
  must(await db().from("addresses").delete().eq("id", params.id).eq("user_id", user.id), "delete address");
  return { ok: true };
});

/**
 * Address search. With GOOGLE_MAPS_API_KEY: real Google Places suggestions
 * (Nigeria, biased to Lagos). Without it: echo what the customer typed.
 */
route("GET", "/places/autocomplete", async ({ req, query }) => {
  await requireUser(req); // protects the Google quota
  const q = (query.get("q") ?? "").trim().slice(0, 200);
  if (q.length < 3) return { data: [], google: mapsEnabled() };
  const description = /lagos|ibadan/i.test(q) ? q : `${q}, Lagos`;
  // Always offer "use what I typed": not every estate or close is on the map.
  const typed = { placeId: `typed:${description}`, description, mainText: `Use “${description}”`, secondaryText: "Exactly as you typed it" };
  if (mapsEnabled()) {
    try {
      return { data: [...(await autocomplete(q, query.get("session") ?? undefined)), typed], google: true };
    } catch (e) {
      console.warn("[places] autocomplete failed", (e as Error).message);
    }
  }
  try {
    return { data: [...(await osmAutocomplete(q)), typed], google: false };
  } catch (e) {
    console.warn("[places] osm search failed", (e as Error).message);
  }
  return { data: [typed], google: false };
});

/** Full address + coordinates + whether it's in Lagos, for the picked suggestion. */
route("GET", "/places/details", async ({ req, query }) => {
  await requireUser(req);
  const placeId = query.get("placeId") ?? "";
  if (!placeId || placeId.startsWith("typed:")) {
    const text = placeId.replace(/^typed:/, "");
    const check = lagosFromText(text);
    return { placeId: null, provider: "typed", formattedAddress: text, lat: 0, lng: 0, state: check.state, inLagos: check.inLagos !== false };
  }
  if (isOsmPlace(placeId)) {
    const d = osmDetails(placeId);
    if (!d) throw badRequest("We couldn't load that address. Please pick it again.");
    return d;
  }
  if (!mapsEnabled()) throw badRequest("Address lookup isn't available right now.");
  try {
    return await placeDetails(placeId, query.get("session") ?? undefined);
  } catch (e) {
    console.warn("[places] details failed", (e as Error).message);
    throw badRequest("We couldn't load that address. Please try again.");
  }
});

/** Small map preview image for a picked address (proxied so the key stays secret). */
route("GET", "/places/map", async ({ req, query }) => {
  await requireUser(req);
  const lat = Number(query.get("lat"));
  const lng = Number(query.get("lng"));
  if (!mapsEnabled() || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) throw notFound("No map.");
  const res = await staticMap(lat, lng);
  if (!res.ok) throw notFound("No map.");
  return new NextResponse(res.body, {
    headers: { "Content-Type": res.headers.get("content-type") ?? "image/png", "Cache-Control": "public, max-age=86400" },
  });
});

/** What the checkout screen needs to offer pickup vs delivery. */
route("GET", "/checkout/options", async () => {
  const settings = await getSettings();
  return {
    pickup: {
      enabled: settings.pickupEnabled,
      address: settings.pickupAddress,
      hours: settings.pickupHours,
    },
    delivery: { enabled: true, feePaidOnArrival: true },
  };
});

/** Kept for API compatibility: the delivery fee is paid to the rider, never online. */
route("POST", "/delivery/quote", async () => ({ fee: 0, payOnArrival: true }));
