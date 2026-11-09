"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, MapPin } from "lucide-react";
import { formatNgn, statusLabel } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { formatOrderDate, orderPlaceLabel } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { OrderProgress } from "@/components/orders/OrderProgress";
import { cn } from "@/lib/cn";

type Props = {
  order: Order;
  index?: number;
  className?: string;
};

export function OngoingOrderCard({ order, index = 0, className }: Props) {
  const thumbs = order.items.slice(0, 3);
  const extra = order.items.length - thumbs.length;
  const place = orderPlaceLabel(order);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.33, 0, 0.2, 1] }}
      className={cn(
        "overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-card)] ring-1 ring-deep/5",
        className,
      )}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg text-deep md:text-xl">#{order.orderNo}</p>
            <p className="mt-0.5 text-xs text-deep/45">{formatOrderDate(order.createdAt)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-honey-soft px-2.5 py-1 text-[11px] font-bold text-deep">
            {statusLabel(order.status)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <p className="font-display text-2xl font-semibold text-deep">{formatNgn(order.total)}</p>
          <p className="flex max-w-[55%] items-center gap-1 truncate text-xs text-deep/55">
            <MapPin size={12} className="shrink-0 text-tea" />
            <span className="truncate">{place}</span>
          </p>
        </div>

        <div className="mt-4 rounded-2xl bg-off-white/80 px-2 py-3">
          <OrderProgress status={order.status} compact />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {thumbs.map((line) => (
            <span
              key={line.id}
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-cream ring-2 ring-white"
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
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-sage-soft text-xs font-bold text-deep ring-2 ring-white">
              +{extra}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 border-t border-deep/5 bg-off-white/70 px-4 py-3 md:px-5">
        <Link
          href={`/orders/${order.id}/track`}
          className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-deep py-3 text-xs font-semibold text-white"
        >
          <MapPin size={14} /> Track order
        </Link>
        <Link
          href={`/orders/${order.id}`}
          className="pressable flex h-11 w-11 items-center justify-center rounded-full bg-white text-deep shadow-sm"
          aria-label="Order details"
        >
          <ChevronRight size={18} />
        </Link>
      </div>
    </motion.article>
  );
}
