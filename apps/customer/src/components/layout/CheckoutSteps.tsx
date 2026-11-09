"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const STEPS = ["Address", "Review", "Pay"];

export function CheckoutSteps({ current }: { current: number }) {
  return (
    <ol className="mb-5 flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                done && "bg-tea text-white",
                active && "bg-deep text-white ring-4 ring-sage/30",
                !done && !active && "bg-off-white text-deep/40",
              )}
            >
              {done ? <Check size={13} /> : i + 1}
            </motion.span>
            <span className={cn("text-xs font-semibold", active || done ? "text-deep" : "text-deep/40")}>{label}</span>
            {i < STEPS.length - 1 ? (
              <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-deep/10">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: done ? "100%" : 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="block h-full bg-tea"
                />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
