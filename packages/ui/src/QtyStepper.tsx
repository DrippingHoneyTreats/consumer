"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "./cn";
import { Minus, Plus } from "lucide-react";

export function QtyStepper({
  value,
  min = 0,
  max = 99,
  onChange,
  className,
  size = "md",
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (qty: number) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const btn = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-off-white p-1 text-deep ring-1 ring-deep/5",
        className,
      )}
    >
      <motion.button
        whileTap={{ scale: 0.85 }}
        type="button"
        aria-label="Decrease quantity"
        className={cn(btn, "flex items-center justify-center rounded-full bg-white shadow-sm disabled:opacity-40")}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={15} />
      </motion.button>
      <span className="relative min-w-7 overflow-hidden text-center text-sm font-bold tabular-nums">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="inline-block"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <motion.button
        whileTap={{ scale: 0.85 }}
        type="button"
        aria-label="Increase quantity"
        className={cn(btn, "flex items-center justify-center rounded-full bg-blush disabled:opacity-40")}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus size={15} />
      </motion.button>
    </div>
  );
}
