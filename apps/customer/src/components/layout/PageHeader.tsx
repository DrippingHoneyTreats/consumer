"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  backHref,
  onBack,
  right,
  showBrand = false,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Fallback when there is no browser history (e.g. opened via deep link). */
  backHref?: string;
  /** Prefer this over history when provided (multi-step flows). */
  onBack?: () => void;
  right?: ReactNode;
  /** Brand mark — only for home/welcome; off by default on inner pages. */
  showBrand?: boolean;
}) {
  const router = useRouter();

  function goBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.push("/");
  }

  const showBack = Boolean(backHref || onBack);

  return (
    <header className="mb-4 pt-2">
      {showBrand || showBack || right ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          {showBack ? (
            <button
              type="button"
              onClick={goBack}
              className="glass pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 text-deep shadow-[var(--shadow-card)]"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
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
