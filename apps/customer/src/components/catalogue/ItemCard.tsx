"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Heart, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER, toneFor } from "@/lib/placeholders";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  item: Item;
  qty?: number;
  liked?: boolean;
  index?: number;
  onAdd?: () => void;
  onQtyChange?: (qty: number) => void;
  onLike?: () => void;
  onOpen?: () => void;
};

export function ItemCard({
  item,
  qty = 0,
  liked,
  index = 0,
  onAdd,
  onQtyChange,
  onLike,
  onOpen,
}: Props) {
  const soldOut = item.status === "sold_out";
  const image = item.images?.[0] || ITEM_PLACEHOLDER;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col overflow-hidden rounded-[24px] border border-deep/5 bg-white p-2 shadow-[var(--shadow-card)]",
        soldOut && "opacity-70",
      )}
    >
      <div className={cn("relative aspect-square overflow-hidden rounded-[18px]", toneFor(index))}>
        <button type="button" className="absolute inset-0" onClick={onOpen} aria-label={`Open ${item.name}`}>
          <Image
            src={image}
            alt={item.name}
            fill
            className="object-cover transition duration-500 hover:scale-105"
            sizes="(max-width: 480px) 50vw, 220px"
            unoptimized
          />
        </button>
        {onLike ? (
          <motion.button
            whileTap={{ scale: 0.8 }}
            type="button"
            aria-label={liked ? "Remove from wishlist" : "Save to wishlist"}
            aria-pressed={liked}
            className="glass absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-deep"
            onClick={onLike}
          >
            <motion.span key={String(liked)} initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
              <Heart size={16} className={liked ? "fill-blush-deep text-blush-deep" : ""} />
            </motion.span>
          </motion.button>
        ) : null}
        <span className="absolute bottom-2 left-2">
          <Badge status={item.status} className="bg-white/90" />
        </span>
      </div>

      <button type="button" className="flex flex-1 flex-col items-start justify-start px-1.5 pt-2.5 text-left" onClick={onOpen}>
        <h3 className="line-clamp-1 text-sm font-semibold text-deep">{item.name}</h3>
        {item.description ? (
          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-deep/55">{item.description}</p>
        ) : null}
        {item.status === "pre_order" && item.leadTimeHours ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-tea">
            <Clock size={11} /> {item.leadTimeHours} hrs notice
          </p>
        ) : null}
      </button>

      <div className="flex min-h-11 items-center justify-between gap-2 px-1.5 pb-1 pt-2">
        <p className="font-display text-base font-semibold text-deep">{formatNgn(item.basePrice)}</p>
        {qty > 0 && onQtyChange ? (
          <QtyStepper size="sm" value={qty} min={0} max={item.maxQty} onChange={onQtyChange} />
        ) : (
          <motion.button
            whileTap={{ scale: 0.85, rotate: 90 }}
            type="button"
            disabled={soldOut}
            onClick={onAdd}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-deep text-white shadow-[0_8px_18px_-8px_rgba(63,95,70,0.8)] disabled:bg-deep/30 disabled:shadow-none"
            aria-label="Add to order"
          >
            <Plus size={18} />
          </motion.button>
        )}
      </div>
    </motion.article>
  );
}
