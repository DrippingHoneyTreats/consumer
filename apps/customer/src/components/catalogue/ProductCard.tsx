"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Star } from "lucide-react";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import type { CatalogueItem } from "@/lib/catalogue-types";
import { easeGentle, springSnappy } from "@/lib/motion";
import { cn } from "@/lib/cn";

type Props = {
  item: CatalogueItem;
  index?: number;
  layout?: "rail" | "grid";
  onAdd?: () => void;
  onOpen?: () => void;
};

export function ProductCard({ item, index = 0, layout = "grid", onAdd, onOpen }: Props) {
  const soldOut = item.status === "sold_out";
  const image = item.images?.[0] || ITEM_PLACEHOLDER;
  const rail = layout === "rail";

  return (
    <motion.article
      initial={{ opacity: 0, y: 44, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.7, delay: Math.min(index, 8) * 0.06, ease: easeGentle }}
      whileHover={{ y: -10, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-[26px] bg-white shadow-[var(--shadow-card)] will-change-transform",
        rail ? "w-[168px] shrink-0 md:w-[210px]" : "h-full",
        soldOut && "opacity-70",
      )}
    >
      <button type="button" onClick={onOpen} className="relative aspect-[4/5] w-full overflow-hidden bg-cream" aria-label={item.name}>
        <Image
          src={image}
          alt={item.name}
          fill
          className="object-cover transition duration-500 ease-out group-hover:scale-110"
          sizes={rail ? "200px" : "(max-width:768px) 50vw, 240px"}
          unoptimized
        />
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deep/25 via-transparent to-transparent opacity-0 transition group-hover:opacity-100"
        />
        {item.badge ? (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            className="absolute left-2.5 top-2.5 rounded-full bg-honey px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-deep"
          >
            {item.badge}
          </motion.span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
        <button type="button" onClick={onOpen} className="text-left">
          <h3 className="line-clamp-1 text-[13px] font-semibold text-deep md:text-sm">{item.name}</h3>
          {item.rating ? (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-deep/50">
              <Star size={11} className="fill-honey text-honey" />
              {item.rating.toFixed(1)}
              {item.reviewCount ? <span>({item.reviewCount})</span> : null}
            </p>
          ) : null}
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="font-display text-[15px] font-semibold text-deep md:text-base">{formatNgn(item.basePrice)}</p>
          <motion.button
            whileHover={{ scale: 1.12, rotate: 90 }}
            whileTap={{ scale: 0.85 }}
            transition={springSnappy}
            type="button"
            disabled={soldOut}
            onClick={(e) => {
              e.stopPropagation();
              onAdd?.();
            }}
            aria-label={`Add ${item.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-deep text-white shadow-[0_10px_20px_-10px_rgba(63,95,70,0.85)] disabled:bg-deep/25"
          >
            <Plus size={16} strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
