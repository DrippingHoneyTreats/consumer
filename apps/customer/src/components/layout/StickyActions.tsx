"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Bottom action bar. `aboveTabs` lifts it over the tab bar on tabbed pages. */
export function StickyActions({
  children,
  aboveTabs,
  className,
}: {
  children: ReactNode;
  aboveTabs?: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 30, delay: 0.1 }}
      className={cn(
        "fixed left-1/2 z-30 w-full max-w-[var(--app-max)] -translate-x-1/2 px-4 md:px-6 lg:px-8",
        aboveTabs
          ? "bottom-[calc(var(--tab-h)+var(--safe-bottom)+4px)]"
          : "glass bottom-0 border-t border-deep/5 pb-[calc(12px+var(--safe-bottom))] pt-3",
        className,
      )}
    >
      {children}
    </motion.div>,
    document.body,
  );
}
