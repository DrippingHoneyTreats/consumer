"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function OrdersSection({
  title,
  hint,
  children,
  className,
  action,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/45">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-deep/55">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
