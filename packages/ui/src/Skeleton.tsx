"use client";

import { cn } from "./cn";

/** Single reusable skeleton block — bars, chips, media, etc. */
export function Skeleton({ className }: { className?: string }) {
  // No aria-hidden here — parents (ColumnLoader / page loaders) own a11y status.
  // Keeps SSR/client class lists identical when HMR updates this package alone.
  return <div className={cn("skeleton", className)} />;
}
