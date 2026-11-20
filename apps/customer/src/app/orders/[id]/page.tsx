"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { BadgeCheck, Bike, CalendarDays, CreditCard, Lock, MapPin, MessageCircle, Plus, ShoppingBag, Store } from "lucide-react";
import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { formatNgn, contactLink } from "@/lib/format";
import { formatOrderDate, isDraftStatus, isOngoingStatus, deliveryLineLabel, orderStatusLabel } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyActions } from "@/components/layout/StickyActions";
import { InnerPage, PageSection, type PanelFact } from "@/components/layout/InnerPage";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Button } from "@/components/ui/Button";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { textareaClass } from "@/components/ui/Input";
import { CartLineRow } from "@/components/orders/CartLineRow";
import { useLineEditor } from "@/components/orders/LineEditor";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { useCartActions } from "@/hooks/useCartActions";
import { useCartStore } from "@/store/cart-store";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const setDraft = useCartStore((s) => s.setDraft);
  const orderNote = useCartStore((s) => s.orderNote);
  const setOrderNote = useCartStore((s) => s.setOrderNote);
  const { setQty } = useCartActions();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteDirty, setNoteDirty] = useState(false);
  const editor = useLineEditor({ orderId: id, onSaved: () => void load() });

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
  const wa = contactLink(`Hi DHT, I need help with order #${order.orderNo}`,
  );

  const payHref = `/checkout/address?orderId=${order.id}`;
  const facts: PanelFact[] = [
    { icon: BadgeCheck, value: orderStatusLabel(order), label: "Status" },
    { icon: ShoppingBag, value: `${itemCount} item${itemCount === 1 ? "" : "s"}`, label: "In this order" },
    { icon: CalendarDays, value: isDraft ? "Not placed yet" : created, label: "Placed" },
    {
      icon: order.fulfillment === "pickup" ? Store : Bike,
      value: order.fulfillment === "pickup" ? "Pickup" : order.fulfillment === "delivery" ? "Delivery" : "Choose at checkout",
      label: "How you get it",
    },
  ];

  return (
    <InnerPage
      tabbed
      className="pb-[calc(var(--tab-h)+var(--safe-bottom)+150px)] md:pb-[calc(var(--tab-h)+var(--safe-bottom)+32px)]"
      eyebrow={isDraft ? "Not paid yet" : orderStatusLabel(order)}
      title={isDraft ? "Current order" : `Order #${order.orderNo}`}
      subtitle={isDraft ? "Adjust items, add a note, then pay." : `Placed ${created}`}
      backHref="/orders"
      help={`Hi DHT, I need help with order #${order.orderNo}`}
      hero={
        <div>
          <p className="text-xs text-white/70">{isDraft ? "Order total" : "You paid"}</p>
          <p className="font-display text-3xl">{formatNgn(order.total)}</p>
        </div>
      }
      facts={facts}
      actions={
        <>
          {isDraft && order.items.length > 0 ? (
            <>
              <Link href={payHref} className="block">
                <Button fullWidth variant="dark" leftIcon={<Lock size={16} />}>
                  Proceed to pay
                </Button>
              </Link>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-deep/55">
                <CreditCard size={12} /> Card, transfer or USSD
              </p>
            </>
          ) : null}
          {canTrack ? (
            <Link href={`/orders/${order.id}/track`} className="block">
              <Button fullWidth variant="dark" leftIcon={<MapPin size={16} />}>
                Track order
              </Button>
            </Link>
          ) : null}
          {!isDraft ? (
            <a href={wa} className="block">
              <Button fullWidth variant="tertiary" leftIcon={<MessageCircle size={16} />}>
                Chat with us
              </Button>
            </a>
          ) : null}
        </>
      }
    >
      {order.items.length === 0 ? (
        <EmptyState
          title="No item in this order"
          description="Add something sweet to get started."
          actionHref="/pastries"
          actionLabel="Add an order"
        />
      ) : (
        <>
          {!isDraft ? (
            <PageSection
              title="Progress"
              action={
                canTrack ? (
                  <Link href={`/orders/${order.id}/track`} className="flex items-center gap-1 text-xs font-bold text-tea">
                    <MapPin size={13} /> Full tracking
                  </Link>
                ) : null
              }
            >
              <OrderProgress status={order.status} fulfillment={order.fulfillment} compact />
            </PageSection>
          ) : null}

          <PageSection
            title={`Items (${itemCount})`}
            action={
              isDraft ? (
                <Link href="/pastries" className="flex items-center gap-1 text-xs font-bold text-tea">
                  <Plus size={13} /> Add more
                </Link>
              ) : null
            }
          >
            <ul className="-mx-4 sm:-mx-5 md:-mx-6">
              <AnimatePresence initial={false}>
                {order.items.map((line) => (
                  <CartLineRow
                    key={line.id}
                    image={line.item?.images?.[0]}
                    name={line.nameSnapshot}
                    unitPrice={line.unitPrice}
                    qty={line.qty}
                    note={line.note}
                    onEdit={
                      isDraft
                        ? () => void editor.edit({ itemId: line.itemId, variantId: line.variantId, qty: line.qty, lineId: line.id, image: line.item?.images?.[0] })
                        : undefined
                    }
                    editLabel={line.variantId ? "Change size" : "Edit"}
                    onRemove={
                      isDraft
                        ? () => {
                            setOrder((o) => (o ? { ...o, items: o.items.filter((i) => i.id !== line.id) } : o));
                            void setQty(order.id, line.id, 0).then(load);
                          }
                        : undefined
                    }
                  >
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
                  </CartLineRow>
                ))}
              </AnimatePresence>
            </ul>
          </PageSection>

          {isDraft ? (
            <PageSection title="Note for rider or baker">
              <textarea
                value={orderNote}
                onChange={(e) => onNoteChange(e.target.value)}
                onBlur={() => void persistNote()}
                rows={2}
                aria-label="Note for rider or baker"
                placeholder="e.g. Write Happy Birthday · call on arrival"
                className={textareaClass}
              />
            </PageSection>
          ) : order.notes ? (
            <PageSection title="Your note">
              <p className="text-sm text-deep/70">{order.notes}</p>
            </PageSection>
          ) : null}

          <PageSection title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-deep/70">
                <dt>Subtotal</dt>
                <dd>{formatNgn(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-deep/70">
                <dt>Delivery</dt>
                <dd className="text-right">{deliveryLineLabel(order)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-tea">
                  <dt>Discount</dt>
                  <dd>-{formatNgn(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between border-t border-dashed border-deep/10 pt-3 font-semibold text-deep">
                <dt>Total</dt>
                <dd className="font-display text-2xl">{formatNgn(order.total)}</dd>
              </div>
            </dl>
          </PageSection>
        </>
      )}

      {isDraft && order.items.length > 0 ? (
        <StickyActions aboveTabs mobileOnly>
          <div className="glass rounded-[26px] border border-white/80 p-3 shadow-[var(--shadow-float)]">
            <Link href={payHref}>
              <Button fullWidth variant="dark" leftIcon={<Lock size={16} />}>
                Proceed to pay · {formatNgn(order.total)}
              </Button>
            </Link>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-deep/55">
              <CreditCard size={12} /> Secure payment · Card, transfer, USSD
            </p>
          </div>
        </StickyActions>
      ) : canTrack ? (
        <StickyActions aboveTabs mobileOnly>
          <Link href={`/orders/${order.id}/track`}>
            <Button fullWidth variant="dark" leftIcon={<MapPin size={16} />} className="shadow-[var(--shadow-float)]">
              Track order
            </Button>
          </Link>
        </StickyActions>
      ) : null}
      {editor.sheet}
    </InnerPage>
  );
}
