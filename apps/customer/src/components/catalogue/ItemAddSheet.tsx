"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { textareaClass } from "@/components/ui/Input";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  item: Item | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (opts: { variantId?: string; qty: number; note?: string }) => void;
};

export function ItemAddSheet({ item, open, onClose, onConfirm }: Props) {
  const [variantId, setVariantId] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const price = useMemo(() => {
    if (!item) return 0;
    if (variantId && item.variants?.length) {
      return item.variants.find((v) => v.id === variantId)?.price ?? item.basePrice;
    }
    return item.basePrice;
  }, [item, variantId]);

  if (!item) return null;

  const image = item.images?.[0] || ITEM_PLACEHOLDER;
  const hasVariants = (item.variants?.length ?? 0) > 0;
  const soldOut = item.status === "sold_out";

  return (
    <BottomSheet open={open} onClose={onClose} title={item.name}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.05 }}
        className="relative mb-4 aspect-[16/11] overflow-hidden rounded-[24px] bg-gradient-to-br from-blush-soft to-blush"
      >
        <Image src={image} alt="" fill className="object-cover" sizes="480px" unoptimized />
        <span className="absolute left-3 top-3">
          <Badge status={item.status} className="bg-white/90" />
        </span>
      </motion.div>

      <div className="mb-4 flex items-start justify-between gap-3">
        {item.description ? (
          <p className="text-sm leading-relaxed text-deep/65">{item.description}</p>
        ) : (
          <span />
        )}
        <p className="shrink-0 font-display text-xl font-semibold text-deep">{formatNgn(price)}</p>
      </div>

      {hasVariants ? (
        <div className="mb-5 space-y-2">
          <p className="text-sm font-semibold text-deep">Choose size</p>
          <div className="flex flex-wrap gap-2">
            {item.variants!.map((v) => (
              <motion.button
                whileTap={{ scale: 0.95 }}
                key={v.id}
                type="button"
                onClick={() => setVariantId(v.id)}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm font-medium transition",
                  variantId === v.id
                    ? "border-deep bg-deep text-white"
                    : "border-deep/15 bg-white text-deep/80",
                )}
              >
                {v.name} · {formatNgn(v.price)}
              </motion.button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex items-center justify-between rounded-2xl bg-off-white px-4 py-3">
        <span className="text-sm font-semibold text-deep">Quantity</span>
        <QtyStepper value={qty} min={1} max={item.maxQty} onChange={setQty} className="bg-white" />
      </div>

      <label className="mb-6 block text-sm">
        <span className="mb-1.5 block pl-1 font-semibold text-deep">Note (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. Write Happy Birthday on the cake"
          className={textareaClass}
        />
      </label>

      <Button
        fullWidth
        variant="dark"
        leftIcon={<ShoppingBag size={18} />}
        disabled={soldOut || (hasVariants && !variantId)}
        onClick={() => {
          onConfirm({ variantId, qty, note: note.trim() || undefined });
          onClose();
          setQty(1);
          setNote("");
          setVariantId(undefined);
        }}
      >
        {soldOut ? "Sold out" : `Add to order · ${formatNgn(price * qty)}`}
      </Button>
    </BottomSheet>
  );
}
