import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { camel, db, maybe, must, snake } from "../db";
import { env } from "../env";
import { badRequest, forbidden, int, notFound, optStr, str } from "../http";
import { isEmail } from "../contact";
import { announceProduct, notifyEventUpdated, notifyOrderStatus, notifyStaffInvite } from "../notify";
import { route } from "../router";
import { publicUser, requireStaff, signToken, type DbUser } from "../session";
import { getOrder, getSettings, hydrateOrders, logStatus, type OrderRow } from "../services/orders";
import { mapBanner, mapCategory, mapItem } from "./catalogue";
import { mapEvent } from "./events";

type Row = Record<string, unknown>;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

function page(query: URLSearchParams) {
  const limit = Math.min(Math.max(Number(query.get("limit")) || 50, 1), 200);
  const p = Math.max(Number(query.get("page")) || 1, 1);
  return { limit, page: p, from: (p - 1) * limit, to: p * limit - 1 };
}

async function withUsers(orders: OrderRow[]) {
  const ids = [...new Set(orders.map((o) => o.userId))];
  if (!ids.length) return [];
  const users = must(await db().from("users").select("id, full_name, phone, email").in("id", ids), "order users") as Row[];
  const byId = new Map(users.map((u) => [u.id as string, u]));
  return orders.map((o) => {
    const u = byId.get(o.userId);
    return {
      ...o,
      user: u
        ? {
            id: u.id,
            fullName: u.full_name,
            phone: u.phone ?? (o.addressSnapshot?.contactPhone as string | undefined) ?? null,
            email: u.email,
          }
        : undefined,
    };
  });
}

// ───────────────────────── Catalogue ─────────────────────────

route("GET", "/admin/categories", async ({ req }) => {
  await requireStaff(req);
  const rows = must(await db().from("categories").select("*").order("sort").order("name"), "admin categories") as Row[];
  return { data: rows.map(mapCategory) };
});

route("POST", "/admin/categories", async ({ req, body }) => {
  await requireStaff(req);
  const name = str(body.name, "Name", { max: 60 });
  const slug = slugify(optStr(body.slug, 60) ?? name);
  if (!slug) throw badRequest("Enter a valid name.");
  const row = must(
    await db()
      .from("categories")
      .insert({ id: `cat-${slug}`, name, slug, image: optStr(body.image, 500) ?? null, tagline: optStr(body.tagline, 120) ?? null, sort: Number(body.sort) || 99 })
      .select("*")
      .single(),
    "create category",
  );
  return mapCategory(row);
});

route("PATCH", "/admin/categories/:id", async ({ req, params, body }) => {
  await requireStaff(req);
  const patch = snake({
    name: optStr(body.name, 60),
    image: optStr(body.image, 500),
    tagline: optStr(body.tagline, 120),
    sort: body.sort != null ? Number(body.sort) : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
  });
  const row = must(await db().from("categories").update(patch).eq("id", params.id).select("*").single(), "update category");
  return mapCategory(row);
});

function itemFields(body: Row, partial: boolean) {
  const variants = Array.isArray(body.variants)
    ? (body.variants as Row[]).map((v, i) => ({
        id: String(v.id || `v-${randomBytes(3).toString("hex")}-${i}`),
        name: str(v.name, "Variant name", { max: 40 }),
        price: int(v.price, "Variant price", { min: 0 }),
      }))
    : undefined;
  const status = body.status as string | undefined;
  if (status && !["available", "few_left", "sold_out", "pre_order"].includes(status)) throw badRequest("Invalid status.");
  return snake({
    categoryId: partial && body.categoryId === undefined ? undefined : str(body.categoryId, "Category"),
    name: partial && body.name === undefined ? undefined : str(body.name, "Name", { max: 100 }),
    description: body.description === undefined ? undefined : (optStr(body.description, 1000) ?? null),
    basePrice: partial && body.basePrice === undefined ? undefined : int(body.basePrice, "Price", { min: 0 }),
    images: Array.isArray(body.images) ? body.images.map(String).filter(Boolean).slice(0, 5) : undefined, // 1 main + 4
    status,
    maxQty: body.maxQty != null ? int(body.maxQty, "Max qty", { min: 1, max: 500 }) : undefined,
    variants,
    badge: body.badge === undefined ? undefined : (optStr(body.badge, 30) ?? null),
    popular: typeof body.popular === "boolean" ? body.popular : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
    nutrition: body.nutrition && typeof body.nutrition === "object" ? body.nutrition : undefined,
    ingredients: Array.isArray(body.ingredients) ? body.ingredients.map(String) : undefined,
  });
}

