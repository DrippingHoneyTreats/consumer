"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarDays,
  Heart,
  HelpCircle,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Pencil,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { greetingForNow, whatsappLink } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "friend";
}

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const wa = whatsappLink(process.env.NEXT_PUBLIC_WHATSAPP ?? "2348000000000", "Hi DHT, I need some help");

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setEditing(false);
  }, [user?.id, user?.fullName]);

  async function saveProfile() {
    const next = fullName.trim();
    if (next.length < 2) {
      toast("Enter your name (at least 2 characters).");
      return;
    }
    setSaving(true);
    try {
      const updated = await apiClient.patch<User>("/me", { fullName: next });
      setUser(updated);
      setEditing(false);
      toast("Profile updated.");
    } catch {
      toast("Couldn’t save profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <div className="page-pad">
        <header className="mb-6">
          <h1 className="font-display text-[32px] leading-tight text-deep md:text-[40px]">Hey there 👋</h1>
          <p className="mt-1 text-sm text-deep/55 md:text-base">
            Sign in to manage your DHT account settings.
          </p>
        </header>
        <GuestAccountCard />
      </div>
    );
  }

  const verified = Boolean(user.phoneVerified || user.emailVerified);
  const contact = user.phone || user.email || "Not set";

  const menuItems = [
    {
      key: "profile",
      title: "Account settings",
      icon: UserRound,
      onClick: () => setEditing(true),
      href: null as string | null,
    },
    {
      key: "orders",
      title: "Order history",
      icon: ShoppingBag,
      href: "/orders",
      onClick: null as (() => void) | null,
    },
    {
      key: "addresses",
      title: "Delivery addresses",
      icon: MapPin,
      href: "/account/addresses",
      onClick: null,
    },
    {
      key: "events",
      title: "Event bookings",
      icon: CalendarDays,
      href: "/events",
      onClick: null,
    },
    {
      key: "help",
      title: "Help & catering",
      icon: HelpCircle,
      href: "/events",
      onClick: null,
    },
  ];

  return (
    <div className="page-pad">
      <div className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr] lg:items-start lg:gap-8">
        {/* —— Main —— */}
        <div className="space-y-6">
          <header>
            <h1 className="font-display text-[32px] leading-tight text-deep md:text-[40px]">
              Hey there, {firstName(user.fullName)}!
            </h1>
            <p className="mt-1 text-sm text-deep/50 md:text-base">
              {greetingForNow()} · Manage your profile and preferences
            </p>
          </header>

          {/* Soft gradient “info cards” like template card strip */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-deep">Your profile</h2>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-tea"
              >
                <Pencil size={12} /> Edit
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#3f5f46_0%,#6a8568_45%,#f0b7c0_100%)] p-5 text-white shadow-[var(--shadow-card)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Contact</p>
                <p className="mt-6 font-display text-xl leading-tight">{contact}</p>
                <p className="mt-8 text-xs text-white/60">Phone / email on file</p>
              </div>
              <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#d4a017_0%,#e8a48a_50%,#f0b7c0_100%)] p-5 text-deep shadow-[var(--shadow-card)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-deep/55">Account status</p>
                <p className="mt-6 flex items-center gap-1.5 font-display text-xl leading-tight">
                  {verified ? "Activated" : "Pending"}
                  {verified ? <BadgeCheck size={18} className="text-deep" /> : null}
                </p>
                <p className="mt-8 text-xs text-deep/55">Verification via OTP sign-in</p>
              </div>
            </div>
          </section>

          {/* Edit panel */}
          {editing ? (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-6"
            >
              <h2 className="font-display text-2xl text-deep">Account settings</h2>
              <p className="mt-1 text-sm text-deep/50">Update how your name appears across DHT.</p>
              <div className="mt-5 space-y-4">
                <Input
                  label="Display name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                  leftAddon={<UserRound size={18} className="text-tea" />}
                />
                <p className="text-xs text-deep/45">
                  Phone and email stay linked to your verified sign-in. Message us on WhatsApp to change contact.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="dark" loading={saving} onClick={() => void saveProfile()}>
                    Save changes
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={saving}
                    onClick={() => {
                      setFullName(user.fullName);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.section>
          ) : (
            <section className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-6">
              <h2 className="font-display text-2xl text-deep">Account details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DetailChip label="Full name" value={user.fullName} />
                <DetailChip label="Phone" value={user.phone || "Not set"} />
                <DetailChip label="Email" value={user.email || "Not set"} />
                <DetailChip label="Status" value={verified ? "Activated" : "Pending verify"} />
              </div>
            </section>
          )}
        </div>

        {/* —— Profile sidebar (template right rail) —— */}
        <aside className="rounded-[32px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-6 lg:sticky lg:top-4">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <span className="absolute -inset-2 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(240,183,192,0.9),rgba(106,133,104,0.35),transparent_70%)] blur-[2px]" aria-hidden />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blush font-display text-2xl text-deep ring-4 ring-white shadow-[var(--shadow-float)]">
                {initials(user.fullName)}
              </span>
            </div>
            <p className="font-display text-2xl text-deep">{user.fullName}</p>
            <div className="mt-4 grid w-full grid-cols-2 gap-3 border-b border-deep/5 pb-5">
              <div>
                <p className="text-[11px] text-deep/45">Contact</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-deep">{contact}</p>
              </div>
              <div>
                <p className="text-[11px] text-deep/45">Acc. status</p>
                <p className="mt-0.5 text-sm font-semibold text-deep">{verified ? "Activated" : "Pending"}</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-2.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const className =
                "pressable flex w-full items-center gap-3 rounded-[18px] bg-[#f6f4f1] px-3.5 py-3.5 text-left text-sm font-semibold text-deep transition hover:bg-[#efeae3]";
              const body = (
                <>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-tea shadow-sm">
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                  {item.title}
                </>
              );
              if (item.onClick) {
                return (
                  <button key={item.key} type="button" onClick={item.onClick} className={className}>
                    {body}
                  </button>
                );
              }
              return (
                <Link key={item.key} href={item.href!} className={className}>
                  {body}
                </Link>
              );
            })}
          </nav>

          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center gap-3 rounded-[22px] bg-[linear-gradient(135deg,#e8f5e9,#e0f2f1)] p-4"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-tea shadow-sm">
              <Heart size={20} className="fill-blush text-blush-deep" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-deep">Enjoying DHT?</span>
              <span className="mt-0.5 block text-xs text-deep/55">Tell us on WhatsApp</span>
            </span>
            <MessageCircle size={16} className="text-tea" />
          </a>

          <button
            type="button"
            onClick={() => void logout()}
            className="pressable mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] border border-danger/15 bg-white py-3 text-sm font-semibold text-danger"
          >
            <LogOut size={16} /> Log out
          </button>
        </aside>
      </div>
    </div>
  );
}

function GuestAccountCard() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#3f5f46_0%,#6a8568_50%,#f0b7c0_100%)] p-6 text-white shadow-[var(--shadow-float)] md:p-8"
      >
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-honey">
          Guest mode
        </span>
        <h2 className="mt-4 font-display text-[28px] leading-tight md:text-[34px]">Create an account or sign in</h2>
        <p className="mt-2 max-w-md text-sm text-white/75 md:text-base">
          Save addresses, track orders, and book dessert tables from one settings hub.
        </p>
        <Link href="/verify?returnTo=/account" className="mt-6 inline-flex">
          <Button variant="primary" className="bg-honey px-7 text-deep hover:bg-honey" leftIcon={<LogIn size={16} />}>
            Sign in / Sign up
          </Button>
        </Link>
      </motion.div>

      <aside className="rounded-[32px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-6">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-blush-soft text-deep ring-4 ring-white shadow-[var(--shadow-card)]">
            <UserRound size={32} />
          </span>
          <p className="mt-3 font-display text-2xl text-deep">Your profile</p>
          <p className="mt-1 text-sm text-deep/50">Sign in to unlock settings</p>
        </div>
        <div className="mt-5 space-y-2.5">
          {[
            { icon: ShoppingBag, title: "Order history" },
            { icon: MapPin, title: "Delivery addresses" },
            { icon: CalendarDays, title: "Event bookings" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-[18px] bg-[#f6f4f1] px-3.5 py-3.5 text-sm font-semibold text-deep/45"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
                  <Icon size={17} />
                </span>
                {item.title}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#f6f4f1] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-deep/40">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-deep">{value}</p>
    </div>
  );
}
