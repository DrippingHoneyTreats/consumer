"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export function UnderlineTabs<T extends string>({
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
    <div role="tablist" className={cn("flex items-end gap-5 border-b border-deep/10 md:gap-8", className)}>
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
              "relative pb-2.5 text-sm font-semibold transition-colors",
              active ? "text-deep" : "text-deep/40 hover:text-deep/70",
            )}
          >
            {t.label}
            {active ? (
              <motion.span
                layoutId={`underline-${id}`}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-deep"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
