"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, RotateCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Button } from "./Button";

export function EmptyState({
  title,
  description,
  message,
  actionHref,
  actionLabel,
  onAction,
  actionIcon,
  icon,
  image,
  compact,
  className,
}: {
  title: string;
  /** Prefer `message`; `description` kept for older call sites */
  description?: string;
  message?: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  icon?: ReactNode;
  /** Optional illustration (admin/customer empty slots) */
  image?: string;
  compact?: boolean;
  className?: string;
}) {
  const body = message ?? description;
  const button = actionLabel ? (
    <Button variant="dark" leftIcon={actionIcon ?? <Plus size={16} />} onClick={actionHref ? undefined : onAction}>
      {actionLabel}
    </Button>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "rounded-[26px] border border-dashed border-deep/10 bg-white/60 px-5 py-8" : "px-6 py-14",
        className,
      )}
    >
      <div className="relative mb-2">
        <span className="absolute -inset-4 rounded-full bg-blush-soft blur-xl" />
        {image ? (
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={cn("relative", compact ? "h-16 w-20" : "h-20 w-28")}
          >
            <Image src={image} alt="" fill className="object-contain" unoptimized />
          </motion.div>
        ) : (
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "relative flex items-center justify-center bg-gradient-to-br from-blush-soft to-blush text-deep shadow-[var(--shadow-card)]",
              compact ? "h-16 w-16 rounded-[22px]" : "h-20 w-20 rounded-[28px]",
            )}
          >
            {icon ?? <Plus size={compact ? 24 : 30} />}
          </motion.div>
        )}
      </div>
      <h3 className={cn("font-display text-deep", compact ? "text-xl" : "text-2xl")}>{title}</h3>
      {body ? <p className="max-w-xs text-sm leading-relaxed text-deep/60">{body}</p> : null}
      {button ? (
        actionHref ? (
          <Link href={actionHref} className="mt-2">
            {button}
          </Link>
        ) : (
          <div className="mt-2">{button}</div>
        )
      ) : null}
    </motion.div>
  );
}

export function OfflineState({ onRetry, compact, className }: { onRetry: () => void; compact?: boolean; className?: string }) {
  return (
    <EmptyState
      compact={compact}
      className={className}
      icon={<WifiOff size={compact ? 22 : 28} />}
      title="We couldn't reach the kitchen"
      message="Check your connection and try again."
      actionLabel="Try again"
      actionIcon={<RotateCw size={16} />}
      onAction={onRetry}
    />
  );
}
