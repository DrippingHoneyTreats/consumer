"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  id,
  className,
}: {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  id: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("flex rounded-full border border-deep/5 bg-white p-1 shadow-[var(--shadow-card)]", className)}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "relative min-h-10 flex-1 rounded-full px-3 text-xs font-semibold transition-colors",
              active ? "text-deep" : "text-deep/50",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-blush"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
