"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Lock, MapPin, MessageCircle, Plus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { formatNgn, statusLabel, whatsappLink } from "@/lib/format";
import { formatOrderDate, isDraftStatus, isOngoingStatus } from "@/lib/order-status";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import type { Order } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyActions } from "@/components/layout/StickyActions";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Button } from "@/components/ui/Button";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { textareaClass } from "@/components/ui/Input";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { useCartActions } from "@/hooks/useCartActions";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/cn";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const setDraft = useCartStore((s) => s.setDraft);
  const orderNote = useCartStore((s) => s.orderNote);
  const setOrderNote = useCartStore((s) => s.setOrderNote);
  const { setQty } = useCartActions();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteDirty, setNoteDirty] = useState(false);

  const load = async () => {
    try {
      const res = await apiClient.get<Order | { data: Order }>(`/orders/${id}`);
      const o = unwrapData(res) ?? (res as Order);
      setOrder(o);
      if (isDraftStatus(o.status)) {
        setDraft(o);
        if (o.notes && !noteDirty) setOrderNote(o.notes);
      }
    } catch {
      /* keep the last loaded order */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function onNoteChange(value: string) {
    setOrderNote(value);
    setNoteDirty(true);
  }

  async function persistNote() {
    if (!order || !isDraftStatus(order.status)) return;
    try {
      await apiClient.patch(`/orders/${order.id}`, { notes: orderNote.trim() || null });
    } catch {
      /* local note still kept for checkout */
    }
  }

  const isDraft = order ? isDraftStatus(order.status) : false;
  const canTrack = order ? isOngoingStatus(order.status) || order.status === "delivered" : false;

  if (loading) {
    return (
      <div className="page-pad">
        <PageSkeleton variant="detail" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="page-pad">
        <PageHeader title="Order" backHref="/orders" />
        <OfflineState
          onRetry={() => {
            setLoading(true);
            void load();
          }}
        />
      </div>
    );
  }

  const created = formatOrderDate(order.createdAt);
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
  const wa = whatsappLink(
    process.env.NEXT_PUBLIC_WHATSAPP ?? "2348000000000",
    `Hi DHT, I need help with order #${order.orderNo}`,
  );

  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+150px)]">
      <PageHeader
        eyebrow={isDraft ? "Not paid yet" : statusLabel(order.status)}
        title={isDraft ? "Current order" : `Order #${order.orderNo}`}
        subtitle={isDraft ? "Adjust items, add a note, then pay." : `Placed ${created}`}
        backHref="/orders"
      />

      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        {order.items.length === 0 ? (
          <EmptyState
            title="No item in this order"
            description="Add something sweet to get started."
            actionHref="/pastries"
            actionLabel="Add an order"
          />
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-card)] ring-1 ring-deep/5"
          >
            <header className="flex items-start justify-between gap-3 border-b border-deep/5 bg-gradient-to-br from-blush-soft/80 via-white to-cream px-4 py-4 md:px-6 md:py-5">
              <div className="min-w-0">
                <p className="font-display text-xl text-deep md:text-2xl">Order # {order.orderNo}</p>
                <p className="mt-0.5 text-xs text-deep/50">
                  {itemCount} item{itemCount === 1 ? "" : "s"} · {isDraft ? "draft" : created}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-deep ring-1 ring-deep/5">
                  {statusLabel(order.status)}
                </span>
                <p className="mt-2 font-display text-2xl font-semibold text-deep">{formatNgn(order.total)}</p>
              </div>
            </header>

            {!isDraft ? (
              <div className="border-b border-deep/5 px-4 py-4 md:px-6">
                <OrderProgress status={order.status} compact />
                {canTrack ? (
                  <Link
                    href={`/orders/${order.id}/track`}
                    className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-tea"
                  >
                    <MapPin size={13} /> Open full tracking
                  </Link>
                ) : null}
              </div>
            ) : null}

            <ul>
              <AnimatePresence initial={false}>
                {order.items.map((line, i) => (
                  <motion.li
                    key={line.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn("flex items-center gap-3 px-4 py-3.5 md:px-6", i > 0 && "border-t border-deep/5")}
                  >
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] bg-cream">
                      <Image
                        src={line.item?.images?.[0] || ITEM_PLACEHOLDER}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-deep">{line.nameSnapshot}</p>
                      <p className="text-xs text-deep/50">
                        {formatNgn(line.unitPrice)} each ·{" "}
                        <span className="font-semibold text-deep">{formatNgn(line.unitPrice * line.qty)}</span>
                      </p>
                      {line.note ? <p className="mt-0.5 truncate text-[11px] italic text-tea">“{line.note}”</p> : null}
                    </div>
                    {isDraft ? (
                      <QtyStepper
                        size="sm"
                        value={line.qty}
                        min={0}
                        max={line.item?.maxQty ?? 99}
                        onChange={(q) => void setQty(order.id, line.id, q).then(load)}
                      />
                    ) : (
                      <span className="rounded-full bg-off-white px-3 py-1 text-sm font-semibold">×{line.qty}</span>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <div className="border-t border-dashed border-deep/10 px-4 py-4 md:px-6">
              {isDraft ? (
                <>
                  <Link
                    href="/pastries"
                    className="pressable mb-4 flex items-center justify-center gap-2 rounded-full border border-dashed border-deep/15 py-3 text-sm font-semibold text-tea"
                  >
                    <Plus size={16} /> Add more pastries
                  </Link>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-deep">Note for rider or baker</span>
                    <textarea
                      value={orderNote}
                      onChange={(e) => onNoteChange(e.target.value)}
                      onBlur={() => void persistNote()}
                      rows={2}
                      placeholder="e.g. Write Happy Birthday · call on arrival"
                      className={textareaClass}
                    />
                  </label>
                </>
              ) : order.notes ? (
                <p className="text-sm text-deep/70">
                  <span className="font-semibold text-deep">Note: </span>
                  {order.notes}
                </p>
              ) : null}
            </div>

            <footer className="space-y-2 border-t border-deep/5 bg-off-white/60 px-4 py-4 text-sm md:px-6">
              <div className="flex justify-between text-deep/70">
                <span>Subtotal</span>
                <span>{formatNgn(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-deep/70">
                <span>Delivery</span>
                <span>
                  {order.deliveryFee > 0 || order.addressSnapshot
                    ? formatNgn(order.deliveryFee)
                    : "Calculated at checkout"}
                </span>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-tea">
                  <span>Discount</span>
                  <span>-{formatNgn(order.discount)}</span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between border-t border-dashed border-deep/10 pt-2 font-semibold text-deep">
                <span>Total amount</span>
                <span className="font-display text-xl">{formatNgn(order.total)}</span>
              </div>
            </footer>
          </motion.article>
        )}

        <aside className="hidden space-y-3 lg:sticky lg:top-24 lg:block">
          <div className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
            <p className="text-xs text-deep/50">{isDraft ? "Ready when you are" : "Order total"}</p>
            <p className="mt-1 font-display text-3xl text-deep">{formatNgn(order.total)}</p>
            {isDraft && order.items.length > 0 ? (
              <>
                <Link href={`/checkout/address?orderId=${order.id}`} className="mt-4 block">
                  <Button fullWidth variant="dark" leftIcon={<Lock size={16} />}>
                    Proceed to pay · {formatNgn(order.total)}
                  </Button>
                </Link>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-deep/55">
                  <CreditCard size={12} /> Secure payment · Card, transfer, USSD
                </p>
              </>
            ) : null}
            {canTrack ? (
              <Link href={`/orders/${order.id}/track`} className="mt-3 block">
                <Button fullWidth variant="dark" leftIcon={<MapPin size={16} />}>
                  Track order
                </Button>
              </Link>
            ) : null}
            {!isDraft ? (
              <a href={wa} className="mt-3 block">
                <Button fullWidth variant="secondary" leftIcon={<MessageCircle size={16} />}>
                  Chat with us
                </Button>
              </a>
            ) : null}
          </div>
        </aside>
      </div>

      {isDraft && order.items.length > 0 ? (
        <StickyActions aboveTabs className="lg:hidden">
          <div className="glass rounded-[26px] border border-white/80 p-3 shadow-[var(--shadow-float)]">
            <Link href={`/checkout/address?orderId=${order.id}`}>
              <Button fullWidth variant="dark" leftIcon={<Lock size={16} />}>
                Proceed to pay · {formatNgn(order.total)}
              </Button>
            </Link>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-deep/55">
              <CreditCard size={12} /> Secure payment methods · Card, transfer, USSD
            </p>
          </div>
        </StickyActions>
      ) : canTrack ? (
        <StickyActions aboveTabs className="lg:hidden">
          <Link href={`/orders/${order.id}/track`}>
            <Button fullWidth variant="dark" leftIcon={<MapPin size={16} />} className="shadow-[var(--shadow-float)]">
              Track order
            </Button>
          </Link>
        </StickyActions>
      ) : null}
    </div>
  );
}
