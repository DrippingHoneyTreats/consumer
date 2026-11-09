"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronRight, History, MapPin, PartyPopper, RotateCcw, ShoppingBag } from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import { formatNgn, statusLabel } from "@/lib/format";
import { EVENT_PLACEHOLDER, ITEM_PLACEHOLDER, LOGO } from "@/lib/placeholders";
import type { Order } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type Tab = "ongoing" | "completed" | "cancelled";

const tabs: { key: Tab; label: string }[] = [
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const empty: Record<Tab, { title: string; description: string; action?: boolean }> = {
  ongoing: { title: "No ongoing order", description: "Hungry? Your next treat is a tap away.", action: true },
  completed: { title: "No completed orders yet", description: "Delivered orders will show up here." },
  cancelled: { title: "No cancelled orders", description: "Nothing cancelled. Sweet!" },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function statusTone(status: string) {
  if (status === "delivered" || status === "completed") return "bg-sage-soft text-deep";
  if (status === "cancelled" || status === "payment_failed") return "bg-blush-soft text-blush-deep";
  if (status === "preparing" || status === "accepted" || status === "out_for_delivery") return "bg-honey-soft text-deep";
  return "bg-off-white text-deep/70";
}

function OrderCard({ order, tab, index, onReorder }: { order: Order; tab: Tab; index: number; onReorder: () => void }) {
  const thumbs = order.items.slice(0, 4);
  const extra = order.items.length - thumbs.length;
  const paid = order.status !== "draft" && order.status !== "pending_payment";
  const place =
    typeof order.addressSnapshot?.formattedAddress === "string"
      ? order.addressSnapshot.formattedAddress
      : typeof order.addressSnapshot?.city === "string"
        ? order.addressSnapshot.city
        : "Lagos";

  return (
    <motion.li
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: index * 0.06, ease: [0.33, 0, 0.2, 1] }}
      className="overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-card)] ring-1 ring-deep/5"
    >
      <Link href={`/orders/${order.id}`} className="pressable block p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg text-deep md:text-xl">#{order.orderNo}</p>
            <p className="mt-0.5 text-xs text-deep/45">{formatDate(order.createdAt)}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", statusTone(order.status))}>
            {statusLabel(order.status)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-deep/40">Total</p>
            <p className="font-display text-2xl font-semibold text-deep">{formatNgn(order.total)}</p>
          </div>
          <p className="flex max-w-[55%] items-center gap-1 truncate text-xs text-deep/55">
            <MapPin size={12} className="shrink-0 text-tea" />
            <span className="truncate">{place}</span>
          </p>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {thumbs.map((line) => (
            <span
              key={line.id}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] bg-cream ring-2 ring-white md:h-16 md:w-16 md:rounded-[18px]"
            >
              <Image
                src={line.item?.images?.[0] || ITEM_PLACEHOLDER}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            </span>
          ))}
          {extra > 0 ? (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-sage-soft text-xs font-bold text-deep ring-2 ring-white md:h-16 md:w-16">
              +{extra}
            </span>
          ) : null}
        </div>
      </Link>

      {(tab === "ongoing" && paid) || tab === "completed" ? (
        <div className="flex gap-2 border-t border-deep/5 bg-off-white/70 px-4 py-3 md:px-5">
          {tab === "ongoing" ? (
            <Link
              href={`/orders/${order.id}`}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-deep py-3 text-xs font-semibold text-white"
            >
              <MapPin size={14} /> Track order
            </Link>
          ) : (
            <button
              type="button"
              onClick={onReorder}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-honey py-3 text-xs font-semibold text-deep"
            >
              <RotateCcw size={14} /> Reorder
            </button>
          )}
          <Link
            href={`/orders/${order.id}`}
            className="pressable flex h-11 w-11 items-center justify-center rounded-full bg-white text-deep shadow-sm"
            aria-label="Order details"
          >
            <ChevronRight size={18} />
          </Link>
        </div>
      ) : null}
    </motion.li>
  );
}

