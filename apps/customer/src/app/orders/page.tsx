"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, History, MapPin, PartyPopper, RotateCcw, ShoppingBag } from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import { formatNgn } from "@/lib/format";
import { EVENT_PLACEHOLDER, ITEM_PLACEHOLDER } from "@/lib/placeholders";
import type { Order } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "@/components/ui/Toast";

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
    return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function OrderCard({ order, tab, index, onReorder }: { order: Order; tab: Tab; index: number; onReorder: () => void }) {
  const thumbs = order.items.slice(0, 3);
  const extra = order.items.length - thumbs.length;
  const paid = order.status !== "draft" && order.status !== "pending_payment";

  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="overflow-hidden rounded-[24px] border border-deep/5 bg-white shadow-[var(--shadow-card)]"
    >
      <Link href={`/orders/${order.id}`} className="pressable flex items-center gap-3 p-3">
        <div className="flex shrink-0 -space-x-3">
          {thumbs.map((line) => (
            <span
              key={line.id}
              className="relative h-12 w-12 overflow-hidden rounded-2xl bg-blush-soft ring-[3px] ring-white"
            >
              <Image
                src={line.item?.images?.[0] || ITEM_PLACEHOLDER}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
                unoptimized
              />
            </span>
          ))}
          {extra > 0 ? (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-soft text-xs font-bold text-deep ring-[3px] ring-white">
              +{extra}
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-deep">#{order.orderNo}</p>
            <span className="text-[11px] text-deep/45">{formatDate(order.createdAt)}</span>
          </div>
          <p className="mt-0.5 font-display text-lg font-semibold text-deep">{formatNgn(order.total)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge status={order.status} />
          <ChevronRight size={18} className="text-deep/30" />
        </div>
      </Link>

      {(tab === "ongoing" && paid) || tab === "completed" ? (
        <div className="flex gap-2 border-t border-deep/5 bg-off-white/60 px-3 py-2.5">
          {tab === "ongoing" ? (
            <Link
              href={`/orders/`}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-deep py-2.5 text-xs font-semibold text-white"
            >
              <MapPin size={14} /> Track order
            </Link>
          ) : (
            <button
              type="button"
              onClick={onReorder}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-blush py-2.5 text-xs font-semibold text-deep"
            >
              <RotateCcw size={14} /> Reorder
            </button>
          )}
        </div>
      ) : null}
    </motion.li>
  );
}

function GuestCartCard() {
  const guestItems = useCartStore((s) => s.guestItems);
  const count = guestItems.reduce((s, i) => s + i.qty, 0);
  const total = guestItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const thumbs = guestItems.slice(0, 3);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        href="/orders/cart"
        className="pressable flex items-center gap-3 rounded-[24px] border border-deep/5 bg-white p-3 shadow-[var(--shadow-card)]"
      >
        <div className="flex shrink-0 -space-x-3">
          {thumbs.map((line) => (
            <span
              key={`${line.itemId}-${line.variantId ?? ""}`}
              className="relative h-12 w-12 overflow-hidden rounded-2xl bg-blush-soft ring-[3px] ring-white"
            >
              <Image src={line.image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="48px" unoptimized />
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-deep">
            {count} item{count === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold text-deep">{formatNgn(total)}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge status="draft" />
          <ChevronRight size={18} className="text-deep/30" />
        </div>
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
      <div className="page-pad space-y-5">
        <PageHeader eyebrow="Your treats" title="Orders" subtitle="Everything you've ordered, in one place." />
        {guestCount ? (
          <section>
            <p className="mb-2 pl-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/45">Ongoing</p>
            <GuestCartCard />
          </section>
        ) : (
          <EmptyState
            title={empty.ongoing.title}
            description={empty.ongoing.description}
            actionHref="/pastries"
            actionLabel="Order now"
            icon={<ShoppingBag size={28} />}
          />
        )}
        <Link
          href="/verify?returnTo=/orders"
          className="pressable flex items-center gap-3 rounded-[24px] bg-sage-soft p-3.5"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-tea">
            <History size={19} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-deep">Ordered with us before?</span>
            <span className="block text-xs text-deep/55">Log in to see past orders and track deliveries</span>
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
      <SegmentedTabs id="orders" tabs={tabs} value={tab} onChange={setTab} className="mb-5" />

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
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-24 rounded-[24px]" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              title={copy.title}
              description={copy.description}
              actionHref={copy.action ? "/pastries" : undefined}
              actionLabel={copy.action ? "Order now" : undefined}
              icon={<ShoppingBag size={28} />}
            />
          ) : (
            <ul className="space-y-3">
              {orders.map((order, i) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  tab={tab}
                  index={i}
                  onReorder={() => void reorder(order.id)}
                />
              ))}
            </ul>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6">
        <EventsNudge />
      </div>
    </div>
  );
}

function EventsNudge() {
  return (
    <Link
      href="/events"
      className="pressable relative flex items-center gap-4 overflow-hidden rounded-[26px] bg-deep p-4 text-white shadow-[var(--shadow-float)]"
    >
      <span className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[20px] ring-2 ring-white/20">
        <Image src={EVENT_PLACEHOLDER} alt="" fill className="object-cover" sizes="64px" unoptimized />
      </span>
      <span className="relative flex-1">
        <span className="block font-display text-lg leading-tight">Feeding a crowd?</span>
        <span className="block text-xs text-white/65">Let us cater your next celebration</span>
      </span>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-blush text-deep">
        <PartyPopper size={16} />
      </span>
    </Link>
  );
}
