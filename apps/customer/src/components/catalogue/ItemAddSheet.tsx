"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ShoppingBag } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import type { CatalogueItem } from "@/lib/catalogue-types";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  item: Item | CatalogueItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (opts: { variantId?: string; qty: number }) => void;
};

function isCatalogue(item: Item | CatalogueItem): item is CatalogueItem {
  return "nutrition" in item || "ingredients" in item || "fibre" in item || "rating" in item;
}

function variantSectionLabel(categoryId: string): string {
  switch (categoryId) {
    case "cat-chinchin":
      return "Choose jar size";
    case "cat-doughnuts":
    case "cat-puff-puff":
    case "cat-meat-pie":
      return "Choose package";
    case "cat-cakes":
    default:
      return "Choose size";
  }
}

export function ItemAddSheet({ item, open, onClose, onConfirm }: Props) {
  const [variantId, setVariantId] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [openPanel, setOpenPanel] = useState<"ingredients" | "nutrition" | null>("ingredients");

  const price = useMemo(() => {
    if (!item) return 0;
    if (variantId && item.variants?.length) {
      return item.variants.find((v) => v.id === variantId)?.price ?? item.basePrice;
    }
    return item.basePrice;
  }, [item, variantId]);

  if (!item) return null;

  const rich = isCatalogue(item) ? item : null;
  const images = item.images?.length ? item.images : [ITEM_PLACEHOLDER];
  const image = images[Math.min(imgIdx, images.length - 1)];
  const hasVariants = (item.variants?.length ?? 0) > 0;
  const soldOut = item.status === "sold_out";

  return (
    <BottomSheet open={open} onClose={onClose} title={item.name}>
      <div className="mb-4 flex gap-3">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.05 }}
          className="relative aspect-square w-[72%] overflow-hidden rounded-[24px] bg-cream"
        >
          <Image src={image} alt="" fill className="object-cover" sizes="360px" unoptimized />
          <span className="absolute left-3 top-3">
            <Badge status={item.status} className="bg-white/90" />
          </span>
          {rich?.badge ? (
            <span className="absolute bottom-3 left-3 rounded-full bg-honey px-2.5 py-1 text-[10px] font-bold uppercase text-deep">
              {rich.badge}
            </span>
          ) : null}
        </motion.div>
        {images.length > 1 ? (
          <div className="flex w-[26%] flex-col gap-2">
            {images.slice(0, 3).map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setImgIdx(i)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-2xl ring-2 transition",
                  imgIdx === i ? "ring-deep" : "ring-transparent opacity-80",
                )}
              >
                <Image src={src} alt="" fill className="object-cover" sizes="96px" unoptimized />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {item.description ? <p className="text-sm leading-relaxed text-deep/65">{item.description}</p> : null}
        </div>
        <p className="shrink-0 font-display text-xl font-semibold text-deep">{formatNgn(price)}</p>
      </div>

      {hasVariants ? (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-semibold text-deep">{variantSectionLabel(item.categoryId)}</p>
          <div className="flex flex-wrap gap-2">
            {item.variants!.map((v) => (
              <motion.button
                whileTap={{ scale: 0.95 }}
                key={v.id}
                type="button"
                onClick={() => setVariantId(v.id)}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm font-medium transition",
                  variantId === v.id ? "border-deep bg-deep text-white" : "border-deep/15 bg-white text-deep/80",
                )}
              >
                {v.name} · {formatNgn(v.price)}
              </motion.button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-off-white px-4 py-3">
        <span className="text-sm font-semibold text-deep">Quantity</span>
        <QtyStepper value={qty} min={1} max={item.maxQty} onChange={setQty} className="bg-white" />
      </div>

      {rich?.ingredients || rich?.nutrition ? (
        <div className="mb-6 space-y-2">
          {(
            [
              rich.ingredients?.length ? ("ingredients" as const) : null,
              rich.nutrition ? ("nutrition" as const) : null,
            ].filter(Boolean) as Array<"ingredients" | "nutrition">
          ).map((key) => (
            <div key={key} className="overflow-hidden rounded-2xl bg-off-white">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-deep"
                onClick={() => setOpenPanel((p) => (p === key ? null : key))}
              >
                {key === "ingredients" ? "Ingredients" : "Nutrition info"}
                <ChevronDown size={16} className={cn("transition", openPanel === key && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {openPanel === key ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 px-4 pb-3 text-sm text-deep/70">
                      {key === "ingredients" && rich.ingredients ? (
                        <>
                          <p>{rich.ingredients.join(", ")}</p>
                          {rich.fibre?.flavourIdeas?.length ? (
                            <p>
                              <span className="font-semibold text-deep">Flavour ideas:</span>{" "}
                              {rich.fibre.flavourIdeas.join(" · ")}
                            </p>
                          ) : null}
                        </>
                      ) : null}
                      {key === "nutrition" && rich.nutrition ? (
                        <>
                          <p>
                            {rich.nutrition.kcal} kcal · {rich.nutrition.fat} fat · {rich.nutrition.carbs} carbs ·{" "}
                            {rich.nutrition.protein} protein · {rich.nutrition.fibre} fibre
                          </p>
                          {rich.fibre?.targetPer100g ? (
                            <p>
                              <span className="font-semibold text-deep">Fibre target:</span>{" "}
                              {rich.fibre.targetPer100g} / 100g
                            </p>
                          ) : null}
                          {rich.fibre?.tip ? <p className="text-tea">{rich.fibre.tip}</p> : null}
                        </>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          ))}
        </div>
      ) : null}

      <Button
        fullWidth
        variant="dark"
        leftIcon={<ShoppingBag size={18} />}
        disabled={soldOut || (hasVariants && !variantId)}
        onClick={() => {
          onConfirm({ variantId, qty });
          onClose();
          setQty(1);
          setVariantId(undefined);
          setImgIdx(0);
        }}
      >
        {soldOut ? "Sold out" : `Order now · ${formatNgn(price * qty)}`}
      </Button>
    </BottomSheet>
  );
}
