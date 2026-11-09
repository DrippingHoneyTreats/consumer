"use client";

import { Check } from "lucide-react";
import { buildOrderTimeline, formatOrderDateTime } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/cn";

export function OrderTimeline({ order }: { order: Order }) {
  const entries = buildOrderTimeline(order);

  return (
    <ol className="space-y-0">
      {entries.map((entry, i) => {
        const last = i === entries.length - 1;
        return (
          <li key={`${entry.status}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? (
              <span
                className={cn(
                  "absolute left-[11px] top-6 bottom-0 w-0.5",
                  entry.state === "done" ? "bg-tea" : "bg-deep/10",
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                "relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                entry.state === "done" && "bg-tea text-white",
                entry.state === "current" && "bg-deep text-white ring-4 ring-deep/10",
                entry.state === "upcoming" && "bg-off-white text-deep/30 ring-1 ring-deep/10",
              )}
            >
              {entry.state === "done" || entry.state === "current" ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    entry.state === "upcoming" ? "text-deep/40" : "text-deep",
                  )}
                >
                  {entry.label}
                </p>
                {entry.state === "current" ? (
                  <span className="rounded-full bg-honey-soft px-2 py-0.5 text-[10px] font-bold uppercase text-deep">
                    Current
                  </span>
                ) : null}
              </div>
              {entry.at ? (
                <p className="mt-0.5 text-xs text-deep/45">{formatOrderDateTime(entry.at)}</p>
              ) : entry.state === "upcoming" ? (
                <p className="mt-0.5 text-xs text-deep/35">Pending</p>
              ) : null}
              {entry.note ? <p className="mt-1 text-xs text-tea">{entry.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
