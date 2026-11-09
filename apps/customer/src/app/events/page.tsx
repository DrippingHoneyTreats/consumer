"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronRight,
  MapPin,
  PartyPopper,
  Users,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import { formatNgn } from "@/lib/format";
import { EVENT_CITIES, EVENT_PLACEHOLDER, LOGO, toneFor } from "@/lib/placeholders";
import type { EventRequest, EventType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyActions } from "@/components/layout/StickyActions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { cn } from "@/lib/cn";

type Tab = "ongoing" | "completed" | "cancelled";

const tabs: { key: Tab; label: string }[] = [
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function tabFor(status: string): Tab {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "ongoing";
}

export default function EventsPage() {
  const user = useAuthStore((s) => s.user);
  const [types, setTypes] = useState<EventType[]>([]);
  const [typesState, setTypesState] = useState<"loading" | "ready" | "error">("loading");
  const [events, setEvents] = useState<EventRequest[]>([]);
  const [eventsState, setEventsState] = useState<"loading" | "ready" | "error">("loading");
  const [tab, setTab] = useState<Tab>("ongoing");
  const [city, setCity] = useState("Lagos");

  const loadTypes = useCallback(() => {
    setTypesState("loading");
    void apiClient
      .get<EventType[] | { data: EventType[] }>("/events/types")
      .then((res) => {
        setTypes(asArray(res));
        setTypesState("ready");
      })
      .catch(() => setTypesState("error"));
  }, []);

  const loadEvents = useCallback(() => {
    if (!user) {
      setEventsState("ready");
      return;
    }
    setEventsState("loading");
    void apiClient
      .get<EventRequest[] | { data: EventRequest[] }>("/events")
      .then((res) => {
        setEvents(asArray(res));
        setEventsState("ready");
      })
      .catch(() => setEventsState("error"));
  }, [user]);

  useEffect(loadTypes, [loadTypes]);
  useEffect(loadEvents, [loadEvents]);

  const shownEvents = useMemo(() => events.filter((e) => tabFor(e.status) === tab), [events, tab]);

  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+120px)]">
      <PageHeader eyebrow="Celebrate with us" title="Events" subtitle="Book DHT for birthdays, hangouts and celebrations." />

      <div className="mb-6">
        <p className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-semibold text-deep/60">
          <MapPin size={13} /> Event cities
        </p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {EVENT_CITIES.map((c) => {
            const active = c === city;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={cn(
                  "relative shrink-0 rounded-full px-4 py-2 text-xs font-semibold",
                  active ? "text-white" : "bg-white text-deep shadow-sm ring-1 ring-deep/5",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="city-chip"
                    className="absolute inset-0 rounded-full bg-deep"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative">{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mb-7">
        <h2 className="mb-3 font-display text-xl text-deep">What we do</h2>
        {typesState === "loading" ? (
          <ColumnLoader count={2} columns={2} aspect="aspect-[4/5]" />
        ) : typesState === "error" ? (
          <OfflineState compact onRetry={loadTypes} />
        ) : types.length === 0 ? (
          <EmptyState
            compact
            image={LOGO}
            icon={<PartyPopper size={22} />}
            title="Event packages coming soon"
            message="Nothing uploaded yet — you can still book us and tell us what you're planning."
          />
        ) : (
          <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
            {types.map((t, i) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
                className={cn(
                  "w-[72%] shrink-0 snap-start overflow-hidden rounded-[26px] p-2 shadow-[var(--shadow-card)]",
                  toneFor(i),
                )}
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] ring-[3px] ring-white/70">
                  <Image src={t.image || EVENT_PLACEHOLDER} alt="" fill className="object-cover" sizes="320px" unoptimized />
                </div>
                <div className="p-2 pt-3">
                  <p className="font-display text-lg text-deep">{t.name}</p>
                  {t.description ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-deep/60">{t.description}</p> : null}
                  {t.includes?.length ? (
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {t.includes.slice(0, 3).map((inc) => (
                        <li
                          key={inc}
                          className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[10.5px] font-medium text-deep"
                        >
                          <Check size={11} className="text-tea" /> {inc}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-deep">Your events</h2>
        {!user ? (
          <EmptyState
            compact
            image={LOGO}
            title="No event yet"
            message="Let's plan something sweet. Booked before? Log in to manage it."
            actionHref="/verify?returnTo=/events"
            actionLabel="Log in"
            actionIcon={<CalendarDays size={16} />}
            icon={<PartyPopper size={22} />}
          />
        ) : (
          <>
            <SegmentedTabs id="events" tabs={tabs} value={tab} onChange={setTab} className="mb-4" />
            {eventsState === "error" ? (
              <OfflineState compact onRetry={loadEvents} />
            ) : eventsState === "loading" ? (
              <ColumnLoader count={2} columns={1} aspect="h-24 aspect-auto" />
            ) : shownEvents.length === 0 ? (
              <EmptyState
                compact
                image={LOGO}
                title="No event yet"
                message="Let's plan something sweet."
                icon={<PartyPopper size={22} />}
              />
            ) : (
              <ul className="space-y-3">
                {shownEvents.map((ev, i) => (
                  <motion.li key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link
                      href={`/events/${ev.id}`}
                      className="pressable flex items-center gap-3 rounded-[24px] border border-deep/5 bg-white p-3 shadow-[var(--shadow-card)]"
                    >
                      <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-blush-soft text-deep">
                        <span className="text-[10px] font-semibold uppercase">
                          {new Date(ev.date).toLocaleDateString("en-NG", { month: "short" })}
                        </span>
                        <span className="font-display text-xl leading-none">{new Date(ev.date).getDate() || "–"}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-deep">{ev.title || ev.type}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-deep/55">
                          <Users size={12} /> {ev.guests} guests · {ev.city}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <Badge status={ev.status} />
                          {ev.quoteAmount ? <span className="text-xs font-semibold text-deep">{formatNgn(ev.quoteAmount)}</span> : null}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1 text-[11px] font-semibold text-tea">
                        Manage
                        <ChevronRight size={18} className="text-deep/30" />
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <StickyActions aboveTabs>
        <Link href={`/events/book?city=${encodeURIComponent(city)}`}>
          <Button fullWidth variant="dark" leftIcon={<PartyPopper size={18} />} className="shadow-[var(--shadow-float)]">
            Book us now
          </Button>
        </Link>
      </StickyActions>
    </div>
  );
}
