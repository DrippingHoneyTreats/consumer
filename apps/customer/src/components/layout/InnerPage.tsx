"use client";

import { createContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, MessageCircle, type LucideIcon } from "lucide-react";
import { contactLink } from "@/lib/format";
import { cn } from "@/lib/cn";

/** True inside <InnerPage>: StickyActions also render at the end of the content on desktop. */
export const InlineActionsContext = createContext(false);

export type PanelFact = { icon: LucideIcon; value: ReactNode; label: string };

/**
 * Inner-page layout: a side panel + a content sheet.
 *
 * Desktop/tablet (md+): one rounded sheet split in two. The left panel holds
 * a gradient header (title, back), key facts (icon · value · label), optional
 * actions and a help link; the right side holds the page content as
 * sections separated by thin dividers.
 *
 * Phone: the gradient header on top, the facts as a compact 2-column card,
 * then the content card. Main buttons live in the sticky bottom bar.
 */
export function InnerPage({
  title,
  subtitle,
  eyebrow,
  backHref,
  onBack,
  right,
  hero,
  facts,
  actions,
  aside,
  help = "Hi DHT, I need some help",
  tabbed = false,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backHref?: string;
  onBack?: () => void;
  right?: ReactNode;
  /** Extra content in the gradient header (e.g. a big total). */
  hero?: ReactNode;
  /** Key facts listed in the panel. */
  facts?: PanelFact[];
  /** Panel buttons (desktop/tablet only — phones use the sticky bar). */
  actions?: ReactNode;
  /** Extra panel content (desktop/tablet only). */
  aside?: ReactNode;
  /** WhatsApp help message for the panel's help link; false hides it. */
  help?: string | false;
  /** Page sits above the bottom tab bar. */
  tabbed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(tabbed ? "page-pad" : "page-pad-no-tab", className)}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-6xl space-y-4 md:grid md:grid-cols-[280px_minmax(0,1fr)] md:space-y-0 md:overflow-clip md:rounded-[32px] md:bg-white md:shadow-[var(--shadow-card)] md:ring-1 md:ring-deep/5 lg:grid-cols-[330px_minmax(0,1fr)]"
      >
        {/* —— Side panel —— */}
        <aside className="md:border-r md:border-deep/5 md:bg-[#f7f4ef]">
          <div className="space-y-4 md:sticky md:top-4 md:space-y-6 md:p-5 lg:p-6">
            <PanelHero title={title} subtitle={subtitle} eyebrow={eyebrow} backHref={backHref} onBack={onBack} right={right}>
              {hero}
            </PanelHero>

            {facts?.length ? (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 md:grid-cols-1 md:rounded-none md:bg-transparent md:p-0 md:shadow-none md:ring-0">
                {facts.map(({ icon: Icon, value, label }) => (
                  <li key={label} className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-tea shadow-sm ring-1 ring-deep/5 md:bg-white">
                      <Icon size={16} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-semibold leading-snug text-deep">{value}</span>
                      <span className="block text-xs text-deep/50">{label}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {actions ? <div className="hidden space-y-2 md:block">{actions}</div> : null}

            {aside ? <div className="hidden border-t border-deep/8 pt-5 text-sm text-deep/65 md:block">{aside}</div> : null}

            {help ? (
              <div className="hidden border-t border-deep/8 pt-5 md:block">
                <p className="text-xs font-semibold text-deep/45">Need a hand?</p>
                <a
                  href={contactLink(help)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-tea hover:text-deep"
                >
                  <MessageCircle size={15} /> Chat with us on WhatsApp
                </a>
              </div>
            ) : null}
          </div>
        </aside>

        {/* —— Content —— */}
        <InlineActionsContext.Provider value>
          <div className="min-w-0 rounded-[28px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5 sm:p-5 md:rounded-none md:p-7 md:shadow-none md:ring-0 lg:p-9">
            <div className="mx-auto max-w-[720px]">{children}</div>
          </div>
        </InlineActionsContext.Provider>
      </motion.div>
    </div>
  );
}

function PanelHero({
  title,
  subtitle,
  eyebrow,
  backHref,
  onBack,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backHref?: string;
  onBack?: () => void;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const router = useRouter();
  const showBack = Boolean(backHref || onBack);

  function goBack() {
    if (onBack) return onBack();
    if (window.history.length > 1) return router.back();
    router.push(backHref || "/");
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(140deg,#3f5f46_0%,#6a8568_55%,#f0b7c0_100%)] p-5 text-white shadow-[var(--shadow-card)] md:rounded-[24px]">
      <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-blush/30 blur-2xl" aria-hidden />
      {showBack || right ? (
        <div className="relative mb-5 flex items-center justify-between gap-3">
          {showBack ? (
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
            >
              <ChevronLeft size={19} />
            </button>
          ) : (
            <span />
          )}
          {right}
        </div>
      ) : null}
      <div className="relative">
        {eyebrow ? (
          <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-2 font-display text-[28px] leading-tight lg:text-[32px]">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-white/75">{subtitle}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}

/** A content section with a small heading, separated from the next by a thin line. */
export function PageSection({
  title,
  action,
  className,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("border-t border-deep/8 py-6 first:border-t-0 first:pt-0 last:pb-0", className)}>
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-sm font-semibold text-deep/55">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
