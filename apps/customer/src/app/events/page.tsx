"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Check, ChevronRight, MapPin, PartyPopper, Users } from "lucide-react";
import { apiClient } from "@/lib/api";
import { getEventTypes } from "@/lib/catalogue";
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
    void getEventTypes()
      .then(({ types: next }) => {
        setTypes(next);
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

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-7 overflow-hidden rounded-[30px] bg-deep p-5 text-white shadow-[var(--shadow-card)] md:mb-9 md:flex md:items-center md:gap-8 md:p-7"
      >
        <div className="relative z-10 max-w-md">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-blush">
            <PartyPopper size={13} /> Sweet tables · Lagos & Ibadan
          </p>
          <h2 className="mt-3 font-display text-[28px] leading-tight md:text-[36px]">
            Tables that taste as good as they look
          </h2>
          <p className="mt-2 text-sm text-white/70 md:text-base">
            Fibre-rich cakes, snack boxes, and dessert bars styled for your day.
          </p>
          <Link
            href={`/events/book?city=${encodeURIComponent(city)}`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-honey px-5 py-3 text-xs font-bold uppercase tracking-wide text-deep"
          >
            Book an event <ArrowRight size={14} />
          </Link>
        </div>
        <div className="pointer-events-none absolute -right-6 bottom-0 top-8 w-[42%] md:relative md:right-0 md:top-0 md:h-48 md:w-56 md:shrink-0">
          <Image src={EVENT_PLACEHOLDER} alt="" fill className="object-contain object-bottom opacity-90" sizes="240px" unoptimized />
        </div>
      </motion.section>

      <div className="mb-6 md:mb-8">
        <p className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-semibold text-deep/60">
          <MapPin size={13} /> Event cities
        </p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {EVENT_CITIES.map((c) => {
            const active = c === city;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={cn(
                  "relative shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold md:px-5 md:text-sm",
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

      <section className="mb-8 md:mb-10">
        <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
          <h2 className="font-display text-[22px] text-deep md:text-[26px]">What we do</h2>
          <Link href={`/events/book?city=${encodeURIComponent(city)}`} className="text-xs font-semibold text-tea">
            Book us <ArrowRight size={12} className="inline" />
          </Link>
        </div>
        {typesState === "loading" ? (
          <ColumnLoader columns={3} count={3} aspect="aspect-[16/10]" />
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
          <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
            {types.map((t, i) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.07, duration: 0.7, ease: [0.33, 0, 0.2, 1] }}
                className={cn(
                  "w-[78%] shrink-0 snap-start overflow-hidden rounded-[28px] p-2 shadow-[var(--shadow-card)] md:w-auto",
                  toneFor(i),
                )}
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] ring-[3px] ring-white/70">
                  <Image src={t.image || EVENT_PLACEHOLDER} alt="" fill className="object-cover" sizes="(max-width:768px) 80vw, 320px" unoptimized />
                </div>
                <div className="p-2.5 pt-3 md:p-3">
                  <p className="font-display text-lg text-deep md:text-xl">{t.name}</p>
                  {t.description ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-deep/60 md:text-sm">{t.description}</p> : null}
                  {t.includes?.length ? (
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {t.includes.slice(0, 3).map((inc) => (
                        <li
                          key={inc}
                          className="flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[10.5px] font-medium text-deep"
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
        <h2 className="mb-3 font-display text-[22px] text-deep md:mb-4 md:text-[26px]">Your events</h2>
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
            <SegmentedTabs id="events" tabs={tabs} value={tab} onChange={setTab} className="mb-4 md:mb-5" />
            {eventsState === "error" ? (
              <OfflineState compact onRetry={loadEvents} />
            ) : eventsState === "loading" ? (
              <ColumnLoader columns={1} count={3} aspect="h-24 aspect-auto" />
            ) : shownEvents.length === 0 ? (
              <EmptyState
                compact
                image={LOGO}
                title="No event yet"
                message="Let's plan something sweet."
                icon={<PartyPopper size={22} />}
              />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2 md:gap-4">
                {shownEvents.map((ev, i) => (
                  <motion.li key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link
                      href={`/events/${ev.id}`}
                      className="pressable flex items-center gap-3 rounded-[28px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-5"
                    >
                      <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-[18px] bg-blush-soft text-deep md:h-[72px] md:w-16">
                        <span className="text-[10px] font-semibold uppercase tracking-wide">
                          {new Date(ev.date).toLocaleDateString("en-NG", { month: "short" })}
                        </span>
                        <span className="font-display text-2xl leading-none">{new Date(ev.date).getDate() || "–"}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-deep md:text-lg">{ev.title || ev.type}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-deep/55 md:text-xs">
                          <Users size={12} /> {ev.guests} guests · {ev.city}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge status={ev.status} />
                          {ev.quoteAmount ? (
                            <span className="text-xs font-semibold text-deep md:text-sm">{formatNgn(ev.quoteAmount)}</span>
                          ) : null}
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
