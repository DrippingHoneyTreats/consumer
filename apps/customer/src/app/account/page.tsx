"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Heart,
  HelpCircle,
  LogIn,
  LogOut,
  MapPin,
  ChevronRight,
  KeyRound,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { greetingForNow, contactLink } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { ProfileEditor } from "@/components/account/ProfileEditor";
import { InnerPage, PageSection } from "@/components/layout/InnerPage";
import { ArrowPill, type Feature } from "@/components/editorial/Editorial";
import { StickyActions } from "@/components/layout/StickyActions";

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
  const logout = useAuthStore((s) => s.logout);
  const wa = contactLink("Hi DHT, I need some help");

  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [user?.id]);

  if (!user) {
    return (
      <GuestAccount />
    );
  }

  const verified = Boolean(user.phoneVerified || user.emailVerified);

  const menuItems = [
    {
      key: "profile",
      title: "Account settings",
      icon: UserRound,
      onClick: () => {
        setEditing(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
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

  const shortcuts = menuItems.filter((m) => m.href) as { key: string; title: string; icon: typeof UserRound; href: string }[];
  const edit = () => {
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <InnerPage
      tabbed
      help={false}
      eyebrow={greetingForNow()}
      title={`Hey, ${firstName(user.fullName)}!`}
      subtitle="Manage your profile and preferences."
      right={
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blush font-display text-xl text-deep ring-4 ring-white/40">
          {initials(user.fullName)}
        </span>
      }
      facts={[
        { icon: Phone, value: user.phone || "Not set", label: "WhatsApp" },
        { icon: Mail, value: user.email || "Not set", label: user.email && !user.emailVerified ? "Email · not verified" : "Email" },
        { icon: KeyRound, value: user.hasPin ? "Set" : "Not set", label: "Sign-in PIN" },
        { icon: BadgeCheck, value: verified ? "Activated" : "Pending", label: "Account status" },
      ]}
      actions={
        <>
          <Button fullWidth variant="dark" leftIcon={<Pencil size={15} />} onClick={edit}>
            Edit profile
          </Button>
          <Button fullWidth variant="tertiary" leftIcon={<LogOut size={15} />} className="text-danger" onClick={() => void logout()}>
            Log out
          </Button>
        </>
      }
    >
      <PageSection
        title="Your details"
        action={
          !editing ? (
            <button type="button" onClick={edit} className="inline-flex items-center gap-1 text-xs font-bold text-tea">
              <Pencil size={12} /> Edit
            </button>
          ) : null
        }
      >
        {editing ? (
          <ProfileEditor user={user} onDone={() => setEditing(false)} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailChip label="Full name" value={user.fullName} />
            <DetailChip label="WhatsApp" value={user.phone || "Not set"} />
            <DetailChip label="Email" value={user.email ? `${user.email}${user.emailVerified ? "" : " · not verified"}` : "Not set"} />
            <DetailChip label="Sign-in PIN" value={user.hasPin ? "Set" : "Not set"} />
          </div>
        )}
      </PageSection>

      <PageSection title="Shortcuts">
        <nav className="grid gap-2.5 sm:grid-cols-2">
          {shortcuts.map(({ key, title, icon: Icon, href }) => (
            <Link
              key={key}
              href={href}
              className="pressable flex items-center gap-3 rounded-[18px] bg-[#f6f4f1] px-3.5 py-3 text-sm font-semibold text-deep transition hover:bg-[#efeae3]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-tea shadow-sm">
                <Icon size={17} strokeWidth={1.8} />
              </span>
              {title}
              <ChevronRight size={16} className="ml-auto text-deep/30" />
            </Link>
          ))}
        </nav>
      </PageSection>

      <PageSection title="Say hello">
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-[22px] bg-[linear-gradient(135deg,#e8f5e9,#e0f2f1)] p-4"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Heart size={19} className="fill-blush text-blush-deep" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-deep">Enjoying DHT?</span>
            <span className="mt-0.5 block text-xs text-deep/55">Tell us, or ask for help, on WhatsApp</span>
          </span>
          <MessageCircle size={16} className="text-tea" />
        </a>
      </PageSection>

      <PageSection>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-deep/45">
            <Link href="/about" className="font-semibold hover:text-tea">About</Link>
            {" · "}
            <Link href="/menu" className="font-semibold hover:text-tea">Menu & prices</Link>
            {" · "}
            <Link href="/privacy" className="font-semibold hover:text-tea">Privacy</Link>
            {" · "}
            <Link href="/terms" className="font-semibold hover:text-tea">Terms</Link>
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="pressable inline-flex items-center gap-2 rounded-full border border-danger/20 px-4 py-2 text-sm font-semibold text-danger md:hidden"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </PageSection>
    </InnerPage>
  );
}

const ACCOUNT_PERKS: Feature[] = [
  { title: "Order history", text: "Every order and receipt in one place. Reorder favourites in a tap.", icon: ShoppingBag },
  { title: "Live tracking", text: "Follow your order from our oven to your door.", icon: Truck },
  { title: "Saved addresses", text: "Check out faster next time.", icon: MapPin },
  { title: "Event bookings", text: "See quotes and updates for your dessert tables.", icon: CalendarDays },
  { title: "WhatsApp updates", text: "We message you as your order moves.", icon: MessageCircle },
  { title: "Quick sign-in", text: "Your WhatsApp number and a 4-digit PIN. No passwords.", icon: KeyRound },
];

function GuestAccount() {
  const signIn = "/verify?returnTo=/account";
  return (
    <InnerPage
      tabbed
      eyebrow="Guest mode"
      title="Your account"
      subtitle="Sign in to track orders, save addresses and book dessert tables."
      hero={
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/25">
          <UserRound size={24} />
        </span>
      }
      facts={[
        { icon: Phone, value: "WhatsApp + PIN", label: "Quick sign-in, no passwords" },
        { icon: Mail, value: "Email or Google", label: "Other ways to sign in" },
        { icon: ShieldCheck, value: "Private & secure", label: "We never share your details" },
      ]}
      actions={
        <Link href={signIn} className="block">
          <Button fullWidth variant="dark" leftIcon={<LogIn size={16} />}>
            Sign in / Sign up
          </Button>
        </Link>
      }
    >
      <PageSection title="Get started">
        <div className="rounded-[24px] bg-[#f7f4ef] p-5 md:p-6">
          <p className="font-display text-2xl font-semibold text-deep md:text-[28px]">Create an account or sign in</p>
          <p className="mt-2 max-w-md text-sm text-deep/60">
            It takes seconds with your WhatsApp number. Your cart stays just as it is.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ArrowPill href={signIn}>Sign in / Sign up</ArrowPill>
            <Link href="/pastries" className="text-sm font-semibold text-tea">
              Keep browsing
            </Link>
          </div>
        </div>
      </PageSection>

      <PageSection title="What you get with an account">
        <ul className="grid gap-3 sm:grid-cols-2">
          {ACCOUNT_PERKS.map(({ title, text, icon: Icon }) => (
            <li key={title} className="flex items-start gap-3 rounded-[20px] bg-[#f7f4ef] p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-tea shadow-sm">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-deep">{title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-deep/55">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection>
        <p className="text-xs text-deep/45">
          <Link href="/about" className="font-semibold hover:text-tea">About</Link>
          {" · "}
          <Link href="/menu" className="font-semibold hover:text-tea">Menu & prices</Link>
          {" · "}
          <Link href="/privacy" className="font-semibold hover:text-tea">Privacy Policy</Link>
          {" · "}
          <Link href="/terms" className="font-semibold hover:text-tea">Terms of Service</Link>
        </p>
      </PageSection>

      <StickyActions aboveTabs mobileOnly>
        <Link href={signIn}>
          <Button fullWidth variant="dark" leftIcon={<LogIn size={16} />} className="shadow-[var(--shadow-float)]">
            Sign in / Sign up
          </Button>
        </Link>
      </StickyActions>
    </InnerPage>
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
