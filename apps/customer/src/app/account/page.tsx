"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { greetingForNow, whatsappLink } from "@/lib/format";
import { cn } from "@/lib/cn";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const vibeCards = [
  {
    href: "/orders",
    label: "Orders",
    value: "Track",
    blurb: "Cart & history",
    icon: ShoppingBag,
    tone: "bg-[#e8f5e9] text-[#2e7d4f]",
    bar: "bg-[#81c784]",
    fill: "w-[70%]",
  },
  {
    href: "/account/addresses",
    label: "Address",
    value: "Lagos",
    blurb: "Delivery spots",
    icon: MapPin,
    tone: "bg-[#e3f2fd] text-[#1565c0]",
    bar: "bg-[#64b5f6]",
    fill: "w-[55%]",
  },
  {
    href: "/pastries",
    label: "Cravings",
    value: "Browse",
    blurb: "Full pastry menu",
    icon: UtensilsCrossed,
    tone: "bg-[#fff3e0] text-[#ef6c00]",
    bar: "bg-[#ffb74d]",
    fill: "w-[85%]",
  },
  {
    href: "/events",
    label: "Events",
    value: "Book",
    blurb: "Dessert tables",
    icon: PartyPopper,
    tone: "bg-[#f3e5f5] text-[#7b1fa2]",
    bar: "bg-[#ce93d8]",
    fill: "w-[40%]",
  },
];

const quickActions = [
  { href: "/pastries", label: "Order treats", icon: Heart, tone: "bg-[#e8f5e9] text-[#2e7d4f]" },
  { href: "/orders", label: "My orders", icon: ShoppingBag, tone: "bg-[#fff3e0] text-[#ef6c00]" },
  { href: "/account/addresses", label: "Addresses", icon: MapPin, tone: "bg-[#e3f2fd] text-[#1565c0]" },
  { href: "/events/book", label: "Book event", icon: CalendarDays, tone: "bg-[#f3e5f5] text-[#7b1fa2]" },
];

const recommended = [
  { href: "/pastries/cakes", title: "Cakes", image: "/temp/images/cake-wholewheat.jpg", tone: "from-[#5d4037]/70" },
  { href: "/pastries/chinchin", title: "Chinchin", image: "/temp/images/chinchin.jpg", tone: "from-[#2e7d4f]/65" },
  { href: "/pastries/doughnuts", title: "Doughnuts", image: "/temp/images/donut.jpg", tone: "from-[#ef6c00]/65" },
];

