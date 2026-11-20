"use client";

import { Check } from "lucide-react";
import { trackingStepIndex, trackingSteps } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/cn";

export function OrderProgress({
  status,
  fulfillment,
  compact,
  className,
}: {
  status: string;
  fulfillment?: Order["fulfillment"];
  compact?: boolean;
  className?: string;
}) {
  const all = trackingSteps(fulfillment);
  const current = trackingStepIndex(status, fulfillment);
  const steps = compact ? all.filter((_, i) => i === 0 || i === 2 || i === 3 || i === 4) : all;

  return (
    <ol className={cn("flex w-full items-start", className)} aria-label="Order progress">
      {steps.map((step, i) => {
        const fullIdx = all.findIndex((s) => s.key === step.key);
        const done = current > fullIdx;
        const active = current === fullIdx;
        const upcoming = current < fullIdx;

        return (
          <li key={step.key} className="relative flex flex-1 flex-col items-center">
            {i < steps.length - 1 ? (
              <span
                className={cn(
                  "absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-[11px] h-0.5",
                  done || active ? "bg-tea" : "bg-deep/10",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-[1] flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                done && "bg-tea text-white",
                active && "bg-deep text-white ring-4 ring-deep/10",
                upcoming && "bg-off-white text-deep/35 ring-1 ring-deep/10",
              )}
            >
              {done ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "mt-1.5 max-w-[4.5rem] text-center text-[10px] font-semibold leading-tight",
                active ? "text-deep" : done ? "text-tea" : "text-deep/35",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
