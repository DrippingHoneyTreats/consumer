"use client";

import { useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { InlineActionsContext } from "@/components/layout/InnerPage";

/**
 * Bottom action bar. `aboveTabs` lifts it over the tab bar on tabbed pages.
 * Phones: fixed to the bottom of the screen.
 * Desktop: inside <InnerPage> the actions sit, compact and right-aligned, at
 * the end of the content; elsewhere they float as a compact centred card.
 */
export function StickyActions({
  children,
  aboveTabs,
  mobileOnly,
  className,
}: {
  children: ReactNode;
  aboveTabs?: boolean;
  /** Phones only: the page shows these actions elsewhere on desktop (e.g. the side panel). */
  mobileOnly?: boolean;
  className?: string;
}) {
  const inline = useContext(InlineActionsContext);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bar = mounted
    ? createPortal(
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 340, damping: 30, delay: 0.1 }}
          className={cn(
            "fixed left-1/2 z-30 w-full -translate-x-1/2 px-4",
            aboveTabs
              ? "bottom-[calc(var(--tab-h)+var(--safe-bottom)+4px)] md:max-w-xl"
              : "glass bottom-0 border-t border-deep/5 pb-[calc(12px+var(--safe-bottom))] pt-3 md:bottom-5 md:max-w-xl md:rounded-[28px] md:border md:border-white/80 md:pb-3 md:shadow-[var(--shadow-float)]",
            (inline || mobileOnly) && "md:hidden",
            className,
          )}
        >
          {children}
        </motion.div>,
        document.body,
      )
    : null;

  return (
    <>
      {bar}
      {inline && !mobileOnly ? (
        <div className="mt-6 hidden border-t border-deep/8 pt-6 md:block">
          <div className="ml-auto max-w-sm">{children}</div>
        </div>
      ) : null}
    </>
  );
}
