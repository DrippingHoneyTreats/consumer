"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Inbox,
  MapPin,
  MessageCircle,
  PartyPopper,
  Sparkles,
  Users,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { getEventTypes } from "@/lib/catalogue";
import { asArray } from "@/lib/data";
import { formatNgn, greetingForNow, whatsappLink } from "@/lib/format";
import { EVENT_CITIES, EVENT_PLACEHOLDER } from "@/lib/placeholders";
import type { EventRequest, EventType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { UnderlineTabs } from "@/components/orders/UnderlineTabs";
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

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
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
  const name = user ? firstName(user.fullName) : null;
  const bookHref = `/events/book?city=${encodeURIComponent(city)}`;
  const wa = whatsappLink(
    process.env.NEXT_PUBLIC_WHATSAPP ?? "2348000000000",
    "Hi DHT, I'd love to chat about an event / dessert table",
  );
  const progress = user
    ? Math.min(100, ongoingCount > 0 ? 55 + ongoingCount * 15 : types.length ? 35 : 12)
    : 18;

  const vibeCards = [
    {
      href: bookHref,
      label: "Book",
      value: "Now",
      blurb: "Start a request",
      icon: PartyPopper,
      tone: "bg-[#f3e5f5] text-[#7b1fa2]",
      bar: "bg-[#ce93d8]",
      fill: "w-[80%]",
    },
    {
      href: "#cities",
      label: "City",
      value: city,
      blurb: "Where we celebrate",
      icon: MapPin,
      tone: "bg-[#e3f2fd] text-[#1565c0]",
      bar: "bg-[#64b5f6]",
      fill: city === "Lagos" ? "w-[70%]" : "w-[45%]",
    },
    {
      href: "#packages",
      label: "Packages",
      value: types.length ? `${types.length}` : "—",
      blurb: "Ways we style",
      icon: Sparkles,
      tone: "bg-[#fff3e0] text-[#ef6c00]",
      bar: "bg-[#ffb74d]",
      fill: "w-[60%]",
    },
    {
      href: "#your-events",
      label: "Yours",
      value: user ? `${ongoingCount}` : "0",
      blurb: "Ongoing bookings",
      icon: CalendarDays,
      tone: "bg-[#e8f5e9] text-[#2e7d4f]",
      bar: "bg-[#81c784]",
      fill: ongoingCount ? "w-[75%]" : "w-[25%]",
    },
  ];

  const quickActions = [
    { href: bookHref, label: "Book event", icon: PartyPopper, tone: "bg-[#f3e5f5] text-[#7b1fa2]" },
    { href: "#packages", label: "See packages", icon: Sparkles, tone: "bg-[#fff3e0] text-[#ef6c00]" },
    { href: "#your-events", label: "My events", icon: CalendarDays, tone: "bg-[#e3f2fd] text-[#1565c0]" },
    { href: wa, label: "WhatsApp", icon: MessageCircle, tone: "bg-[#e8f5e9] text-[#2e7d4f]", external: true },
  ];

  const upcomingDefaults = [
    { time: "Now", label: `Book in ${city}`, href: bookHref, color: "bg-[#ce93d8]" },
    { time: "Next", label: "Pick a package vibe", href: "#packages", color: "bg-[#ffb74d]" },
    { time: "Soon", label: "Confirm guest count", href: bookHref, color: "bg-[#64b5f6]" },
    { time: "Anytime", label: "Chat dessert ideas", href: wa, color: "bg-[#81c784]", external: true },
  ];

  const upcomingFromEvents = events
    .filter((e) => tabFor(e.status) === "ongoing")
    .slice(0, 4)
    .map((e, i) => ({
      time: new Date(e.date).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
      label: e.title || e.type,
      href: `/events/${e.id}`,
      color: ["bg-[#ce93d8]", "bg-[#64b5f6]", "bg-[#ffb74d]", "bg-[#81c784]"][i % 4],
      external: false,
    }));

  const upcoming = upcomingFromEvents.length ? upcomingFromEvents : upcomingDefaults;

  return (
    <div className="page-pad space-y-6 md:space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] leading-tight text-deep md:text-[36px]">
            {user ? `${greetingForNow(user.fullName)} 🎉` : "Hey there 👋"}
          </h1>
          <p className="mt-1 max-w-md text-sm text-deep/55 md:text-base">
            {user
              ? `Ready for the next celebration, ${name}? Let’s style a sweet table.`
              : "Book DHT for birthdays, hangouts and dessert bars in Lagos & Ibadan."}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f3e5f5] font-display text-lg text-[#7b1fa2] ring-4 ring-white shadow-[var(--shadow-card)]">
          {user ? initials(user.fullName) : <PartyPopper size={20} />}
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_0.95fr] lg:gap-6">
        {/* Main */}
        <div className="space-y-5 md:space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative min-h-[200px] overflow-hidden rounded-[28px] shadow-[var(--shadow-card)] md:min-h-[240px]"
          >
            <Image
              src="/assets/catalogue/cake-carrot.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="800px"
              unoptimized
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#4a2c6a]/90 via-[#7b1fa2]/55 to-transparent" />
            <div className="relative flex h-full min-h-[200px] flex-col justify-end p-5 md:min-h-[240px] md:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#f8bbd0]">Event reminder</p>
              <p className="mt-2 max-w-sm font-display text-2xl leading-tight text-white md:text-3xl">
                Tables that taste as good as they look.
              </p>
              <Link
                href={bookHref}
                className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-deep shadow-sm"
              >
                <PartyPopper size={14} className="text-[#7b1fa2]" /> Book an event
              </Link>
            </div>
          </motion.section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 className="font-display text-xl text-deep md:text-2xl">Your event vibe</h2>
              <Link href={bookHref} className="text-xs font-semibold text-[#7b1fa2]">
                Book us →
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {vibeCards.map((c, i) => {
                const Icon = c.icon;
                return (
                  <motion.li
                    key={c.label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <Link
                      href={c.href}
                      className={cn(
                        "pressable flex h-full flex-col rounded-[22px] p-3.5 shadow-[var(--shadow-card)]",
                        c.tone,
                      )}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide opacity-70">{c.label}</p>
                      <p className="mt-0.5 font-display text-xl leading-none">{c.value}</p>
                      <p className="mt-1 text-[11px] opacity-60">{c.blurb}</p>
                      <span className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
                        <span className={cn("block h-full rounded-full", c.bar, c.fill)} />
                      </span>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </section>

          {/* City chips */}
          <section id="cities" className="scroll-mt-24">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-deep/60">
              <MapPin size={13} /> Event cities
            </p>
            <div className="flex flex-wrap gap-2">
              {EVENT_CITIES.map((c) => {
                const active = c === city;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={cn(
                      "relative rounded-full px-4 py-2.5 text-xs font-semibold md:text-sm",
                      active ? "text-white" : "bg-white text-deep shadow-sm ring-1 ring-deep/5",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="event-city-chip"
                        className="absolute inset-0 rounded-full bg-[#7b1fa2]"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <span className="relative">{c}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Packages / recommended */}
          <section id="packages" className="scroll-mt-24">
            <h2 className="mb-3 font-display text-xl text-deep md:text-2xl">Recommended packages</h2>
            {typesState === "loading" ? (
              <ColumnLoader columns={3} count={3} aspect="aspect-[5/4]" />
            ) : typesState === "error" ? (
              <OfflineState compact onRetry={loadTypes} />
            ) : types.length === 0 ? (
              <EmptyState
                compact
                icon={<Inbox size={48} strokeWidth={1.4} />}
                title="Uh-oh! 👀"
                message="Looks like there's nothing here yet."
              />
            ) : (
              <ul className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                {types.map((t, i) => (
                  <li key={t.id} className="w-[78%] shrink-0 sm:w-[48%] md:w-[42%]">
                    <Link
                      href={`${bookHref}&type=${encodeURIComponent(t.id)}`}
                      className="pressable group relative block overflow-hidden rounded-[24px] bg-white p-2 shadow-[var(--shadow-card)] ring-1 ring-deep/5"
                    >
                      <span className="relative block aspect-[5/4] overflow-hidden rounded-[18px]">
                        <Image
                          src={t.image || EVENT_PLACEHOLDER}
                          alt=""
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="320px"
                          unoptimized
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-[#4a2c6a]/70 to-transparent" />
                        <span className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                          <span className="font-display text-xl text-white">{t.name}</span>
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#7b1fa2]">
                            <ArrowRight size={16} />
                          </span>
                        </span>
                      </span>
                      {t.includes?.length ? (
                        <ul className="flex flex-wrap gap-1.5 px-1.5 py-2.5">
                          {t.includes.slice(0, 3).map((inc) => (
                            <li
                              key={inc}
                              className="flex items-center gap-1 rounded-full bg-[#f3e5f5] px-2 py-1 text-[10.5px] font-medium text-[#7b1fa2]"
                            >
                              <Check size={11} /> {inc}
                            </li>
                          ))}
                        </ul>
                      ) : t.description ? (
                        <p className="line-clamp-2 px-1.5 py-2.5 text-xs text-deep/55">{t.description}</p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Your events */}
          <section id="your-events" className="scroll-mt-24">
            <h2 className="mb-3 font-display text-xl text-deep md:text-2xl">Your events</h2>
            {!user ? (
              <EmptyState
                compact
                icon={<Inbox size={48} strokeWidth={1.4} />}
                title="Uh-oh! 👀"
                message="Looks like there's nothing here yet."
                actionHref={bookHref}
                actionLabel="Book us now"
                actionIcon={<PartyPopper size={16} />}
              />
            ) : (
              <>
                <UnderlineTabs id="events" tabs={tabs} value={tab} onChange={setTab} className="mb-4" />
                {eventsState === "error" ? (
                  <OfflineState compact onRetry={loadEvents} />
                ) : eventsState === "loading" ? (
                  <ColumnLoader columns={1} count={3} aspect="h-24 aspect-auto" />
                ) : shownEvents.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Inbox size={48} strokeWidth={1.4} />}
                    title="Uh-oh! 👀"
                    message="Looks like there's nothing here yet."
                    actionHref={bookHref}
                    actionLabel="Book us now"
                    actionIcon={<PartyPopper size={16} />}
                  />
                ) : (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {shownEvents.map((ev, i) => (
                      <motion.li
                        key={ev.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          href={`/events/${ev.id}`}
                          className="pressable flex items-center gap-3 rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5"
                        >
                          <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-[18px] bg-[#f3e5f5] text-[#7b1fa2]">
                            <span className="text-[10px] font-semibold uppercase tracking-wide">
                              {new Date(ev.date).toLocaleDateString("en-NG", { month: "short" })}
                            </span>
                            <span className="font-display text-2xl leading-none">
                              {new Date(ev.date).getDate() || "–"}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-deep">{ev.title || ev.type}</span>
                            <span className="mt-0.5 flex items-center gap-2 text-[11px] text-deep/55">
                              <Users size={12} /> {ev.guests} guests · {ev.city}
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge status={ev.status} />
                              {ev.quoteAmount ? (
                                <span className="text-xs font-semibold text-deep">{formatNgn(ev.quoteAmount)}</span>
                              ) : null}
                            </span>
                          </span>
                          <ChevronRight size={18} className="text-deep/30" />
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>

        {/* Side */}
        <aside className="space-y-4 md:space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-[28px] bg-[#f3e5f5] p-5 shadow-[var(--shadow-card)]"
          >
            <p className="text-sm font-semibold text-deep">Celebration progress</p>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#ab47bc ${progress}%, #e1bee7 0)`,
                }}
              >
                <span className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-[#f3e5f5]">
                  <span className="font-display text-2xl text-deep">{progress}%</span>
                </span>
              </div>
              <div>
                <p className="font-display text-lg leading-snug text-deep">
                  {ongoingCount > 0
                    ? "Your party’s brewing!"
                    : user
                      ? "Ready to celebrate"
                      : "Let’s plan something sweet"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-deep/55">
                  {ongoingCount > 0
                    ? `${ongoingCount} ongoing booking${ongoingCount === 1 ? "" : "s"} in ${city}.`
                    : `Pick ${city}, choose a package, and we’ll style the table.`}
                </p>
                <Link href={bookHref} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#7b1fa2]">
                  Start booking <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </motion.section>

          <section>
            <h2 className="mb-3 font-display text-lg text-deep">Quick actions</h2>
            <ul className="grid grid-cols-2 gap-2.5">
              {quickActions.map((a) => {
                const Icon = a.icon;
                const className = cn(
                  "pressable flex flex-col items-start gap-2 rounded-[20px] p-3.5 text-sm font-semibold shadow-[var(--shadow-card)]",
                  a.tone,
                );
                return (
                  <li key={a.label}>
                    {a.external ? (
                      <a href={a.href} target="_blank" rel="noreferrer" className={className}>
                        <Icon size={18} strokeWidth={1.8} />
                        {a.label}
                      </a>
                    ) : (
                      <Link href={a.href} className={className}>
                        <Icon size={18} strokeWidth={1.8} />
                        {a.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
            <h2 className="font-display text-lg text-deep">Upcoming</h2>
            <ul className="mt-3 space-y-3">
              {upcoming.map((u) => {
                const row = (
                  <>
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", u.color)} />
                    <span className="w-16 shrink-0 text-[11px] font-semibold text-deep/45">{u.time}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-deep">{u.label}</span>
                  </>
                );
                return (
                  <li key={`${u.time}-${u.label}`}>
                    {"external" in u && u.external ? (
                      <a href={u.href} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                        {row}
                      </a>
                    ) : (
                      <Link href={u.href} className="flex items-center gap-3">
                        {row}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-[24px] bg-[#ede7f6] p-4 shadow-[var(--shadow-card)]">
            <p className="font-display text-lg italic leading-snug text-deep">
              “Celebrate loud — we’ll bring the fibre-rich sweetness.”
            </p>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#7b1fa2]"
            >
              <MessageCircle size={14} /> Chat about your day
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
