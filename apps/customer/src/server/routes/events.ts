import "server-only";
import { camel, db, maybe, must } from "../db";
import { badRequest, int, notFound, optStr, str } from "../http";
import { notifyEventBooked, type EventForNotify } from "../notify";
import { route } from "../router";
import { requireUser, type DbUser } from "../session";

type Row = Record<string, unknown>;

export function mapEvent(r: Row) {
  const e = camel<EventForNotify & { services: string[]; userId: string; createdAt: string }>(r);
  return { ...e, services: Array.isArray(e.services) ? e.services : [] };
}

async function ownEvent(id: string, user: DbUser) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Event not found.");
  const row = maybe(await db().from("event_requests").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(), "event");
  if (!row) throw notFound("Event not found.");
  return mapEvent(row);
}

route("GET", "/events", async ({ req }) => {
  const user = await requireUser(req);
  const rows = must(
    await db().from("event_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    "my events",
  ) as Row[];
  return { data: rows.map(mapEvent) };
});

route("POST", "/events", async ({ req, body }) => {
  const user = await requireUser(req);
  const typeId = optStr(body.typeId, 80);
  let typeName = optStr(body.type, 80);
  if (typeId) {
    const t = maybe(await db().from("event_types").select("name").eq("id", typeId).maybeSingle(), "event type");
    if (t) typeName = t.name as string;
  }
  if (!typeName) throw badRequest("Pick an event type.");
  const date = str(body.date, "Date", { max: 40 });
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) throw badRequest("Pick a valid date.");
  if (parsed.getTime() < Date.now() - 24 * 3600_000) throw badRequest("Pick a date in the future.");

  const row = must(
    await db()
      .from("event_requests")
      .insert({
        user_id: user.id,
        type_id: typeId ?? null,
        type: typeName,
        title: optStr(body.title, 120) ?? null,
        date,
        time: optStr(body.time, 20) ?? "",
        city: str(body.city, "City", { max: 60 }),
        venue_address: str(body.venueAddress, "Venue", { max: 300 }),
        guests: int(body.guests ?? 1, "Guests", { min: 1, max: 5000 }),
        budget: body.budget != null && body.budget !== "" ? int(body.budget, "Budget", { min: 0 }) : null,
        services: Array.isArray(body.services) ? body.services.slice(0, 20).map(String) : [],
        notes: optStr(body.notes, 1000) ?? null,
      })
      .select("*")
      .single(),
    "create event",
  );
  const ev = mapEvent(row);
  await notifyEventBooked(ev, user);
  return ev;
});

route("GET", "/events/:id", async ({ req, params }) => ownEvent(params.id, await requireUser(req)));

route("POST", "/events/:id/cancel", async ({ req, params }) => {
  const user = await requireUser(req);
  const ev = await ownEvent(params.id, user);
  if (["completed", "cancelled"].includes(ev.status)) throw badRequest("This request can no longer be cancelled.");
  const row = must(
    await db().from("event_requests").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", ev.id).select("*").single(),
    "cancel event",
  );
  return mapEvent(row);
});
