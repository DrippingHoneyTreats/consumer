"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";
import { formatNgn } from "@/lib/format";
import { listItem } from "@/lib/motion";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";

const REVEAL = 96; // px of red "Remove" area revealed by swiping
const TRIGGER = 80;

/**
 * One cart line. Swipe left to remove (or use the stepper down to 0).
 * Must be rendered inside <AnimatePresence> so removal animates out.
 */
export function CartLineRow({
  image,
  name,
  unitPrice,
  qty,
  note,
  onRemove,
  children,
}: {
  image?: string | null;
  name: string;
  unitPrice: number;
  qty: number;
  note?: string | null;
  /** Enables swipe-to-remove. */
  onRemove?: () => void;
  /** Right-hand control (QtyStepper or ×qty). */
  children?: ReactNode;
}) {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-REVEAL, -16, 0], [1, 0.4, 0]);
  const iconScale = useTransform(x, [-REVEAL, -TRIGGER, -24], [1.15, 1, 0.6]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -TRIGGER || info.velocity.x < -600) onRemove?.();
  }

  return (
    <motion.li
      layout="position"
      variants={listItem}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative overflow-hidden border-t border-deep/5 first:border-t-0"
    >
      {onRemove ? (
        <motion.div
          aria-hidden
          style={{ opacity: bgOpacity }}
          className="absolute inset-y-0 right-0 flex w-full items-center justify-end bg-danger/90 pr-5 text-white"
        >
          <motion.span style={{ scale: iconScale }} className="flex items-center gap-1.5 text-xs font-bold">
            <Trash2 size={16} /> Remove
          </motion.span>
        </motion.div>
      ) : null}

      <motion.div
        drag={onRemove ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: -REVEAL, right: 0 }}
        dragElastic={{ left: 0.25, right: 0 }}
        dragSnapToOrigin
        onDragEnd={onDragEnd}
        style={{ x }}
        className="relative flex items-center gap-3 bg-white px-4 py-3.5 md:px-6"
      >
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] bg-cream">
          <Image src={image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="56px" unoptimized draggable={false} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-deep">{name}</p>
          <p className="text-xs text-deep/50">
            {formatNgn(unitPrice)} each ·{" "}
            <AnimatedNumber value={unitPrice * qty} className="font-semibold text-deep" />
          </p>
          {note ? <p className="mt-0.5 truncate text-[11px] italic text-tea">“{note}”</p> : null}
        </div>
        {children}
      </motion.div>
    </motion.li>
  );
}
