"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { MouseEvent } from "react";
import { cn } from "@/lib/cn";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  float?: "soft" | "bold" | "none";
  parallax?: boolean;
  rounded?: string;
};

const floatPresets = {
  soft: {
    y: [0, -10, 0] as number[],
    rotate: [0, 1.5, -1, 0] as number[],
    duration: 5.5,
  },
  bold: {
    y: [0, -16, 0] as number[],
    rotate: [0, 3, -2, 0] as number[],
    duration: 6.8,
  },
  none: null,
};

/** Floating treat image with optional pointer parallax — Gen Z hero energy. */
export function FloatingImage({
  src,
  alt = "",
  className,
  imageClassName,
  sizes = "420px",
  priority,
  float = "soft",
  parallax = true,
  rounded = "rounded-[28px]",
}: Props) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 });
  const sy = useSpring(my, { stiffness: 120, damping: 18 });
  const rotateX = useTransform(sy, [-40, 40], [6, -6]);
  const rotateY = useTransform(sx, [-40, 40], [-8, 8]);
  const preset = floatPresets[float];

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (!parallax) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - rect.width / 2;
    const py = e.clientY - rect.top - rect.height / 2;
    mx.set(Math.max(-40, Math.min(40, px * 0.18)));
    my.set(Math.max(-40, Math.min(40, py * 0.18)));
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div
      className={cn("relative will-change-transform", className)}
      animate={preset ? { y: preset.y, rotate: preset.rotate } : undefined}
      transition={
        preset
          ? { duration: preset.duration, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <motion.div
        className={cn("relative h-full w-full overflow-hidden", rounded)}
        style={parallax ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className={cn("object-cover", imageClassName)}
          sizes={sizes}
          priority={priority}
          unoptimized
        />
      </motion.div>
    </motion.div>
  );
}
