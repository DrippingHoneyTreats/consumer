"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { LOGO } from "@/lib/placeholders";

type Size = "sm" | "md" | "lg" | "hero";

const box: Record<Size, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12 md:h-14 md:w-14",
  lg: "h-14 w-14 md:h-16 md:w-16",
  hero: "h-28 w-32 md:h-32 md:w-40",
};

/** Official DHT mark — transparent, no plate behind it. */
export function BrandLogo({
  size = "md",
  href = "/",
  withWordmark = false,
  className,
}: {
  size?: Size;
  href?: string | null;
  withWordmark?: boolean;
  className?: string;
}) {
  const mark = (
    <span className={cn("relative inline-block shrink-0", box[size])}>
      <Image
        src={LOGO}
        alt="Dripping Honey Treats"
        fill
        className="object-contain"
        sizes="160px"
        unoptimized
        priority={size === "hero" || size === "lg"}
      />
    </span>
  );

  const content = withWordmark ? (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {mark}
      <span className="min-w-0">
        <span className="block font-display text-lg leading-tight text-deep md:text-xl">Dripping Honey Treats</span>
        <span className="mt-0.5 block text-[11px] font-medium text-honey md:text-xs">…a taste you can&apos;t forget in a rush</span>
      </span>
    </span>
  ) : (
    <span className={className}>{mark}</span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="Dripping Honey Treats home" className="pressable inline-flex shrink-0">
      {content}
    </Link>
  );
}