route("POST", "/admin/items", async ({ req, body }) => {
  await requireStaff(req);
  const fields = itemFields(body, false);
  const id = `item-${slugify(String(fields.name))}-${randomBytes(2).toString("hex")}`;
  const row = must(await db().from("items").insert({ id, ...fields }).select("*").single(), "create item");
  return mapItem(row);
});

route("PATCH", "/admin/items/:id", async ({ req, params, body }) => {
  await requireStaff(req);
  const row = must(
    await db()
      .from("items")
      .update({ ...itemFields(body, true), updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select("*")
      .single(),
    "update item",
  );
  return mapItem(row);
});

/**
 * Email opted-in customers about a product ("New on the menu").
 * Sends to at most ANNOUNCE_BATCH people per press (Resend free plan: 100/day)
 * and never emails anyone twice about the same product, so pressing again
 * later continues where it stopped.
 */
const ANNOUNCE_BATCH = 90;

route("POST", "/admin/items/:id/announce", async ({ req, params }) => {
  await requireStaff(req);
  const item = maybe(await db().from("items").select("*").eq("id", params.id).maybeSingle(), "announce item");
  if (!item) throw notFound("Product not found.");
  if (!item.active) throw badRequest("This product is hidden. Show it on the menu before announcing it.");
  const cat = maybe(await db().from("categories").select("slug").eq("id", item.category_id).maybeSingle(), "announce category");
  const product = mapItem(item);

  const kind = `product_announce:${item.id}`;
  const already = new Set(
    (must(await db().from("notification_log").select("recipient").eq("kind", kind).eq("status", "sent"), "announce log") as Row[]).map(
      (r) => String(r.recipient).toLowerCase(),
    ),
  );
  const customers = must(
    await db()
      .from("users")
      .select("id, email, full_name")
      .eq("role", "CUSTOMER")
      .eq("marketing_opt_in", true)
      .not("email", "is", null)
      .limit(10000),
    "announce recipients",
  ) as Row[];
  const pending = customers.filter((c) => c.email && !already.has(String(c.email).toLowerCase()));
  const batch = pending.slice(0, ANNOUNCE_BATCH);
  if (!batch.length) return { sent: 0, remaining: 0, total: customers.length };

  const expires = Math.floor(Date.now() / 1000) + 3 * 365 * 24 * 3600;
  const sent = await announceProduct(
    {
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.images[0] ?? null,
      basePrice: product.basePrice,
      categorySlug: (cat?.slug as string | undefined) ?? null,
    },
    batch.map((c) => ({
      id: c.id as string,
      email: c.email as string,
      fullName: c.full_name as string,
      unsubscribeUrl: `${env.appUrl}/api/v1/email/unsubscribe?t=${encodeURIComponent(signToken({ uid: c.id, p: "unsub", exp: expires }))}`,
    })),
  ).catch(() => {
    throw badRequest("Couldn't send the announcement. Check the email settings and try again.");
  });
  return { sent, remaining: pending.length - batch.length, total: customers.length };
});

/** Soft delete — keeps old orders intact. */
route("DELETE", "/admin/items/:id", async ({ req, params }) => {
  await requireStaff(req);
  must(await db().from("items").update({ active: false }).eq("id", params.id), "hide item");
  return { ok: true };
});

route("GET", "/admin/banners", async ({ req }) => {
  await requireStaff(req);
  const rows = must(await db().from("banners").select("*").order("priority", { ascending: false }), "admin banners") as Row[];
  return { data: rows.map(mapBanner) };
});

function bannerFields(body: Row) {
  return snake({
    title: body.title === undefined ? undefined : str(body.title, "Title", { max: 80 }),
    subtitle: body.subtitle === undefined ? undefined : (optStr(body.subtitle, 120) ?? null),
    description: body.description === undefined ? undefined : (optStr(body.description, 400) ?? null),
    image: body.image === undefined ? undefined : str(body.image, "Image", { max: 500 }),
    ctaType: optStr(body.ctaType, 20),
    ctaTarget: body.ctaTarget === undefined ? undefined : (optStr(body.ctaTarget, 300) ?? null),
    ctaLabel: body.ctaLabel === undefined ? undefined : (optStr(body.ctaLabel, 40) ?? null),
    priority: body.priority != null ? Number(body.priority) || 0 : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
    startAt: body.startAt === undefined ? undefined : (optStr(body.startAt, 40) ?? null),
    endAt: body.endAt === undefined ? undefined : (optStr(body.endAt, 40) ?? null),
  });
}

route("POST", "/admin/banners", async ({ req, body }) => {
  await requireStaff(req);
  str(body.title, "Title");
  str(body.image, "Image");
  const row = must(await db().from("banners").insert(bannerFields(body)).select("*").single(), "create banner");
  return mapBanner(row);
});

route("PATCH", "/admin/banners/:id", async ({ req, params, body }) => {
  await requireStaff(req);
  const row = must(await db().from("banners").update(bannerFields(body)).eq("id", params.id).select("*").single(), "update banner");
  return mapBanner(row);
});

/**
 * Signed direct-to-Cloudinary upload: the browser sends the file straight to
 * Cloudinary (no 6 MB serverless body limit, no DB storage used).
 * Falls back to { provider: "supabase" } → POST /admin/uploads.
 */
route("POST", "/admin/uploads/sign", async ({ req, body }) => {
  await requireStaff(req);
  const { cloudName, apiKey, apiSecret, folder: root } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) return { provider: "supabase" };
  const folder = `${root}/${body.folder === "banners" ? "banners" : "catalogue"}`;
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signature: sorted params joined with &, then the secret, SHA-1.
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  return {
    provider: "cloudinary",
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    apiKey,
    timestamp,
    folder,
    signature,
  };
});

/** Image upload → Supabase Storage (public "uploads" bucket). Returns { url }. */
route("POST", "/admin/uploads", async ({ req }) => {
  await requireStaff(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw badRequest("Attach an image file.");
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) throw badRequest("Upload a JPG, PNG, WebP, GIF or AVIF image.");
  if (file.size > 4 * 1024 * 1024) throw badRequest("Image must be under 4 MB.");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const folder = form?.get("folder") === "banners" ? "banners" : "catalogue";
  const path = `${folder}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const { error } = await db()
    .storage.from("uploads")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) {
    console.error("[uploads]", error);
    throw badRequest("Upload failed. Please try again.");
  }
  return { url: db().storage.from("uploads").getPublicUrl(path).data.publicUrl };
});

// ───────────────────────── Orders ─────────────────────────

route("GET", "/admin/orders", async ({ req, query }) => {
  await requireStaff(req);
  const { limit, page: p, from, to } = page(query);
  let q = db().from("orders").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  const status = query.get("status");
  if (status) q = q.in("status", status.split(","));
  else q = q.not("status", "in", "(draft,pending_payment)");
  const res = await q;
  const rows = must(res, "admin orders") as Row[];
  return { items: await withUsers(await hydrateOrders(rows)), total: res.count ?? rows.length, page: p, limit };
});

route("GET", "/admin/orders/:id", async ({ req, params }) => {
  await requireStaff(req);
  const [o] = await withUsers([await getOrder(params.id)]);
  return o;
});

const NEXT_STATUS: Record<string, string[]> = {
  placed: ["seen", "accepted", "cancelled"],
  seen: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_delivery", "out_for_delivery", "cancelled"],
  ready_for_delivery: ["out_for_delivery", "delivered", "cancelled"], // delivered = picked up
  out_for_delivery: ["delivered"],
  delivered: ["completed"],
};

async function moveOrder(id: string, status: string, note: string | null, extra: Row = {}) {
  const order = await getOrder(id);
  if (order.status !== status && !(NEXT_STATUS[order.status] ?? []).includes(status)) {
    throw badRequest(`Can't move an order from "${order.status}" to "${status}".`);
  }
  must(
    await db()
      .from("orders")
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq("id", id),
    "move order",
  );
  await logStatus(id, status, note);
  const updated = await getOrder(id);
  const customer = camel<DbUser>(must(await db().from("users").select("*").eq("id", updated.userId).single(), "customer"));
  const phone = customer.phone ?? (updated.addressSnapshot?.contactPhone as string | undefined) ?? null;
  await notifyOrderStatus(updated, { ...customer, phone }, note);
  const [withUser] = await withUsers([updated]);
  return withUser;
}

route("PATCH", "/admin/orders/:id/status", async ({ req, params, body }) => {
  await requireStaff(req);
  return moveOrder(params.id, str(body.status, "Status", { max: 40 }), optStr(body.note, 300) ?? null);
});

route("POST", "/admin/orders/:id/delivery", async ({ req, params, body }) => {
  await requireStaff(req);
  const delivery = {
    riderName: str(body.riderName, "Rider name", { max: 80 }),
    riderPhone: str(body.riderPhone, "Rider phone", { max: 30 }),
    etaMinutes: int(body.etaMinutes ?? 30, "ETA", { min: 1, max: 600 }),
  };
  return moveOrder(params.id, "out_for_delivery", `Rider: ${delivery.riderName}`, { delivery });
});

// ───────────────────────── Events ─────────────────────────

route("GET", "/admin/events", async ({ req, query }) => {
  await requireStaff(req);
  const { limit, page: p, from, to } = page(query);
  let q = db().from("event_requests").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  const status = query.get("status");
  if (status) q = q.eq("status", status);
  const res = await q;
  return { items: (must(res, "admin events") as Row[]).map(mapEvent), total: res.count ?? 0, page: p, limit };
});

route("PATCH", "/admin/events/:id", async ({ req, params, body }) => {
  await requireStaff(req);
  const patch = snake({
    status: optStr(body.status, 40),
    quoteAmount: body.quoteAmount != null ? int(body.quoteAmount, "Quote", { min: 0 }) : undefined,
    quoteNote: optStr(body.quoteNote, 1000),
    quoteLink: optStr(body.quoteLink, 500),
    updatedAt: new Date().toISOString(),
  });
  const row = maybe(await db().from("event_requests").update(patch).eq("id", params.id).select("*").maybeSingle(), "update event");
  if (!row) throw notFound("Event not found.");
  const ev = mapEvent(row);
  const customer = camel<DbUser>(must(await db().from("users").select("*").eq("id", ev.userId).single(), "event customer"));
  await notifyEventUpdated(ev, customer);
  return ev;
});

// ───────────────────────── Users & staff ─────────────────────────

route("GET", "/admin/users", async ({ req, query }) => {
  await requireStaff(req);
  const { limit, page: p, from, to } = page(query);
  let q = db().from("users").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  const role = query.get("role");
  if (role) q = q.eq("role", role);
  const search = (query.get("q") ?? "").replace(/[%_,()]/g, " ").trim();
  if (search) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  const res = await q;
  return {
    items: (must(res, "admin users") as Row[]).map((r) => publicUser(camel<DbUser>(r))),
    total: res.count ?? 0,
    page: p,
    limit,
  };
});

route("GET", "/admin/staff", async ({ req }) => {
  await requireStaff(req);
  const rows = must(
    await db().from("users").select("*").in("role", ["STAFF", "SUPER_ADMIN"]).order("created_at"),
    "staff",
  ) as Row[];
  return { items: rows.map((r) => publicUser(camel<DbUser>(r))), total: rows.length };
});

route("POST", "/admin/staff/invite", async ({ req, body }) => {
  const me = await requireStaff(req);
  if (me.role !== "SUPER_ADMIN") throw forbidden("Only a super admin can add staff.");
  const email = str(body.email, "Email").toLowerCase();
  if (!isEmail(email)) throw badRequest("Enter a valid email.");
  const role = body.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STAFF";
  const fullName = optStr(body.fullName, 80);
  const existing = maybe(await db().from("users").select("*").eq("email", email).maybeSingle(), "find staff");
  const row = existing
    ? must(await db().from("users").update({ role, ...(fullName && !existing.full_name ? { full_name: fullName } : {}) }).eq("id", existing.id).select("*").single(), "promote staff")
    : must(await db().from("users").insert({ email, full_name: fullName ?? "", role }).select("*").single(), "invite staff");
  await notifyStaffInvite({ email, fullName, role });
  return publicUser(camel<DbUser>(row));
});

// ───────────────────────── Settings ─────────────────────────

route("GET", "/admin/settings", async ({ req }) => {
  await requireStaff(req);
  return getSettings();
});

route("PATCH", "/admin/settings", async ({ req, body }) => {
  await requireStaff(req);
  const patch = snake({
    pickupEnabled: typeof body.pickupEnabled === "boolean" ? body.pickupEnabled : undefined,
    pickupAddress: optStr(body.pickupAddress, 300),
    pickupHours: optStr(body.pickupHours, 120),
    pauseOrders: typeof body.pauseOrders === "boolean" ? body.pauseOrders : undefined,
    whatsappNumber: optStr(body.whatsappNumber, 20),
    updatedAt: new Date().toISOString(),
  });
  must(await db().from("settings").update(patch).eq("id", 1), "update settings");
  return getSettings();
});

