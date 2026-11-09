"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Lock, MapPin, MessageCircle, Plus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { formatNgn, whatsappLink } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import type { Order } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyActions } from "@/components/layout/StickyActions";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { useCartActions } from "@/hooks/useCartActions";
import { useCartStore } from "@/store/cart-store";
function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold text-deep" : "text-deep/70"} ${accent ? "text-tea" : ""}`}>
      <span>{label}</span>
      <span className={strong ? "font-display text-lg" : ""}>{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const setDraft = useCartStore((s) => s.setDraft);
  const { setQty } = useCartActions();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await apiClient.get<Order | { data: Order }>(`/orders/${id}`);
      const o = unwrapData(res) ?? (res as Order);
      setOrder(o);
      if (o.status === "draft" || o.status === "pending_payment") setDraft(o);
    } catch {
      /* keep the last loaded order; a failed first load shows the offline state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isDraft = order?.status === "draft" || order?.status === "pending_payment";

  if (loading) {
    return (
      <div className="page-pad space-y-3">
        <div className="skeleton h-28 rounded-[28px]" />
        <div className="skeleton h-20 rounded-[24px]" />
        <div className="skeleton h-20 rounded-[24px]" />
        <div className="skeleton h-36 rounded-[24px]" />
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

  const created = new Date(order.createdAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+150px)]">
      <PageHeader title={`Order #${order.orderNo}`} backHref="/orders" />

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between rounded-[24px] bg-hero p-4 shadow-[var(--shadow-card)]"
      >
        <div>
          <p className="text-xs text-deep/60">Placed {created}</p>
          <p className="mt-1 font-display text-2xl text-deep">{formatNgn(order.total)}</p>
        </div>
        <Badge status={order.status} className="bg-white/80" />
      </motion.section>

      {order.items.length === 0 ? (
        <EmptyState
          title="No item in this order"
          description="Add something sweet to get started."
          actionHref="/pastries"
          actionLabel="Add an order"
        />
      ) : (
        <ul className="mb-4 space-y-2.5">
          <AnimatePresence initial={false}>
            {order.items.map((line, i) => (
              <motion.li
                key={line.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                exit={{ opacity: 0, x: -40 }}
                className="flex items-center gap-3 rounded-[22px] border border-deep/5 bg-white p-2.5 shadow-[var(--shadow-card)]"
              >
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px] bg-blush-soft">
                  <Image src={line.item?.images?.[0] || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="64px" unoptimized />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-deep">{line.nameSnapshot}</p>
                  <p className="text-xs text-deep/50">{formatNgn(line.unitPrice)} each</p>
                  {line.note ? <p className="mt-0.5 truncate text-[11px] italic text-tea">“{line.note}”</p> : null}
                  <p className="mt-1 text-sm font-semibold text-deep">{formatNgn(line.unitPrice * line.qty)}</p>
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
          {isDraft ? (
            <li>
              <Link
                href="/pastries"
                className="pressable flex items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-deep/15 py-3.5 text-sm font-semibold text-tea"
              >
                <Plus size={16} /> Add more pastries
              </Link>
            </li>
          ) : null}
        </ul>
      )}

      <section className="space-y-2 rounded-[24px] border border-deep/5 bg-white p-4 text-sm shadow-[var(--shadow-card)]">
        <Row label="Subtotal" value={formatNgn(order.subtotal)} />
        <Row
          label="Delivery"
          value={order.deliveryFee > 0 || order.addressSnapshot ? formatNgn(order.deliveryFee) : "Calculated at checkout"}
        />
        {order.discount > 0 ? <Row label="Discount" value={`-${formatNgn(order.discount)}`} accent /> : null}
        <div className="border-t border-dashed border-deep/10 pt-2">
          <Row label="Total" value={formatNgn(order.total)} strong />
        </div>
      </section>

      {!isDraft ? (
        <a
          href={whatsappLink(process.env.NEXT_PUBLIC_WHATSAPP ?? "2348000000000", `Hi DHT, I need help with order #${order.orderNo}`)}
          className="pressable mt-4 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-tea"
        >
          <MessageCircle size={16} /> Need help? Chat with us
        </a>
      ) : null}

      {isDraft && order.items.length > 0 ? (
        <StickyActions aboveTabs>
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
      ) : !isDraft && order.status !== "cancelled" && order.status !== "delivered" ? (
        <StickyActions aboveTabs>
          <Link href={`/orders/`}>
            <Button fullWidth variant="dark" leftIcon={<MapPin size={16} />} className="shadow-[var(--shadow-float)]">
              Track order
            </Button>
          </Link>
        </StickyActions>
      ) : null}
    </div>
  );
}
