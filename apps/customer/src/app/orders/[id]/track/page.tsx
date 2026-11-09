"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FileText, MapPin, MessageCircle, Phone, Truck } from "lucide-react";
import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { formatNgn, statusLabel, whatsappLink } from "@/lib/format";
import { formatOrderDate, isDraftStatus, isOngoingStatus, orderPlaceLabel } from "@/lib/order-status";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import type { Order } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyActions } from "@/components/layout/StickyActions";
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
  const wa = whatsappLink(
    process.env.NEXT_PUBLIC_WHATSAPP ?? "2348000000000",
    `Hi DHT, I need help with order #${order.orderNo}`,
  );

  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+140px)]">
      <PageHeader
        eyebrow="Live update"
        title="Track your order"
        subtitle={`#${order.orderNo} · ${formatOrderDate(order.createdAt)}`}
        backHref="/orders"
      />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 overflow-hidden rounded-[28px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-deep/45">Order #{order.orderNo}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-deep">{formatNgn(order.total)}</p>
            <p className="mt-1 text-xs text-deep/50">Placed {formatOrderDate(order.createdAt)}</p>
          </div>
          <span className="rounded-full bg-honey-soft px-3 py-1.5 text-[11px] font-bold text-deep">
            {statusLabel(order.status)}
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-off-white px-2 py-4">
          <OrderProgress status={order.status} />
        </div>
      </motion.section>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[28px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-5"
        >
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/45">Timeline</h2>
          <OrderTimeline order={order} />
        </motion.section>

        <div className="space-y-4">
          {(order.delivery || order.addressSnapshot) && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-[28px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-5"
            >
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/45">
                <Truck size={13} className="text-tea" /> Delivery
              </h2>
              <p className="flex items-start gap-2 text-sm text-deep">
                <MapPin size={14} className="mt-0.5 shrink-0 text-tea" />
                <span>{place}</span>
              </p>
              {order.delivery?.riderName ? (
                <p className="mt-3 text-sm text-deep">
                  <span className="text-deep/45">Rider: </span>
                  <span className="font-semibold">{order.delivery.riderName}</span>
                </p>
              ) : null}
              {order.delivery?.etaMinutes != null ? (
                <p className="mt-1 text-sm text-deep">
                  <span className="text-deep/45">ETA: </span>
                  <span className="font-semibold">~{order.delivery.etaMinutes} min</span>
                </p>
              ) : null}
              {order.delivery?.riderPhone ? (
                <a
                  href={`tel:${order.delivery.riderPhone}`}
                  className="pressable mt-3 inline-flex items-center gap-2 rounded-full bg-off-white px-3 py-2 text-xs font-semibold text-deep"
                >
                  <Phone size={13} /> Call rider
                </a>
              ) : null}
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[28px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/45">Items</h2>
              <Link href={`/orders/${order.id}`} className="text-xs font-bold text-tea">
                Full details
              </Link>
            </div>
            <ul className="space-y-2.5">
              {order.items.slice(0, 4).map((line) => (
                <li key={line.id} className="flex items-center gap-3">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-cream">
                    <Image
                      src={line.item?.images?.[0] || ITEM_PLACEHOLDER}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
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
            {order.items.length > 4 ? (
              <p className="mt-2 text-xs text-deep/45">+{order.items.length - 4} more items</p>
            ) : null}
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-deep/10 pt-3 text-sm">
              <span className="text-deep/55">{order.items.reduce((s, i) => s + i.qty, 0)} items</span>
              <span className="font-display text-lg font-semibold text-deep">{formatNgn(order.total)}</span>
            </div>
          </motion.section>
        </div>
      </div>

      <StickyActions aboveTabs>
        <div className="glass flex flex-col gap-2 rounded-[26px] border border-white/80 p-3 shadow-[var(--shadow-float)] sm:flex-row">
          <Link href={`/orders/${order.id}`} className="flex-1">
            <Button fullWidth variant="secondary" leftIcon={<FileText size={16} />}>
              View order details
            </Button>
          </Link>
          <a href={wa} className="flex-1">
            <Button fullWidth variant="dark" leftIcon={<MessageCircle size={16} />}>
              Need help?
            </Button>
          </a>
        </div>
      </StickyActions>

      {!isOngoingStatus(order.status) && order.status === "delivered" ? (
        <p className="mt-4 text-center text-xs text-deep/45">This order was delivered. Thanks for ordering with us.</p>
      ) : null}
    </div>
  );
}
