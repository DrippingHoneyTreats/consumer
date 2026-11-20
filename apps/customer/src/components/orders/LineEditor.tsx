"use client";

import { useState } from "react";
import { ApiRequestError, apiClient } from "@/lib/api";
import { getItemById } from "@/lib/catalogue";
import type { CatalogueItem } from "@/lib/catalogue-types";
import { useCartStore } from "@/store/cart-store";
import { lineName, unitPrice } from "@/hooks/useCartActions";
import { ItemAddSheet } from "@/components/catalogue/ItemAddSheet";
import { toast } from "@/components/ui/Toast";

/** What we need to know about the cart line being edited. */
export type EditableLine = {
  itemId: string;
  variantId?: string | null;
  qty: number;
  /** Saved order line id (signed-in orders). Absent for the guest cart. */
  lineId?: string;
  /** Order the line belongs to (overrides the hook's orderId). */
  orderId?: string;
  image?: string | null;
};

/**
 * Change a cart line's size/options and quantity in the same details sheet
 * used to add it. Works for the guest cart and for saved (draft) orders.
 *
 *   const editor = useLineEditor({ orderId, onSaved: reload });
 *   <button onClick={() => editor.edit(line)}>Edit</button>
 *   {editor.sheet}
 */
export function useLineEditor({ orderId, onSaved }: { orderId?: string | null; onSaved?: () => void } = {}) {
  const replaceGuestLine = useCartStore((s) => s.replaceGuestLine);
  const [line, setLine] = useState<EditableLine | null>(null);
  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [open, setOpen] = useState(false);

  async function edit(next: EditableLine) {
    setLine(next);
    const loaded = await getItemById(next.itemId);
    if (!loaded) {
      toast.error("We couldn't load this item. Please try again.");
      return;
    }
    setItem(loaded);
    setOpen(true);
  }

  async function save({ variantId, qty }: { variantId?: string; qty: number }): Promise<boolean> {
    if (!line || !item) return false;
    try {
      const oid = line.orderId ?? orderId;
      if (line.lineId && oid) {
        await apiClient.patch(`/orders/${oid}/items/${line.lineId}`, { qty, variantId: variantId ?? null });
      } else {
        replaceGuestLine(
          { itemId: line.itemId, variantId: line.variantId ?? undefined },
          {
            itemId: item.id,
            variantId,
            qty,
            name: lineName(item, variantId),
            unitPrice: unitPrice(item, variantId),
            image: item.images?.[0] ?? line.image ?? undefined,
          },
        );
      }
      toast.success("Item updated.");
      onSaved?.();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't update this item. Please try again.");
      return false;
    }
  }

  const sheet = (
    <ItemAddSheet
      item={item}
      open={open}
      onClose={() => setOpen(false)}
      onConfirm={(opts) => save(opts)}
      initialVariantId={line?.variantId ?? undefined}
      initialQty={line?.qty}
      confirmLabel="Update item"
    />
  );

  return { edit, sheet };
}
