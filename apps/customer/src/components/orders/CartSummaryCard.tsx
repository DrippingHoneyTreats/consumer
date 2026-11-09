"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { cn } from "@/lib/cn";

export type CartThumb = {
  key: string;
  image?: string;
};

type Props = {
  href: string;
  itemCount: number;
  total: number;
  thumbs: CartThumb[];
  title?: string;
  subtitle?: string;
  className?: string;
};

export function CartSummaryCard({
  href,
  itemCount,
  total,
  thumbs,
  title = "In your cart",
  subtitle,
  className,
}: Props) {
  const copy =
    subtitle ??
    `${itemCount} item${itemCount === 1 ? "" : "s"} · not paid yet`;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Link
        href={href}
        className={cn(
          "pressable block overflow-hidden rounded-[28px] bg-gradient-to-br from-blush-soft via-white to-cream p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:p-5",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-tea shadow-sm">
                <ShoppingBag size={16} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg text-deep md:text-xl">{title}</p>
                <p className="mt-0.5 text-xs text-deep/50">{copy}</p>
              </div>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-deep ring-1 ring-deep/5">
            Draft
          </span>
        </div>

        <p className="mt-4 font-display text-3xl font-semibold text-deep">{formatNgn(total)}</p>

        {thumbs.length ? (
          <div className="mt-4 flex gap-2">
            {thumbs.slice(0, 4).map((t) => (
              <span
                key={t.key}
                className="relative h-14 w-14 overflow-hidden rounded-[16px] bg-cream ring-2 ring-white"
              >
                <Image src={t.image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="56px" unoptimized />
              </span>
            ))}
            {thumbs.length > 4 ? (
              <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-white text-xs font-bold text-deep ring-2 ring-white">
                +{thumbs.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}

        <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-tea">
          Review & pay <ArrowRight size={13} />
        </span>
      </Link>
    </motion.div>
  );
}
