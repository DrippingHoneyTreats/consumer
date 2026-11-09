import type { Order } from "@/lib/types";

const DRAFT_STATUSES = new Set(["draft", "pending_payment"]);

const ONGOING_STATUSES = new Set([
  "placed",
  "seen",
  "accepted",
  "preparing",
  "ready_for_delivery",
  "out_for_delivery",
]);

const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "payment_failed", "completed"]);

/** Customer-facing tracking milestones (no live map). */
export const TRACKING_STEPS = [
  { key: "placed", label: "Ordered", match: ["placed", "seen"] },
  { key: "accepted", label: "Confirmed", match: ["accepted"] },
  { key: "preparing", label: "Preparing", match: ["preparing", "ready_for_delivery"] },
  { key: "out_for_delivery", label: "On the way", match: ["out_for_delivery"] },
  { key: "delivered", label: "Delivered", match: ["delivered", "completed"] },
] as const;

const STEP_RANK: Record<string, number> = {
  placed: 0,
  seen: 0,
  accepted: 1,
  preparing: 2,
  ready_for_delivery: 2,
  out_for_delivery: 3,
  delivered: 4,
  completed: 4,
  cancelled: -1,
  payment_failed: -1,
  draft: -1,
  pending_payment: -1,
};

export function isDraftStatus(status: string): boolean {
  return DRAFT_STATUSES.has(status);
}

export function isOngoingStatus(status: string): boolean {
  return ONGOING_STATUSES.has(status);
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function trackingStepIndex(status: string): number {
  return STEP_RANK[status] ?? -1;
}

export function splitOrders(orders: Order[]) {
  const draft: Order[] = [];
  const ongoing: Order[] = [];
  const recent: Order[] = [];

  for (const order of orders) {
    if (isDraftStatus(order.status)) draft.push(order);
    else if (isOngoingStatus(order.status)) ongoing.push(order);
    else recent.push(order);
  }

  const byNewest = (a: Order, b: Order) => +new Date(b.createdAt) - +new Date(a.createdAt);
  draft.sort(byNewest);
  ongoing.sort(byNewest);
  recent.sort(byNewest);

  return { draft, ongoing, recent };
}

export function formatOrderDate(iso: string, opts?: { withYear?: boolean }) {
  try {
    return new Date(iso).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      ...(opts?.withYear === false ? {} : { year: "numeric" as const }),
    });
  } catch {
    return "";
  }
}

export function formatOrderDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function orderPlaceLabel(order: Order): string {
  const snap = order.addressSnapshot;
  if (!snap) return "Lagos";
  if (typeof snap.formattedAddress === "string" && snap.formattedAddress) return snap.formattedAddress;
  if (typeof snap.city === "string" && snap.city) return snap.city;
  return "Lagos";
}

export function orderProductsSummary(order: Order, max = 3): string {
  const names = order.items.map((i) => `${i.nameSnapshot} ×${i.qty}`);
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max} more`;
}

export type TimelineEntry = {
  status: string;
  label: string;
  at?: string;
  note?: string | null;
  state: "done" | "current" | "upcoming";
};

/** Build a vertical timeline from logs, or synthesize from current status. */
export function buildOrderTimeline(order: Order): TimelineEntry[] {
  const currentIdx = trackingStepIndex(order.status);
  const cancelled = order.status === "cancelled" || order.status === "payment_failed";

  if (cancelled) {
    const logs = order.statusLogs ?? [];
    return [
      {
        status: order.status,
        label: order.status === "payment_failed" ? "Payment failed" : "Cancelled",
        at: logs[logs.length - 1]?.createdAt ?? order.createdAt,
        note: logs[logs.length - 1]?.note,
        state: "current",
      },
    ];
  }

  const logByStatus = new Map<string, { createdAt: string; note?: string | null }>();
  for (const log of order.statusLogs ?? []) {
    const idx = trackingStepIndex(log.status);
    if (idx < 0) continue;
    const step = TRACKING_STEPS[idx];
    if (!step) continue;
    // Keep earliest log for each milestone key
    if (!logByStatus.has(step.key)) {
      logByStatus.set(step.key, { createdAt: log.createdAt, note: log.note });
    }
  }

  return TRACKING_STEPS.map((step, idx) => {
    const log = logByStatus.get(step.key);
    const state: TimelineEntry["state"] =
      currentIdx < 0 ? "upcoming" : currentIdx > idx ? "done" : currentIdx === idx ? "current" : "upcoming";
    return {
      status: step.key,
      label: step.label,
      at: log?.createdAt ?? (idx === 0 ? order.createdAt : undefined),
      note: log?.note,
      state,
    };
  });
}
