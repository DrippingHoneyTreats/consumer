"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { isDraftStatus } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { toast } from "@/components/ui/Toast";
import { useCartStore } from "@/store/cart-store";

/**
 * Checkout pages: if this order was already paid (e.g. on another device or
 * tab), don't offer to pay again — go to tracking instead. Checks when the
 * page opens and whenever the customer comes back to the tab/app.
 */
export function useLeaveIfPaid(orderId: string | null | undefined) {
  const router = useRouter();
  const refreshDraft = useCartStore((s) => s.refreshDraft);
  const left = useRef(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    async function check() {
      if (left.current || document.visibilityState !== "visible") return;
      try {
        const res = await apiClient.get<Order | { data: Order }>(`/orders/${orderId}`);
        const order = unwrapData(res) ?? (res as Order);
        if (cancelled || left.current || !order?.status || isDraftStatus(order.status)) return;
        left.current = true;
        void refreshDraft();
        toast.info(order.status === "cancelled" ? "This order was cancelled." : "This order has already been paid.");
        router.replace(order.status === "cancelled" ? `/orders/${orderId}` : `/orders/${orderId}/track`);
      } catch {
        /* offline: the Pay button still guards on the server */
      }
    }

    void check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [orderId, router, refreshDraft]);
}
