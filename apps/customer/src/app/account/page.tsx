"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  LogOut,
  MapPin,
  MessageCircle,
  ShoppingBag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { whatsappLink } from "@/lib/format";
import { toneFor } from "@/lib/placeholders";
import { BrandLogo } from "@/components/brand/BrandLogo";

type Row = { href: string; label: string; icon: LucideIcon; external?: boolean };

const shortcuts: Row[] = [
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/pastries", label: "Menu", icon: UtensilsCrossed },
];

const rows: Row[] = [
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  {
    href: whatsappLink(process.env.NEXT_PUBLIC_WHATSAPP ?? "2348000000000", "Hi DHT, I need some help"),
    label: "Chat on WhatsApp",
    icon: MessageCircle,
    external: true,
  },
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="page-pad">
      <PageHeader eyebrow="Profile" title="My account" />

      {user ? (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 overflow-hidden rounded-[30px] bg-deep p-5 text-white shadow-[var(--shadow-float)]"
        >
          <div className="relative flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-blush font-display text-2xl text-deep">
              {initials(user.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-2xl">{user.fullName}</p>
              <p className="flex items-center gap-1 truncate text-sm text-white/70">
                {user.phone || user.email}
                {user.phoneVerified || user.emailVerified ? <BadgeCheck size={15} className="text-blush" /> : null}
              </p>
            </div>
          </div>
          <span className="pointer-events-none absolute -right-2 top-3 opacity-90">
            <BrandLogo size="md" href={null} />
          </span>
        </motion.section>
      ) : (
        <section className="mb-6 rounded-[30px] bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="font-display text-xl text-deep">Welcome, guest</p>
          <p className="mt-1 text-sm text-deep/55">Sign in to place orders and book events.</p>
          <Link href="/verify?returnTo=/account" className="mt-4 block">
            <Button fullWidth variant="dark">
              Sign in
            </Button>
          </Link>
        </section>
      )}

      <div className="mb-6 grid grid-cols-3 gap-2">
        {shortcuts.map((s, i) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={cn("rounded-[22px] p-3 text-center shadow-[var(--shadow-card)]", toneFor(i))}
            >
              <Icon size={18} className="mx-auto text-deep" />
              <p className="mt-2 text-[11px] font-semibold text-deep">{s.label}</p>
            </Link>
          );
        })}
      </div>

      <ul className="mb-4 overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-card)]">
        {rows.map((row) => {
          const Icon = row.icon;
          const inner = (
            <span className="flex items-center gap-3 px-4 py-3.5">
              <Icon size={18} className="text-tea" />
              <span className="flex-1 text-sm font-semibold text-deep">{row.label}</span>
              <ChevronRight size={16} className="text-deep/35" />
            </span>
          );
          return (
            <li key={row.href} className="border-b border-deep/5 last:border-0">
              {row.external ? (
                <a href={row.href} target="_blank" rel="noreferrer">
                  {inner}
                </a>
              ) : (
                <Link href={row.href}>{inner}</Link>
              )}
            </li>
          );
        })}
      </ul>

      {user ? (
        <Button variant="ghost" fullWidth leftIcon={<LogOut size={16} />} className="text-danger" onClick={() => void logout()}>
          Sign out
        </Button>
      ) : null}
    </div>
  );
}
