"use client";

import { cn } from "./cn";

type Props = {
  /** Number of skeleton cards */
  count?: number;
  /** Tailwind grid columns, e.g. 2 or 3 */
  columns?: 1 | 2 | 3 | 4;
  /** Size / aspect class for each cell (e.g. aspect-[3/4] or h-24) */
  aspect?: string;
  className?: string;
  cellClassName?: string;
};

const colClass: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

/** Reusable skeleton grid for catalogue / promo / event lists. */
export function ColumnLoader({
  count = 4,
  columns = 2,
  aspect = "aspect-[3/4]",
  className,
  cellClassName,
}: Props) {
  return (
    <div className={cn("grid gap-3", colClass[columns], className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("skeleton rounded-[24px]", aspect, cellClassName)} />
      ))}
    </div>
  );
}
