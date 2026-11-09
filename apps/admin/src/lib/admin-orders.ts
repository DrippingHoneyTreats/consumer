import { apiClient } from "@/lib/api";
import type { AdminOrderRow, Order } from "@/lib/types";

export async function fetchAdminOrder(id: string): Promise<Order> {
  try {
    return await apiClient.get<Order>(`/admin/orders/${id}`);
  } catch {
    return apiClient.get<Order>(`/orders/${id}`);
  }
}

export function playNewOrderBeep(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    window.setTimeout(() => void ctx.close(), 300);
  } catch {
    /* optional */
  }
}

export function orderCustomerLabel(order: AdminOrderRow): string {
  return order.user?.fullName ?? "Guest";
}
