"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/cn";
import { usePageVisible } from "@/hooks/usePageVisible";

type Variant = "home" | "pastries";

type Props = {
  /** Product photos from the API; empty → plain grey cards. */
  images: string[];
  className?: string;
  variant?: Variant;
};

/**
 * Two overlapping, gently floating photo cards for page heroes.
 * Avoid CSS `filter` on animated nodes (crashes mobile Safari after ~1 min).
 */
const layouts: Record<Variant, { primary: string; secondary: string; shadow: string }> = {
  home: {
    primary: "absolute left-[6%] top-[4%] z-10 h-[80%] w-[54%] -rotate-[7deg]",
    secondary: "absolute right-[4%] top-[14%] z-[5] h-[72%] w-[48%] rotate-[8deg]",
    shadow: "absolute bottom-[2%] left-1/2 z-[1] h-2.5 w-[62%] -translate-x-1/2",
  },
  pastries: {
    primary: "absolute left-[4%] top-[2%] z-10 h-[82%] w-[54%] -rotate-[6deg]",
    secondary: "absolute right-[2%] top-[12%] z-[5] h-[74%] w-[48%] rotate-[7deg]",
    shadow: "absolute bottom-[4%] left-[48%] z-[1] h-2.5 w-[64%] -translate-x-1/2",
  },
};

function Card({ src, className, priority }: { src?: string; className: string; priority?: boolean }) {
  return (
    <div
      className={cn(
        className,
        "overflow-hidden rounded-[28px] bg-[#e5e1db] shadow-[var(--shadow-float)] ring-4 ring-white/90",
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          className="select-none object-cover"
          sizes="(min-width:1024px) 320px, 240px"
          priority={priority}
          unoptimized
        />
      ) : null}
    </div>
  );
}

export function HeroImageCycle({ images, className, variant = "home" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.15 });
  const pageVisible = usePageVisible();
  const active = inView && pageVisible;
  const [primary, secondary] = useMemo(() => Array.from(new Set(images.filter(Boolean))).slice(0, 2), [images]);
  const layout = layouts[variant];

  return (
    <div ref={rootRef} className={cn("relative h-full w-full", className)}>
      <motion.div
        className={cn(layout.secondary, "will-change-transform")}
        animate={active ? { y: [0, -8, 0] } : { y: 0 }}
        transition={active ? { duration: 5.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      >
        <Card src={secondary} className="relative h-full w-full" />
      </motion.div>

      <motion.div
        className={cn(layout.primary, "will-change-transform")}
        animate={active ? { y: [0, -10, 0] } : { y: 0 }}
        transition={active ? { duration: 6.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      >
        <Card src={primary} className="relative h-full w-full" priority />
      </motion.div>

      <div aria-hidden className={cn(layout.shadow, "rounded-[100%] bg-deep/20 blur-md")} />
    </div>
  );
}
