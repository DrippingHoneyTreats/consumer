"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

type Props = {
  items: string[];
  className?: string;
  speed?: number;
  reverse?: boolean;
  tone?: "light" | "dark" | "blush";
};

/** Infinite horizontal marquee — Lagos market / vibe strip energy. */
export function Marquee({ items, className, speed = 28, reverse, tone = "light" }: Props) {
  const loop = [...items, ...items];
  const tones = {
    light: "bg-white/80 text-deep ring-1 ring-deep/5",
    dark: "bg-deep text-white",
    blush: "bg-blush-soft text-deep",
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div
        className="flex w-max gap-3"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        {loop.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-xs font-semibold shadow-[var(--shadow-card)] md:text-sm",
              tones[tone],
            )}
          >
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