function GuestCartCard() {
  const guestItems = useCartStore((s) => s.guestItems);
  const count = guestItems.reduce((s, i) => s + i.qty, 0);
  const total = guestItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const thumbs = guestItems.slice(0, 4);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        href="/orders/cart"
        className="pressable block overflow-hidden rounded-[28px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg text-deep md:text-xl">Draft cart</p>
            <p className="mt-0.5 text-xs text-deep/45">
              {count} item{count === 1 ? "" : "s"} · not checked out yet
            </p>
          </div>
          <span className="rounded-full bg-honey-soft px-2.5 py-1 text-[11px] font-bold text-deep">In cart</span>
        </div>
        <p className="mt-3 font-display text-2xl font-semibold text-deep">{formatNgn(total)}</p>
        <div className="mt-4 flex gap-2">
          {thumbs.map((line) => (
            <span
              key={`${line.itemId}-${line.variantId ?? ""}`}
              className="relative h-14 w-14 overflow-hidden rounded-[16px] bg-cream ring-2 ring-white"
            >
              <Image src={line.image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="56px" unoptimized />
            </span>
          ))}
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-tea">
          Review cart <ArrowRight size={13} />
        </span>
      </Link>
    </motion.div>
  );
}

export default function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const guestCount = useCartStore((s) => s.guestItems.length);
  const [tab, setTab] = useState<Tab>("ongoing");
  const [orders, setOrders] = useState<Order[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);
  const loading = state === "loading";

  useEffect(() => {
    if (!user) return;
    setState("loading");
    void apiClient
      .get<Order[] | { data: Order[] }>("/orders", { tab })
      .then((res) => {
        setOrders(asArray(res));
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [user, tab, nonce]);

  async function reorder(id: string) {
    try {
      const order = await apiClient.post<Order>(`/orders/${id}/reorder`);
      toast("Added to your draft order.");
      window.location.href = `/orders/${order.id}`;
    } catch {
      toast("Could not reorder.");
    }
  }

  if (!user) {
    return (
      <div className="page-pad space-y-5 md:space-y-7">
        <PageHeader eyebrow="Your treats" title="Orders" subtitle="Everything you've ordered, in one place." />
        {guestCount ? (
          <section>
            <p className="mb-3 pl-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/45">Ongoing</p>
            <GuestCartCard />
          </section>
        ) : (
          <EmptyState
            image={LOGO}
            title={empty.ongoing.title}
            description={empty.ongoing.description}
            actionHref="/pastries"
            actionLabel="Order now"
            icon={<ShoppingBag size={28} />}
          />
        )}
        <Link
          href="/verify?returnTo=/orders"
          className="pressable flex items-center gap-3 rounded-[28px] bg-sage-soft p-4 md:p-5"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-tea shadow-sm">
            <History size={20} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-deep md:text-base">Ordered with us before?</span>
            <span className="block text-xs text-deep/55 md:text-sm">Log in to see past orders and track deliveries</span>
          </span>
          <ChevronRight size={18} className="text-deep/30" />
        </Link>
        <EventsNudge />
      </div>
    );
  }

  const copy = empty[tab];

  return (
    <div className="page-pad">
      <PageHeader eyebrow="Your treats" title="Orders" subtitle="Track, pay and reorder your favourites." />
      <SegmentedTabs id="orders" tabs={tabs} value={tab} onChange={setTab} className="mb-5 md:mb-6" />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab + state}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          {state === "error" ? (
            <OfflineState onRetry={() => setNonce((n) => n + 1)} />
          ) : loading ? (
            <ColumnLoader columns={1} count={4} aspect="h-28 aspect-auto" />
          ) : orders.length === 0 ? (
            <EmptyState
              image={LOGO}
              title={copy.title}
              description={copy.description}
              actionHref={copy.action ? "/pastries" : undefined}
              actionLabel={copy.action ? "Order now" : undefined}
              icon={<ShoppingBag size={28} />}
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-2">
              {orders.map((order, i) => (
                <OrderCard key={order.id} order={order} tab={tab} index={i} onReorder={() => void reorder(order.id)} />
              ))}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 md:mt-8">
        <EventsNudge />
      </div>
    </div>
  );
}

function EventsNudge() {
  return (
    <Link
      href="/events"
      className="pressable relative flex items-center gap-4 overflow-hidden rounded-[28px] bg-deep p-4 text-white shadow-[var(--shadow-float)] md:p-5"
    >
      <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[20px] ring-2 ring-white/20 md:h-20 md:w-20">
        <Image src={EVENT_PLACEHOLDER} alt="" fill className="object-cover" sizes="80px" unoptimized />
      </span>
      <span className="relative flex-1">
        <span className="block font-display text-lg leading-tight md:text-2xl">Feeding a crowd?</span>
        <span className="block text-xs text-white/65 md:text-sm">Let us cater your next celebration</span>
      </span>
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-honey text-deep md:h-11 md:w-11">
        <PartyPopper size={16} />
      </span>
    </Link>
  );
}
