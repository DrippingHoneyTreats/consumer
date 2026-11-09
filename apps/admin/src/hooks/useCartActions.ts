"use client";

import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import type { Item, Order } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { toast } from "@/components/ui/Toast";

function lineName(item: Item, variantId?: string): string {
  if (!variantId || !item.variants?.length) return item.name;
  const v = item.variants.find((x) => x.id === variantId);
  return v ? `${item.name} · ${v.name}` : item.name;
}

function unitPrice(item: Item, variantId?: string): number {
  if (variantId && item.variants?.length) {
    return item.variants.find((v) => v.id === variantId)?.price ?? item.basePrice;
  }
  return item.basePrice;
}

export function useCartActions() {
  const user = useAuthStore((s) => s.user);
  const addGuestItem = useCartStore((s) => s.addGuestItem);
  const updateGuestQty = useCartStore((s) => s.updateGuestQty);
  const setDraft = useCartStore((s) => s.setDraft);
  const refreshDraft = useCartStore((s) => s.refreshDraft);
  const draft = useCartStore((s) => s.draft);

  async function addItem(opts: {
    item: Item;
    variantId?: string;
    qty?: number;
    note?: string;
  }) {
    const { item, variantId, qty = 1, note } = opts;
    if (item.status === "sold_out") {
      toast("This one is sold out for now.");
      return;
    }

    if (!user) {
      addGuestItem({
        itemId: item.id,
        variantId,
        qty,
        note,
        name: lineName(item, variantId),
        unitPrice: unitPrice(item, variantId),
        image: item.images?.[0],
      });
      toast("Added to your order");
      return;
    }

    try {
      const res = await apiClient.post<Order | { data: Order }>("/orders/draft/items", {
        itemId: item.id,
        variantId,
        qty,
        note,
      });
      const order = unwrapData(res) ?? (res as Order);
      setDraft(order);
      toast("Added to your order");
    } catch {
      toast("Could not add item. Please try again.");
    }
  }

  async function setQty(orderId: string, orderItemId: string, qty: number) {
    try {
      const res = await apiClient.patch<Order | { data: Order }>(
        `/orders/${orderId}/items/${orderItemId}`,
        { qty },
      );
      const order = unwrapData(res) ?? (res as Order);
      setDraft(order);
    } catch {
      toast("Could not update quantity.");
      await refreshDraft();
    }
  }

  function setGuestQty(itemId: string, variantId: string | undefined, qty: number) {
    updateGuestQty(itemId, variantId, qty);
  }

  function qtyInCart(itemId: string, variantId?: string): number {
    if (user && draft?.items) {
      return draft.items
        .filter((i) => i.itemId === itemId && (i.variantId ?? undefined) === variantId)
        .reduce((s, i) => s + i.qty, 0);
    }
    const guest = useCartStore.getState().guestItems;
    return guest
      .filter((i) => i.itemId === itemId && i.variantId === variantId)
      .reduce((s, i) => s + i.qty, 0);
  }

  return { addItem, setQty, setGuestQty, qtyInCart, draft, isLoggedIn: !!user };
}
