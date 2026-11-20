"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Bike, Clock, FileText, MessageCircle, Phone, ShoppingBag, Store, Truck } from "lucide-react";
import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { formatNgn, contactLink } from "@/lib/format";
import { formatOrderDate, isDraftStatus, isOngoingStatus, orderPlaceLabel, orderStatusLabel } from "@/lib/order-status";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import type { Order } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyActions } from "@/components/layout/StickyActions";
import { InnerPage, PageSection } from "@/components/layout/InnerPage";
import { Button } from "@/components/ui/Button";
import { OfflineState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { OrderTimeline } from "@/components/orders/OrderTimeline";

export default function OrderTrackPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await apiClient.get<Order | { data: Order }>(`/orders/${id}`);
      const o = unwrapData(res) ?? (res as Order);
      setOrder(o);
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Live-ish tracking: refresh every 20s while the order is in progress and the tab is visible.
  const ongoing = order ? isOngoingStatus(order.status) : false;
  useEffect(() => {
    if (!ongoing) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 20_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongoing, id]);

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
        <PageHeader title="Track order" backHref="/orders" />
        <OfflineState
          onRetry={() => {
            setLoading(true);
            void load();
          }}
        />
      </div>
    );
  }

  if (isDraftStatus(order.status)) {
    return (
      <div className="page-pad">
        <PageHeader title="Track order" backHref="/orders" />
        <div className="rounded-[24px] bg-white p-5 text-center shadow-[var(--shadow-card)] ring-1 ring-deep/5">
          <p className="font-display text-xl text-deep">Not on the road yet</p>
          <p className="mt-2 text-sm text-deep/55">This order is still in your cart. Pay to start tracking.</p>
          <Link href={`/orders/${order.id}`} className="mt-4 inline-block">
            <Button variant="dark">Review order</Button>
          </Link>
        </div>
      </div>
    );
  }

  const place = orderPlaceLabel(order);
  const wa = contactLink(`Hi DHT, I need help with order #${order.orderNo}`,
  );

  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
  const pickup = order.fulfillment === "pickup";

  return (
    <InnerPage
      tabbed
      className="pb-[calc(var(--tab-h)+var(--safe-bottom)+var(--banner-h,0px)+140px)] md:pb-[calc(var(--tab-h)+var(--safe-bottom)+var(--banner-h,0px)+32px)]"
      eyebrow="Live update"
      title="Track your order"
      subtitle={`#${order.orderNo} · ${formatOrderDate(order.createdAt)}`}
      backHref={`/orders/${order.id}`}
      help={`Hi DHT, I need help with order #${order.orderNo}`}
      hero={
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-white/70">Order total</p>
            <p className="font-display text-3xl">{formatNgn(order.total)}</p>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-bold">{orderStatusLabel(order)}</span>
        </div>
      }
      facts={[
        { icon: pickup ? Store : Truck, value: pickup ? "Pickup" : "Delivery", label: place || "Address on file" },
        ...(order.delivery?.etaMinutes != null
          ? [{ icon: Clock, value: `~${order.delivery.etaMinutes} min`, label: "Estimated arrival" }]
          : []),
        ...(order.delivery?.riderName ? [{ icon: Bike, value: order.delivery.riderName, label: "Your rider" }] : []),
        { icon: ShoppingBag, value: `${itemCount} item${itemCount === 1 ? "" : "s"}`, label: "In this order" },
      ]}
      actions={
        <>
          {order.delivery?.riderPhone ? (
            <a href={`tel:${order.delivery.riderPhone}`} className="block">
              <Button fullWidth variant="dark" leftIcon={<Phone size={16} />}>
                Call rider
              </Button>
            </a>
          ) : null}
          <Link href={`/orders/${order.id}`} className="block">
            <Button fullWidth variant="tertiary" leftIcon={<FileText size={16} />}>
              Order details
            </Button>
          </Link>
        </>
      }
    >
      <PageSection title="Progress">
        <div className="rounded-2xl bg-off-white px-2 py-4">
          <OrderProgress status={order.status} fulfillment={order.fulfillment} />
        </div>
        {order.status === "delivered" ? (
          <p className="mt-3 text-center text-xs text-deep/50">Delivered. Thanks for ordering with us!</p>
        ) : null}
      </PageSection>

      <PageSection title="Timeline">
        <OrderTimeline order={order} />
      </PageSection>

      <PageSection
        title="Items"
        action={
          <Link href={`/orders/${order.id}`} className="text-xs font-bold text-tea">
            Full details
          </Link>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {order.items.slice(0, 6).map((line) => (
            <li key={line.id} className="flex items-center gap-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-cream">
                <Image src={line.item?.images?.[0] || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="48px" unoptimized />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-deep">{line.nameSnapshot}</p>
                <p className="text-xs text-deep/45">
                  ×{line.qty} · {formatNgn(line.unitPrice * line.qty)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {order.items.length > 6 ? <p className="mt-3 text-xs text-deep/45">+{order.items.length - 6} more items</p> : null}
      </PageSection>

      <StickyActions aboveTabs mobileOnly>
        <div className="glass flex gap-2 rounded-[26px] border border-white/80 p-3 shadow-[var(--shadow-float)]">
          <Link href={`/orders/${order.id}`} className="flex-1">
            <Button fullWidth variant="secondary" leftIcon={<FileText size={16} />}>
              Details
            </Button>
          </Link>
          {order.delivery?.riderPhone ? (
            <a href={`tel:${order.delivery.riderPhone}`} className="flex-1">
              <Button fullWidth variant="dark" leftIcon={<Phone size={16} />}>
                Call rider
              </Button>
            </a>
          ) : (
            <a href={wa} className="flex-1">
              <Button fullWidth variant="dark" leftIcon={<MessageCircle size={16} />}>
                Need help?
              </Button>
            </a>
          )}
        </div>
      </StickyActions>
    </InnerPage>
  );
}