const upcoming = [
  { time: "Now", label: "Browse the menu", href: "/pastries", color: "bg-[#81c784]" },
  { time: "Soon", label: "Check your cart", href: "/orders", color: "bg-[#64b5f6]" },
  { time: "Next", label: "Save a delivery address", href: "/account/addresses", color: "bg-[#ffb74d]" },
  { time: "Anytime", label: "Book a dessert table", href: "/events", color: "bg-[#ce93d8]" },
];

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const itemCount = useCartStore((s) => s.itemCount());
  const wa = whatsappLink(process.env.NEXT_PUBLIC_WHATSAPP ?? "2348000000000", "Hi DHT, I need some help");
  const greeting = user ? greetingForNow(user.fullName) : "Hey there";
  const progress = Math.min(100, Math.round((itemCount / 6) * 100) || (user ? 28 : 8));

  return (
    <div className="page-pad space-y-6 md:space-y-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] leading-tight text-deep md:text-[36px]">
            {greeting}
            {user ? " ☀️" : " 👋"}
          </h1>
          <p className="mt-1 max-w-md text-sm text-deep/55 md:text-base">
            {user
              ? "You're doing great. Keep the fibre treats coming — happier you, happier day."
              : "Sign in to track orders, save addresses, and book dessert tables."}
          </p>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blush font-display text-lg text-deep ring-4 ring-white shadow-[var(--shadow-card)]">
          {user ? initials(user.fullName) : <UserRound size={22} />}
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_0.95fr] lg:gap-6">
        {/* —— Main column —— */}
        <div className="space-y-5 md:space-y-6">
          {/* Hero reminder */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative min-h-[200px] overflow-hidden rounded-[28px] shadow-[var(--shadow-card)] md:min-h-[240px]"
          >
            <Image
              src="/temp/images/cake-carrot.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="800px"
              unoptimized
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-deep/85 via-deep/55 to-transparent" />
            <div className="relative flex h-full min-h-[200px] flex-col justify-end p-5 md:min-h-[240px] md:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-honey">Today&apos;s reminder</p>
              <p className="mt-2 max-w-sm font-display text-2xl leading-tight text-white md:text-3xl">
                A sweet bite leads to a brighter tomorrow.
              </p>
              <Link
                href="/pastries"
                className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-deep shadow-sm"
              >
                <Sparkles size={14} className="text-honey" /> Explore the menu
              </Link>
            </div>
          </motion.section>

          {/* Soft metric cards */}
          <section>
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 className="font-display text-xl text-deep md:text-2xl">Your Dripping Honey vibe</h2>
              {user ? (
                <span className="text-xs font-semibold text-tea">
                  {user.phone || user.email}
                  {user.phoneVerified || user.emailVerified ? (
                    <BadgeCheck size={12} className="ml-1 inline text-honey" />
                  ) : null}
                </span>
              ) : (
                <Link href="/verify?returnTo=/account" className="text-xs font-semibold text-[#c47b62]">
                  Sign in →
                </Link>
              )}
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

          {/* Recommended */}
          <section>
            <h2 className="mb-3 font-display text-xl text-deep md:text-2xl">Recommended for you</h2>
            <ul className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {recommended.map((r) => (
                <li key={r.href} className="w-[72%] shrink-0 sm:w-[46%] md:w-[38%]">
                  <Link
                    href={r.href}
                    className="pressable group relative block aspect-[5/4] overflow-hidden rounded-[24px] shadow-[var(--shadow-card)]"
                  >
                    <Image src={r.image} alt="" fill className="object-cover transition duration-500 group-hover:scale-105" sizes="280px" unoptimized />
                    <span className={cn("absolute inset-0 bg-gradient-to-t to-transparent", r.tone)} />
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                      <span className="font-display text-xl text-white">{r.title}</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-deep">
                        <ArrowRight size={16} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* —— Side column —— */}
        <aside className="space-y-4 md:space-y-5">
          {/* Progress ring */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-[28px] bg-[#e8f5e9] p-5 shadow-[var(--shadow-card)]"
          >
            <p className="text-sm font-semibold text-deep">Treat progress</p>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#66bb6a ${progress}%, #c8e6c9 0)`,
                }}
              >
                <span className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full bg-[#e8f5e9]">
                  <span className="font-display text-2xl text-deep">{progress}%</span>
                </span>
              </div>
              <div>
                <p className="font-display text-lg leading-snug text-deep">
                  {itemCount > 0 ? "Cart looking tasty!" : user ? "You're on track!" : "Ready when you are"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-deep/55">
                  {itemCount > 0
                    ? `${itemCount} treat${itemCount === 1 ? "" : "s"} waiting in your cart.`
                    : "Add a few fibre favourites to keep the good mood going."}
                </p>
                <Link href="/orders" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#2e7d4f]">
                  Open cart <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </motion.section>

          {/* Quick actions */}
          <section>
            <h2 className="mb-3 font-display text-lg text-deep">Quick actions</h2>
            <ul className="grid grid-cols-2 gap-2.5">
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.label}>
                    <Link
                      href={a.href}
                      className={cn(
                        "pressable flex flex-col items-start gap-2 rounded-[20px] p-3.5 text-sm font-semibold shadow-[var(--shadow-card)]",
                        a.tone,
                      )}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                      {a.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Upcoming shortcuts */}
          <section className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
            <h2 className="font-display text-lg text-deep">Upcoming</h2>
            <ul className="mt-3 space-y-3">
              {upcoming.map((u) => (
                <li key={u.label}>
                  <Link href={u.href} className="flex items-center gap-3">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", u.color)} />
                    <span className="w-16 shrink-0 text-[11px] font-semibold text-deep/45">{u.time}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-deep">{u.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Quote + support */}
          <section className="rounded-[24px] bg-[#e0f2f1] p-4 shadow-[var(--shadow-card)]">
            <p className="font-display text-lg italic leading-snug text-deep">“Progress, not perfection — and always a little honey.”</p>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-tea"
            >
              <MessageCircle size={14} /> Chat on WhatsApp
            </a>
          </section>

          {user ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="pressable flex w-full items-center justify-center gap-2 rounded-[22px] bg-white py-3.5 text-sm font-semibold text-danger shadow-[var(--shadow-card)] ring-1 ring-deep/5"
            >
              <LogOut size={16} /> Log out
            </button>
          ) : (
            <Link
              href="/verify?returnTo=/account"
              className="pressable flex w-full items-center justify-center gap-2 rounded-[22px] bg-deep py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-card)]"
            >
              Sign in to continue
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
