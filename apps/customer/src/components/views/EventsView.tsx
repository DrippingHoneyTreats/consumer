"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, ChevronRight, Inbox, MapPin, PartyPopper, Users } from "lucide-react";
import { apiClient } from "@/lib/api";
import { getEventTypes } from "@/lib/catalogue";
import { asArray } from "@/lib/data";
import { formatNgn, contactLink } from "@/lib/format";
import { EVENT_CITIES, EVENT_PLACEHOLDER } from "@/lib/placeholders";
import type { EventRequest, EventType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { UnderlineTabs } from "@/components/orders/UnderlineTabs";
import {
  ArrowPill,
  CtaBanner,
  EditorialHero,
  EditorialPage,
  FeatureGridDark,
  ImageStack,
  ProcessSteps,
  SectionIntro,
  StatCard,
  TrustStrip,
} from "@/components/editorial/Editorial";
import { EVENT_STEPS, WHY_EVENTS } from "@/components/editorial/content";
import { SwipeDeck } from "@/components/editorial/SwipeDeck";
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

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

export function EventsView() {
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
      setEvents([]);
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
  const ongoingCount = useMemo(() => events.filter((e) => tabFor(e.status) === "ongoing").length, [events]);
  const bookHref = `/events/book?city=${encodeURIComponent(city)}`;
  const wa = contactLink("Hi DHT, I'd love to chat about an event / dessert table");
  const packageCard = (t: EventType) => (
    <Link
      href={`${bookHref}&type=${encodeURIComponent(t.id)}`}
      className="pressable group block h-full overflow-hidden rounded-[28px] bg-white p-2 shadow-[var(--shadow-card)] ring-1 ring-deep/5"
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[22px] bg-cream">
        <Image src={t.image || EVENT_PLACEHOLDER} alt="" fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 360px, 50vw" unoptimized />
        <span className="absolute right-3 top-3 hidden h-10 w-10 items-center justify-center rounded-full bg-white text-deep shadow transition group-hover:rotate-45 md:flex">
          <ArrowUpRight size={17} />
        </span>
      </span>
      <span className="block px-3 pb-3 pt-4">
        <span className="block font-display text-xl font-semibold text-deep">{t.name}</span>
        {t.description ? <span className="mt-1 line-clamp-2 block text-sm text-deep/55">{t.description}</span> : null}
        {t.includes?.length ? (
          <span className="mt-3 flex flex-wrap gap-1.5">
            {t.includes.slice(0, 3).map((inc) => (
              <span key={inc} className="inline-flex items-center gap-1 rounded-full border border-deep/12 px-2.5 py-1 text-[11px] font-medium text-deep/70">
                <Check size={11} className="text-tea" /> {inc}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </Link>
  );

  const bookingCard = (ev: EventRequest) => (
    <Link
      href={`/events/${ev.id}`}
      className="pressable flex items-center gap-4 rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5"
    >
      <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-[18px] bg-deep text-white">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
          {new Date(ev.date).toLocaleDateString("en-NG", { month: "short" })}
        </span>
        <span className="font-display text-2xl leading-none">{new Date(ev.date).getDate() || "–"}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-deep">{ev.title || ev.type}</span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-deep/55">
          <Users size={12} /> {ev.guests} guests · {ev.city}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-2">
          <Badge status={ev.status} />
          {ev.quoteAmount ? <span className="text-xs font-semibold text-deep">{formatNgn(ev.quoteAmount)}</span> : null}
        </span>
      </span>
      <ChevronRight size={18} className="hidden text-deep/30 md:block" />
    </Link>
  );

  const images = types.map((t) => t.image).filter((x): x is string => Boolean(x));

  return (
    <EditorialPage>
      {/* —— Hero —— */}
      <EditorialHero
        className="md:pt-4"
        pill={
          <>
            <PartyPopper size={13} /> {user ? `Hi ${firstName(user.fullName)}, welcome to DHT Events` : "Welcome to DHT Events"}
          </>
        }
        title={
          <>
            Dessert tables that <span className="italic text-tea">steal</span> the show
          </>
        }
        text="Birthdays, hangouts and dessert bars, styled by us and stacked with fibre-rich treats your guests will talk about."
        actions={
          <>
            <ArrowPill href={bookHref}>Book an event</ArrowPill>
            <ArrowPill href={wa} external tone="outline">
              Chat with us
            </ArrowPill>
          </>
        }
        footer={
          <div id="cities" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-deep/55">
              <MapPin size={13} /> Celebrating in
            </span>
            {EVENT_CITIES.map((c) => {
              const active = c === city;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  aria-pressed={active}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-xs font-semibold md:text-sm",
                    active ? "text-white" : "bg-white text-deep ring-1 ring-deep/10",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="event-city-chip"
                      className="absolute inset-0 rounded-full bg-deep"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <span className="relative">{c}</span>
                </button>
              );
            })}
          </div>
        }
        media={
          <ImageStack
            images={images.length ? images : [EVENT_PLACEHOLDER]}
            chipValue={types.length ? `${types.length} packages` : "Custom"}
            chipLabel="to match your vibe"
            caption="Styled tables for every celebration"
          />
        }
      />

      <TrustStrip items={["Birthdays", "Hangouts", "Dessert bars", "Baby showers", "Office treats", "Weddings"]} />

      {/* —— About + stat —— */}
      <section className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
        <SectionIntro
          className="!mb-0"
          pill="About our events"
          title={
            <>
              Meet DHT: your <span className="italic text-tea">dessert table</span> partners
            </>
          }
          text="We're not just bakers. We plan with you, style the table to your theme, and bring treats that look beautiful and are made with whole grains and real fibre."
        />
        <StatCard
          value={user ? ongoingCount : types.length || "100%"}
          label={user ? `booking${ongoingCount === 1 ? "" : "s"} in progress with us` : types.length ? "packages to choose from" : "made to order"}
          tags={types.length ? types.slice(0, 5).map((t) => t.name) : ["Birthdays", "Hangouts", "Dessert bars"]}
        />
      </section>

      {/* —— How it works —— */}
      <section>
        <SectionIntro
          pill="How it works"
          title={
            <>
              Let us show you how we make your day <span className="italic text-tea">sweeter</span>
            </>
          }
        />
        <ProcessSteps steps={EVENT_STEPS} note="Ready to party!" />
      </section>

      {/* —— Packages —— */}
      <section id="packages" className="scroll-mt-24">
        <SectionIntro
          pill="Packages"
          title="Pick your vibe"
          text={`Tap a package to start your booking in ${city}.`}
          action={<ArrowPill href={bookHref} tone="outline">Start booking</ArrowPill>}
        />
        {typesState === "loading" ? (
          <ColumnLoader columns={3} count={3} aspect="aspect-[4/5]" />
        ) : typesState === "error" ? (
          <OfflineState compact onRetry={loadTypes} />
        ) : types.length === 0 ? (
          <EmptyState compact icon={<Inbox size={48} strokeWidth={1.4} />} title="Packages coming soon" message="Chat with us on WhatsApp to plan your table." />
        ) : (
          <>
          <SwipeDeck tone="none" label="Event packages" items={types.map((t) => <div key={t.id} className="h-full [&>a]:h-full">{packageCard(t)}</div>)} />
          <ul className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
            {types.map((t, i) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
              >
                {packageCard(t)}
              </motion.li>
            ))}
          </ul>
          </>
        )}
      </section>

      {/* —— Your bookings —— */}
      {user ? (
        <section id="your-events" className="scroll-mt-24">
          <SectionIntro pill="Your bookings" title="Your events" />
          <UnderlineTabs id="events" tabs={tabs} value={tab} onChange={setTab} className="mb-5" />
          {eventsState === "error" ? (
            <OfflineState compact onRetry={loadEvents} />
          ) : eventsState === "loading" ? (
            <ColumnLoader columns={1} count={2} aspect="h-24 aspect-auto" />
          ) : shownEvents.length === 0 ? (
            <EmptyState
              compact
              icon={<Inbox size={48} strokeWidth={1.4} />}
              title="Nothing here yet"
              message={tab === "ongoing" ? "Book your first dessert table and it'll show up here." : "No events in this list."}
              actionHref={tab === "ongoing" ? bookHref : undefined}
              actionLabel={tab === "ongoing" ? "Book an event" : undefined}
              actionIcon={<PartyPopper size={16} />}
            />
          ) : (
            <>
            <SwipeDeck tone="none" label="Your events" items={shownEvents.map((ev) => <div key={ev.id}>{bookingCard(ev)}</div>)} />
            <ul className="hidden gap-3 md:grid md:grid-cols-2">
              {shownEvents.map((ev, i) => (
                <motion.li key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  {bookingCard(ev)}
                </motion.li>
              ))}
            </ul>
            </>
          )}
        </section>
      ) : null}

      {/* —— Why us —— */}
      <FeatureGridDark
        pill="Why DHT"
        title="We design moments, not just tables"
        text="Everything you need for a sweet celebration, handled with care."
        items={WHY_EVENTS}
      />

      {/* —— CTA —— */}
      <CtaBanner
        title="Let's plan something sweet"
        text={`Tell us about your celebration in ${city} and we'll send a quote on WhatsApp.`}
        actions={
          <>
            <ArrowPill href={bookHref} tone="light">
              Book an event
            </ArrowPill>
            <a href={wa} target="_blank" rel="noreferrer" className="text-sm font-semibold text-white/80 underline-offset-4 hover:underline">
              or chat with us
            </a>
          </>
        }
      />
    </EditorialPage>
  );
}
