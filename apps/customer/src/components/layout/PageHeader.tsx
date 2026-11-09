"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  backHref,
  right,
  showBrand = true,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backHref?: string;
  right?: ReactNode;
  /** Show DHT mark in the header (default on for brand presence). */
  showBrand?: boolean;
}) {
  return (
    <header className="mb-4 pt-2">
      {showBrand || backHref || right ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="glass pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 text-deep shadow-[var(--shadow-card)]"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </Link>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <div className="flex shrink-0 items-center gap-2">
            {right}
            {showBrand ? <BrandLogo size="md" /> : null}
          </div>
        </div>
      ) : null}
      {eyebrow ? (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-tea">{eyebrow}</p>
      ) : null}
      <h1 className="font-display text-[28px] leading-tight text-deep">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-deep/60">{subtitle}</p> : null}
    </header>
  );
}

export function IconButton({
  href,
  label,
  children,
  badge,
}: {
  href: string;
  label: string;
  children: ReactNode;
  badge?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="glass pressable relative flex h-11 w-11 items-center justify-center rounded-full border border-white/80 text-deep shadow-[var(--shadow-card)]"
    >
      {children}
      {badge ? (
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-blush-deep ring-2 ring-white" />
      ) : null}
    </Link>
  );
}
