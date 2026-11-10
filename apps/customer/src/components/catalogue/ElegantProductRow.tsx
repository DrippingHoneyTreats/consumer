"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import type { CatalogueItem } from "@/lib/catalogue-types";
import { easeGentle } from "@/lib/motion";
import { cn } from "@/lib/cn";

type Props = {
  item: CatalogueItem;
  index?: number;
  onOpen?: () => void;
};

const blobTones = ["bg-[#fce4ec]", "bg-[#ffe8d6]", "bg-[#f9d5e0]", "bg-[#f3ebe3]"] as const;

/** Soft staggered product row matching the cupcake category template. */
export function ElegantProductRow({ item, index = 0, onOpen }: Props) {
  const soldOut = item.status === "sold_out";
  const image = item.images?.[0] || ITEM_PLACEHOLDER;
  const flip = index % 2 === 1;
  const blob = blobTones[index % blobTones.length];
  const organic =
    index % 3 === 0
      ? "rounded-[48%_42%_50%_44%]"
      : index % 3 === 1
        ? "rounded-full"
        : "rounded-[42%_50%_44%_48%]";

  return (
    <motion.article
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.7, delay: Math.min(index, 6) * 0.05, ease: easeGentle }}
      className={cn("relative py-9 md:py-14", soldOut && "opacity-60")}
    >
      <span
        className={cn(
          "pointer-events-none absolute h-2 w-2 rounded-full bg-[#f9a8bb]",
          flip ? "left-[10%] top-4" : "right-[12%] top-6",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-[#e8a48a]",
          flip ? "right-[6%] bottom-8" : "left-[8%] bottom-10",
        )}
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute h-3 w-3 rounded-full border-2 border-[#f9a8bb]/55",
          flip ? "left-[3%] top-[45%]" : "right-[3%] top-[38%]",
        )}
        aria-hidden
      />

      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group relative flex w-full items-center gap-4 text-left md:gap-10",
          flip ? "flex-row-reverse" : "flex-row",
        )}
      >
        <span className="relative shrink-0">
          <span className={cn("absolute -inset-5 md:-inset-8", blob, organic)} aria-hidden />
          <span
            className={cn(
              "relative block h-[148px] w-[148px] overflow-hidden shadow-[0_16px_36px_-18px_rgba(93,64,55,0.35)] ring-[5px] ring-white md:h-[210px] md:w-[210px]",
              organic,
            )}
          >
            <Image
              src={image}
              alt={item.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="210px"
              unoptimized
            />
          </span>

          <span
            className={cn(
              "absolute z-[1] flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#5d4037] shadow-md transition group-hover:scale-110",
              flip ? "-left-0.5 bottom-2 md:-left-1" : "-right-0.5 bottom-2 md:-right-1",
            )}
          >
            <Plus size={18} strokeWidth={2.2} />
          </span>

          {item.badge ? (
            <span className="absolute -top-1 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f9a8bb] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
              {item.badge}
            </span>
          ) : null}
        </span>

        <span
          className={cn(
            "min-w-0 flex-1 rounded-[28px] px-1 py-2 md:px-2",
            flip ? "text-right" : "text-left",
            index % 3 === 2 && "bg-white/70 shadow-[0_10px_30px_-20px_rgba(93,64,55,0.25)] md:px-4 md:py-4",
          )}
        >
          <span className="block font-display text-[24px] leading-[1.1] text-[#5d4037] md:text-[32px]">
            {item.name}
          </span>
          {item.description ? (
            <span
              className={cn(
                "mt-2 block text-[13px] leading-relaxed text-[#5d4037]/55 md:text-[15px]",
                flip ? "ml-auto max-w-[260px]" : "max-w-[260px]",
              )}
            >
              {item.description}
            </span>
          ) : null}
          <span className={cn("mt-3 inline-flex items-baseline gap-2", flip && "flex-row-reverse")}>
            <span className="font-display text-lg text-[#5d4037] md:text-xl">{formatNgn(item.basePrice)}</span>
            {soldOut ? <span className="text-xs font-semibold text-[#5d4037]/40">Sold out</span> : null}
          </span>
        </span>
      </button>
    </motion.article>
  );
}
