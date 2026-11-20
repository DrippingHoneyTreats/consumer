"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { SwipeDeck } from "./SwipeDeck";

/**
 * Editorial building blocks for the browse pages (Orders, Events, Pastries,
 * collections, Account): outlined pill labels, bold headings, image stacks
 * with floating chips, a dark stat card, tilted numbered "how it works"
 * cards, a dark feature grid and a closing banner.
 */

const ease = [0.22, 1, 0.36, 1] as const;
const DARK = "bg-[#2c4232]";

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, ease },
};

// ───────────────────────── Labels & headings ─────────────────────────

export function Pill({ children, tone = "light", className }: { children: ReactNode; tone?: "light" | "dark"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold",
        tone === "light" ? "border-deep/20 bg-white/70 text-deep" : "border-white/25 bg-white/5 text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small hand-drawn style sparkle used as decoration next to headings. */
export function Doodle({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={cn("inline-flex text-honey", className)}
      animate={{ rotate: [0, 12, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <Sparkle size={28} strokeWidth={1.5} />
    </motion.span>
  );
}

export function SectionIntro({
  pill,
  title,
  text,
  action,
  align = "left",
  tone = "light",
  className,
}: {
  pill?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <motion.div
      {...reveal}
      className={cn(
        "mb-6 flex flex-col gap-4 md:mb-8",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-xl", align === "center" && "mx-auto")}>
        {pill ? <Pill tone={tone}>{pill}</Pill> : null}
        <h2
          className={cn(
            "mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-tight md:text-[38px]",
            tone === "light" ? "text-deep" : "text-white",
          )}
        >
          {title}
        </h2>
        {text ? (
          <p className={cn("mt-2 text-sm leading-relaxed md:text-base", tone === "light" ? "text-deep/60" : "text-white/65")}>{text}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </motion.div>
  );
}

// ───────────────────────── Buttons ─────────────────────────

/** Dark pill with a round arrow badge — the template's "Let's talk ↗". */
export function ArrowPill({
  href,
  children,
  external,
  tone = "dark",
  onClick,
  className,
}: {
  href?: string;
  children: ReactNode;
  external?: boolean;
  tone?: "dark" | "light" | "outline";
  onClick?: () => void;
  className?: string;
}) {
  const cls = cn(
    "pressable group inline-flex items-center gap-3 rounded-full py-1.5 pl-5 pr-1.5 text-sm font-semibold transition",
    tone === "dark" && "bg-deep text-white shadow-[0_12px_28px_-14px_rgba(44,66,50,0.9)] hover:bg-deep-soft",
    tone === "light" && "bg-white text-deep shadow-[var(--shadow-card)]",
    tone === "outline" && "border border-deep/20 bg-white/60 text-deep hover:border-deep/40",
    className,
  );
  const badge = (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition group-hover:rotate-45",
        tone === "dark" ? "bg-white text-deep" : "bg-deep text-white",
      )}
    >
      <ArrowUpRight size={16} />
    </span>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
        {badge}
      </button>
    );
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
        {badge}
      </a>
    );
  }
  return (
    <Link href={href ?? "#"} className={cls}>
      {children}
      {badge}
    </Link>
  );
}

// ───────────────────────── Hero ─────────────────────────

export function EditorialHero({
  pill,
  title,
  text,
  actions,
  footer,
  media,
  className,
}: {
  pill?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  actions?: ReactNode;
  /** Small content under the actions (e.g. city chips). */
  footer?: ReactNode;
  media?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid items-center gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-10", className)}>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="min-w-0">
        {pill ? <Pill>{pill}</Pill> : null}
        <h1 className="mt-4 font-display text-[38px] font-semibold leading-[1.02] tracking-tight text-deep sm:text-[46px] lg:text-[58px]">
          {title}
        </h1>
        {text ? <p className="mt-4 max-w-md text-[15px] leading-relaxed text-deep/60 md:text-base">{text}</p> : null}
        {actions ? <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div> : null}
        {footer ? <div className="mt-6">{footer}</div> : null}
      </motion.div>
      {media ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.08 }}
          className="min-w-0"
        >
          {media}
        </motion.div>
      ) : null}
    </section>
  );
}

/**
 * Big rounded image with a floating chip (top-left) and a dark caption pill
 * (bottom). Extra images show as small overlapping thumbnails in the chip.
 */
export function ImageStack({
  images,
  chipValue,
  chipLabel,
  caption,
  className,
}: {
  images: string[];
  chipValue?: ReactNode;
  chipLabel?: ReactNode;
  caption?: ReactNode;
  className?: string;
}) {
  const pics = images.filter(Boolean);
  const others = pics.slice(1);
  return (
    <div className={cn("relative mx-auto w-full max-w-[520px] pt-6 md:pt-8", className)}>
      <SwipeDeck
        all
        tone="none"
        label="Photos"
        items={pics.map((src, i) => (
          <div key={src + i} className="relative aspect-[5/4] overflow-hidden rounded-[32px] bg-cream shadow-[var(--shadow-float)] md:aspect-square">
            <Image src={src} alt="" fill draggable={false} className="object-cover" sizes="(min-width: 768px) 520px, 100vw" unoptimized priority={i === 0} />
            <span className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            {caption ? (
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1f2f24]/90 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur md:text-sm">
                {caption}
              </span>
            ) : null}
          </div>
        ))}
      />
      {chipValue ? (
        <motion.div
          initial={{ opacity: 0, y: -10, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -4 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 200, damping: 16 }}
          className="pointer-events-none absolute -left-2 top-0 z-[60] rounded-[20px] bg-white px-4 py-3 shadow-[var(--shadow-float)] ring-1 ring-deep/5 md:-left-6"
        >
          <p className="font-display text-xl font-semibold leading-none text-deep">{chipValue}</p>
          {chipLabel ? <p className="mt-1 text-[11px] text-deep/55">{chipLabel}</p> : null}
          {others.length ? (
            <div className="mt-2 flex -space-x-2">
              {others.slice(0, 4).map((src, i) => (
                <span key={i} className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-white">
                  <Image src={src} alt="" fill className="object-cover" sizes="28px" unoptimized />
                </span>
              ))}
            </div>
          ) : null}
        </motion.div>
      ) : null}
      <Doodle className="pointer-events-none absolute -right-1 top-2 z-[60] md:-right-4" />
    </div>
  );
}

// ───────────────────────── Strips & stats ─────────────────────────

/** "✦ Fresh daily ✦ Handmade ✦ …" scrolling strip (the template's logo row). */
export function TrustStrip({ items, className }: { items: string[]; className?: string }) {
  const loop = [...items, ...items, ...items, ...items];
  return (
    <div className={cn("relative overflow-hidden border-y border-deep/10 py-4", className)}>
      <motion.div
        className="flex w-max items-center gap-6"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, ease: "linear", repeat: Infinity }}
      >
        {loop.map((label, i) => (
          <span key={i} className="flex shrink-0 items-center gap-6 font-display text-lg text-deep/70 md:text-xl">
            {label}
            <Sparkle size={14} className="text-honey" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** Dark card with a big number, a label, wavy lines and tilted tag pills. */
export function StatCard({
  value,
  label,
  tags = [],
  className,
}: {
  value: ReactNode;
  label: ReactNode;
  tags?: string[];
  className?: string;
}) {
  return (
    <motion.div {...reveal} className={cn("relative overflow-hidden rounded-[28px] p-6 text-white md:p-7", DARK, className)}>
      <svg aria-hidden viewBox="0 0 400 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full opacity-25">
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M-20 ${150 - i * 10} C 80 ${60 - i * 6}, 180 ${210 - i * 8}, 420 ${70 + i * 6}`}
            fill="none"
            stroke="white"
            strokeWidth="0.8"
          />
        ))}
      </svg>
      <div className="relative">
        <p className="font-display text-[44px] font-semibold leading-none md:text-[54px]">{value}</p>
        <p className="mt-2 text-sm text-white/70">{label}</p>
        {tags.length ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <li
                key={t}
                className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-deep shadow-sm"
                style={{ transform: `rotate(${[-3, 2, -1, 3, -2][i % 5]}deg)` }}
              >
                {t}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </motion.div>
  );
}

// ───────────────────────── How it works ─────────────────────────

export type Step = { title: string; text: string; icon?: LucideIcon };

/** Tilted, pinned, numbered cards joined by a dashed path. */
export function ProcessSteps({ steps, note, className }: { steps: Step[]; note?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* Dashed connector (desktop) */}
      <svg aria-hidden viewBox="0 0 1000 400" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block">
        <path d="M120 120 C 300 20, 380 300, 500 200 S 760 40, 880 260" fill="none" stroke="var(--tea)" strokeWidth="2" strokeDasharray="6 8" opacity="0.5" />
      </svg>
      <SwipeDeck
        label="How it works"
        items={steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.title}>
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-deep/40">
                  {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
                </span>
                {Icon ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-soft text-tea">
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-display text-xl font-semibold text-deep">{s.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-deep/60">{s.text}</p>
            </div>
          );
        })}
      />
      <ol className="relative hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const tilt = [-3, 2.5, -2, 3][i % 4];
          return (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 30, rotate: 0 }}
              whileInView={{ opacity: 1, y: 0, rotate: tilt }}
              whileHover={{ rotate: 0, y: -4 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease, delay: i * 0.08 }}
              className={cn(
                "relative rounded-[24px] bg-white p-5 pt-7 shadow-[0_22px_40px_-24px_rgba(44,66,50,0.45)] ring-1 ring-deep/5",
                i % 2 === 1 && "lg:mt-16",
              )}
            >
              <span className="absolute left-1/2 top-3 h-3 w-3 -translate-x-1/2 rounded-full bg-deep shadow-[0_2px_0_rgba(0,0,0,0.15)]" aria-hidden />
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-deep/40">{String(i + 1).padStart(2, "0")}</span>
                {Icon ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-soft text-tea">
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-display text-xl font-semibold text-deep">{s.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-deep/60">{s.text}</p>
            </motion.li>
          );
        })}
      </ol>
      {note ? (
        <p className="mt-6 text-right font-display text-lg italic text-tea md:mt-8" aria-hidden>
          {note} ↝
        </p>
      ) : null}
    </div>
  );
}

// ───────────────────────── Dark sections ─────────────────────────

export type Feature = { title: string; text: string; icon: LucideIcon; href?: string };

export function FeatureGridDark({
  pill,
  title,
  text,
  items,
  className,
}: {
  pill?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  items: Feature[];
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-[32px] px-5 py-10 md:px-10 md:py-14", DARK, className)}>
      <span className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blush/10 blur-3xl" aria-hidden />
      <SectionIntro pill={pill} title={title} text={text} tone="dark" />
      <SwipeDeck
        tone="dark"
        label="Features"
        items={items.map(({ title: t, text: d, icon: Icon }) => (
          <div key={t}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-honey">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <p className="mt-4 font-semibold text-white">{t}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/65">{d}</p>
          </div>
        ))}
      />
      <ul className="relative hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {items.map(({ title: t, text: d, icon: Icon, href }, i) => {
          const body = (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-honey">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <p className="mt-4 font-semibold text-white">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">{d}</p>
            </>
          );
          const cls = "block h-full rounded-[22px] border border-white/12 bg-white/[0.03] p-5 transition hover:border-white/30 hover:bg-white/[0.06]";
          return (
            <motion.li
              key={t}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease, delay: i * 0.05 }}
            >
              {href ? (
                <Link href={href} className={cls}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

export function CtaBanner({
  title,
  text,
  actions,
  className,
}: {
  title: ReactNode;
  text?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      {...reveal}
      className={cn("relative overflow-hidden rounded-[32px] px-6 py-10 text-center text-white md:px-12 md:py-14", DARK, className)}
    >
      <span className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-honey/15 blur-3xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-blush/20 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-xl">
        <Doodle className="mb-3" />
        <h2 className="font-display text-[28px] font-semibold leading-tight md:text-[38px]">{title}</h2>
        {text ? <p className="mt-3 text-sm text-white/65 md:text-base">{text}</p> : null}
        {actions ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
      </div>
    </motion.section>
  );
}

/** Vertical rhythm wrapper for editorial pages. */
export function EditorialPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("page-pad", className)}>
    <div className="mx-auto max-w-6xl space-y-16 md:space-y-24">{children}</div>
  </div>;
}
