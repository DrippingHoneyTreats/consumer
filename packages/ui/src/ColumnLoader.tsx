"use client";

import { cn } from "./cn";
import { Skeleton } from "./Skeleton";

type Columns = 1 | 2 | 3 | 4;

type Props = {
  /** Number of skeleton cells */
  count?: number;
  /** Grid columns (required — keep loaders columnar everywhere) */
  columns: Columns;
  /** Size / aspect class for each cell (e.g. aspect-[3/4] or h-24) */
  aspect?: string;
  className?: string;
  cellClassName?: string;
  /** Optional gap override */
  gap?: string;
};

const colClass: Record<Columns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};

/** Reusable columnar skeleton grid for lists, catalogues, promos, events. */
export function ColumnLoader({
  count,
  columns,
  aspect = "aspect-[3/4]",
  className,
  cellClassName,
  gap = "gap-3",
}: Props) {
  const cells = count ?? columns * 2;

  return (
    <div className={cn("grid", gap, colClass[columns], className)} role="status" aria-label="Loading">
      {Array.from({ length: cells }, (_, i) => (
        <Skeleton key={i} className={cn("rounded-[24px]", aspect, cellClassName)} />
      ))}
    </div>
  );
}

/** Common page-level loading layouts built from ColumnLoader + Skeleton. */
export function PageSkeleton({
  variant = "grid",
}: {
  variant?: "grid" | "list" | "detail" | "home" | "search";
}) {
  if (variant === "home") {
    return (
      <div className="space-y-5">
        <Skeleton className="aspect-[16/8] w-full rounded-[30px] md:aspect-[21/8]" />
        <Skeleton className="h-6 w-1/2 rounded-2xl" />
        <ColumnLoader columns={4} count={4} aspect="aspect-[5/4]" />
      </div>
    );
  }

  if (variant === "list") {
    return <ColumnLoader columns={1} count={4} aspect="h-24 aspect-auto" />;
  }

  if (variant === "search") {
    return <ColumnLoader columns={1} count={3} aspect="h-[72px] aspect-auto" />;
  }

  if (variant === "detail") {
    return (
      <div className="space-y-3">
        <Skeleton className="h-36 rounded-[28px] md:h-48" />
        <ColumnLoader columns={1} count={2} aspect="h-20 aspect-auto" />
        <Skeleton className="h-40 rounded-[24px]" />
      </div>
    );
  }

  return <ColumnLoader columns={4} count={4} aspect="aspect-[3/4]" />;
}
