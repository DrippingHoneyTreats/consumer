"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order } from "@/lib/types";
import { apiClient } from "@/lib/api";

/** Guest cart lines kept locally until login merge. */
export type GuestLine = {
  itemId: string;
  variantId?: string;
  qty: number;
  note?: string;
  name: string;
  unitPrice: number;
  image?: string;
};

type CartState = {
  draft: Order | null;
  guestItems: GuestLine[];
  /** Order-level note for rider/baker — collected before payment. */
  orderNote: string;
  setDraft: (order: Order | null) => void;
  setOrderNote: (note: string) => void;
  addGuestItem: (line: GuestLine) => void;
  updateGuestQty: (itemId: string, variantId: string | undefined, qty: number) => void;
  clearGuest: () => void;
  refreshDraft: () => Promise<Order | null>;
  mergeGuest: () => Promise<boolean>;
  itemCount: () => number;
};

let mergeInFlight: Promise<boolean> | null = null;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      draft: null,
      guestItems: [],
      orderNote: "",
      setDraft: (draft) => set({ draft }),
      setOrderNote: (orderNote) => set({ orderNote }),
      addGuestItem: (line) => {
        const items = [...get().guestItems];
        const idx = items.findIndex(
          (i) => i.itemId === line.itemId && i.variantId === line.variantId,
        );
        if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + line.qty };
        else items.push(line);
        set({ guestItems: items });
      },
      updateGuestQty: (itemId, variantId, qty) => {
        let items = [...get().guestItems];
        if (qty <= 0) {
          items = items.filter((i) => !(i.itemId === itemId && i.variantId === variantId));
        } else {
          items = items.map((i) =>
            i.itemId === itemId && i.variantId === variantId ? { ...i, qty } : i,
          );
        }
        set({ guestItems: items });
      },
      clearGuest: () => set({ guestItems: [], orderNote: "" }),
      refreshDraft: async () => {
        try {
          const res = await apiClient.get<{ data: Order[] }>("/orders", {
            tab: "ongoing",
            limit: 20,
          });
          const draft =
            res.data?.find((o) => o.status === "draft" || o.status === "pending_payment") ??
            null;
          set({ draft });
          return draft;
        } catch {
          return get().draft;
        }
      },
      mergeGuest: () => {
        if (mergeInFlight) return mergeInFlight;
        mergeInFlight = (async () => {
          const items = get().guestItems;
          try {
            if (items.length) {
              await apiClient.post("/auth/cart/merge", {
                items: items.map((g) => ({ itemId: g.itemId, variantId: g.variantId, qty: g.qty, note: g.note })),
              });
              set({ guestItems: [] });
            }
            await get().refreshDraft();
            return true;
          } catch {
            return false;
          } finally {
            mergeInFlight = null;
          }
        })();
        return mergeInFlight;
      },
      itemCount: () => {
        const guest = get().guestItems;
        if (guest.length) return guest.reduce((sum, i) => sum + i.qty, 0);
        return get().draft?.items?.reduce((sum, i) => sum + i.qty, 0) ?? 0;
      },
    }),
    {
      name: "dht-cart",
      partialize: (s) => ({ guestItems: s.guestItems, draft: s.draft, orderNote: s.orderNote }),
    },
  ),
);
