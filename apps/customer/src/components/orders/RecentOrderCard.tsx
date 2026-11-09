"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, RotateCcw } from "lucide-react";
import { formatNgn, statusLabel } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { formatOrderDate, isTerminalStatus, orderProductsSummary } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  order: Order;
  index?: number;
  onReorder?: () => void;
  className?: string;
};

function statusTone(status: string) {
  if (status === "delivered" || status === "completed") return "bg-sage-soft text-deep";
  if (status === "cancelled" || status === "payment_failed") return "bg-blush-soft text-blush-deep";
  return "bg-off-white text-deep/70";
}

export function RecentOrderCard({ order, index = 0, onReorder, className }: Props) {
  const thumbs = order.items.slice(0, 3);
  const canReorder = order.status === "delivered" || order.status === "completed";
  const summary = orderProductsSummary(order, 2);

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
      <Link href={`/orders/${order.id}`} className="pressable block p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg text-deep md:text-xl">#{order.orderNo}</p>
            <p className="mt-0.5 text-xs text-deep/45">{formatOrderDate(order.createdAt)}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", statusTone(order.status))}>
            {statusLabel(order.status)}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-deep/40">Total</p>
            <p className="font-display text-2xl font-semibold text-deep">{formatNgn(order.total)}</p>
          </div>
          <div className="flex gap-1.5">
            {thumbs.map((line) => (
              <span
                key={line.id}
                className="relative h-11 w-11 overflow-hidden rounded-[12px] bg-cream ring-2 ring-white"
              >
                <Image
                  src={line.item?.images?.[0] || ITEM_PLACEHOLDER}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                  unoptimized
                />
              </span>
            ))}
          </div>
        </div>

        {summary ? (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-deep/55">
            <span className="font-semibold text-deep/70">Products: </span>
            {summary}
          </p>
        ) : null}
      </Link>

      {canReorder || isTerminalStatus(order.status) ? (
        <div className="flex gap-2 border-t border-deep/5 bg-off-white/70 px-4 py-3 md:px-5">
          {canReorder && onReorder ? (
            <button
              type="button"
              onClick={onReorder}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-honey py-3 text-xs font-semibold text-deep"
            >
              <RotateCcw size={14} /> Reorder
            </button>
          ) : (
            <Link
              href={`/orders/${order.id}`}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-3 text-xs font-semibold text-deep ring-1 ring-deep/10"
            >
              View details
            </Link>
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
    </motion.article>
  );
}
