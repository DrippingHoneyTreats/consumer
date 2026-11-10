"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/cn";
import { usePageVisible } from "@/hooks/usePageVisible";

type Variant = "home" | "pastries";

type Props = {
  images: string[];
  intervalMs?: number;
  className?: string;
  variant?: Variant;
};

/**
 * Layered cutouts that share the same cluster — heavy overlap, wide feel.
 * Avoid CSS `filter` on animated nodes (crashes mobile Safari after ~1 min).
 */
const layouts: Record<
  Variant,
  { wrap: string; primary: string; secondary: string; shadow: string }
> = {
  home: {
    wrap: "relative h-full w-full",
    primary: "absolute left-[2%] top-[2%] z-10 h-[98%] w-[72%] rotate-[44deg]",
    secondary: "absolute left-[42%] top-[8%] z-[5] h-[88%] w-[58%] rotate-[50deg]",
    shadow: "absolute bottom-[2%] left-1/2 z-[1] h-2.5 w-[62%] -translate-x-1/2",
  },
  pastries: {
    wrap: "relative h-full w-full",
    primary: "absolute left-[-4%] top-0 z-10 h-[100%] w-[74%] rotate-[44deg]",
    secondary: "absolute left-[38%] top-[6%] z-[5] h-[90%] w-[60%] rotate-[50deg]",
    shadow: "absolute bottom-[4%] left-[48%] z-[1] h-2.5 w-[64%] -translate-x-1/2",
  },
};

export function HeroImageCycle({ images, className, variant = "home" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.15 });
  const pageVisible = usePageVisible();
  const active = inView && pageVisible;

  const slides = useMemo(
    () => Array.from(new Set(images.filter(Boolean))).slice(0, 2),
    [images],
  );

  const primary = slides[0];
  const secondary = slides[1] ?? null;
  if (!primary) return null;

  const layout = layouts[variant];

  return (
    <div ref={rootRef} className={cn(layout.wrap, className)}>
      {secondary ? (
        <motion.div
          className={cn(layout.secondary, "will-change-transform")}
          animate={active ? { y: [0, -8, 0] } : { y: 0 }}
          transition={
            active
              ? { duration: 5.8, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
          }
        >
          <Image
            src={secondary}
            alt=""
            fill
            className="object-contain object-bottom select-none"
            sizes="360px"
            unoptimized
          />
        </motion.div>
      ) : null}

      <motion.div
        className={cn(layout.primary, "will-change-transform")}
        animate={active ? { y: [0, -10, 0] } : { y: 0 }}
        transition={
          active
            ? { duration: 6.4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
      >
        <Image
          src={primary}
          alt=""
          fill
          className="object-contain object-bottom select-none"
          sizes="(min-width:1024px) 520px, (min-width:768px) 440px, 360px"
          priority
          unoptimized
        />
      </motion.div>

      <div
        aria-hidden
        className={cn(layout.shadow, "rounded-[100%] bg-deep/20 blur-md")}
      />
    </div>
  );
}
