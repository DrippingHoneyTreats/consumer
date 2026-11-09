"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, RotateCcw } from "lucide-react";
import { formatNgn, statusLabel } from "@/lib/format";
import { formatOrderDate, orderProductsSummary } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/cn";

type Mode = "ongoing" | "completed";

type Props = {
  order: Order;
  mode: Mode;
  index?: number;
  onReorder?: () => void;
  className?: string;
};

function statusTone(status: string, mode: Mode) {
  if (mode === "ongoing") return "bg-honey-soft text-deep";
  if (status === "delivered" || status === "completed") return "bg-sage-soft text-deep";
  if (status === "cancelled" || status === "payment_failed") return "bg-blush-soft text-blush-deep";
  return "bg-off-white text-deep/70";
}

export function OrderListCard({ order, mode, index = 0, onReorder, className }: Props) {
  const products = orderProductsSummary(order, 4);
  const canReorder = mode === "completed" && (order.status === "delivered" || order.status === "completed");

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.33, 0, 0.2, 1] }}
      className={cn(
        "overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-card)] ring-1 ring-deep/5",
        className,
      )}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg text-deep md:text-xl">Order # {order.orderNo}</p>
          </div>
          <p className="shrink-0 text-xs text-deep/45">{formatOrderDate(order.createdAt, { withYear: false })}</p>
        </div>

        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-deep/45">Status</dt>
            <dd>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", statusTone(order.status, mode))}>
                {statusLabel(order.status)}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-deep/45">Total amount</dt>
            <dd className="font-semibold text-deep">{formatNgn(order.total)}</dd>
          </div>
        </dl>

        {products ? (
          <p className="mt-3 text-sm leading-relaxed text-deep">
            <span className="text-deep/45">Products: </span>
            <span className="font-semibold">{products}</span>
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 border-t border-deep/5 bg-off-white/70 px-4 py-3 md:px-5">
        {mode === "ongoing" ? (
          <>
            <Link
              href={`/orders/${order.id}/track`}
              className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-deep py-3 text-xs font-semibold text-white"
            >
              <MapPin size={14} /> Track order
            </Link>
            <Link
              href={`/orders/${order.id}`}
              className="pressable flex items-center justify-center rounded-full bg-white px-4 py-3 text-xs font-semibold text-deep ring-1 ring-deep/10"
            >
              Details
            </Link>
          </>
        ) : (
          <>
            {canReorder && onReorder ? (
              <button
                type="button"
                onClick={onReorder}
                className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-honey py-3 text-xs font-semibold text-deep"
              >
                <RotateCcw size={14} /> Reorder
              </button>
            ) : null}
            <Link
              href={`/orders/${order.id}`}
              className={cn(
                "pressable flex items-center justify-center rounded-full bg-white px-4 py-3 text-xs font-semibold text-deep ring-1 ring-deep/10",
                !canReorder && "flex-1",
              )}
            >
              Details
            </Link>
          </>
        )}
      </div>
    </motion.article>
  );
}
