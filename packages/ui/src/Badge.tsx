import { cn } from "./cn";

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Not paid yet",
    pending_payment: "Awaiting payment",
    placed: "Order placed",
    seen: "We've got your order",
    accepted: "Accepted",
    preparing: "Being prepared",
    ready_for_delivery: "Ready for delivery",
    out_for_delivery: "On its way",
    delivered: "Delivered",
    cancelled: "Cancelled",
    payment_failed: "Payment failed",
    submitted: "Submitted",
    reviewing: "Reviewing",
    quote_sent: "Quote sent",
    confirmed: "Confirmed",
    completed: "Completed",
    available: "Available",
    few_left: "Few left",
    sold_out: "Sold out",
    pre_order: "Pre-order",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

const tone: Record<string, string> = {
  draft: "bg-cream text-deep",
  pending_payment: "bg-blush/50 text-deep",
  placed: "bg-sage/35 text-deep",
  seen: "bg-sage/35 text-deep",
  accepted: "bg-sage/45 text-deep",
  preparing: "bg-blush text-deep",
  ready_for_delivery: "bg-tea/20 text-deep",
  out_for_delivery: "bg-tea/30 text-deep",
  delivered: "bg-tea/25 text-deep",
  cancelled: "bg-danger/10 text-danger",
  payment_failed: "bg-danger/10 text-danger",
  available: "bg-tea/15 text-deep",
  few_left: "bg-blush/70 text-deep",
  sold_out: "bg-deep/10 text-deep/60",
  pre_order: "bg-sage/30 text-deep",
  submitted: "bg-sage/35 text-deep",
  reviewing: "bg-blush/50 text-deep",
  quote_sent: "bg-blush text-deep",
  confirmed: "bg-tea/25 text-deep",
  completed: "bg-tea/25 text-deep",
};

const dot: Record<string, string> = {
  available: "bg-tea",
  few_left: "bg-blush-deep",
  sold_out: "bg-deep/40",
  pre_order: "bg-sage",
  cancelled: "bg-danger",
  payment_failed: "bg-danger",
};

export function Badge({
  status,
  className,
  children,
}: {
  status?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const key = status ?? "";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold",
        tone[key] ?? "bg-off-white text-deep",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[key] ?? "bg-deep/60")} />
      {children ?? (status ? statusLabel(status) : null)}
    </span>
  );
}
