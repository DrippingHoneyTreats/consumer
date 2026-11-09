"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Trash2 } from "lucide-react";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { cn } from "@/lib/cn";

export type CurrentOrderLine = {
  key: string;
  name: string;
  qty: number;
  unitPrice: number;
  image?: string;
};

type Props = {
  href: string;
  title?: string;
  dateLabel?: string;
  lines: CurrentOrderLine[];
  total: number;
  onQtyChange: (key: string, qty: number) => void;
  className?: string;
};

export function CurrentOrderCard({
  href,
  title = "Current order",
  dateLabel = "Not paid yet",
  lines,
  total,
  onQtyChange,
  className,
}: Props) {
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-card)] ring-1 ring-deep/5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-deep/5 px-4 py-4 md:px-6 md:py-5">
        <div className="min-w-0">
          <p className="font-display text-xl text-deep md:text-2xl">{title}</p>
          <p className="mt-0.5 text-xs text-deep/45">
            {dateLabel} · {count} item{count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block rounded-full bg-honey-soft px-2.5 py-1 text-[11px] font-bold text-deep">
            Draft
          </span>
          <p className="mt-2 font-display text-2xl font-semibold text-deep">{formatNgn(total)}</p>
        </div>
      </div>

      <ul className="space-y-2.5 p-3 md:p-4">
        {lines.map((line) => (
          <li
            key={line.key}
            className="flex items-center gap-3 rounded-2xl border border-dashed border-deep/10 bg-off-white/80 px-3 py-2.5"
          >
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-cream">
              <Image src={line.image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="56px" unoptimized />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-deep">{line.name}</p>
              <p className="text-xs text-deep/50">
                {formatNgn(line.unitPrice)} each ·{" "}
                <span className="font-semibold text-deep">{formatNgn(line.unitPrice * line.qty)}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <QtyStepper size="sm" value={line.qty} min={0} max={99} onChange={(q) => onQtyChange(line.key, q)} />
              <button
                type="button"
                aria-label={`Remove ${line.name}`}
                onClick={() => onQtyChange(line.key, 0)}
                className="pressable flex h-8 w-8 items-center justify-center rounded-full text-deep/35 hover:bg-blush-soft hover:text-blush-deep"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 border-t border-deep/5 px-4 py-3 md:px-6">
        <Link
          href={href}
          className="pressable flex flex-1 items-center justify-center gap-2 rounded-full bg-deep py-3.5 text-sm font-semibold text-white"
        >
          Review & pay <ArrowRight size={15} />
        </Link>
      </div>
    </motion.article>
  );
}
