"use client";

import { Badge } from "@/components/ui/Badge";
import { formatNgn } from "@/lib/format";
import type { Order } from "@/lib/types";
import { StatusActionBar } from "@/components/admin/StatusActionBar";
import { orderCustomerLabel } from "@/lib/admin-orders";
import type { AdminOrderRow } from "@/lib/types";

export function OrderDetailPanel({
  order,
  onUpdated,
  onClose,
}: {
  order: AdminOrderRow;
  onUpdated: (order: Order) => void;
  onClose?: () => void;
}) {
  const addr = order.addressSnapshot as Record<string, string> | null | undefined;
  const pickup = order.fulfillment === "pickup";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-deep/10 pb-4">
        <div>
          <p className="font-display text-lg font-semibold">{order.orderNo}</p>
          <p className="text-sm text-deep/60">{orderCustomerLabel(order)}</p>
          <span
            className={
              pickup
                ? "mt-1 inline-block rounded-full bg-honey/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-deep"
                : "mt-1 inline-block rounded-full bg-sage/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-deep"
            }
          >
            {pickup ? "Pickup" : "Delivery"}
          </span>
          {order.user?.phone ? <p className="text-xs text-deep/50">{order.user.phone}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge status={order.status} />
          {onClose ? (
            <button type="button" className="text-sm font-medium text-tea" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <ul className="space-y-2 text-sm">
          {order.items.map((line) => (
            <li key={line.id} className="flex justify-between gap-2">
              <span>
                {line.qty}× {line.nameSnapshot}
              </span>
              <span className="shrink-0 text-deep/70">{formatNgn(line.unitPrice * line.qty)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 border-t border-deep/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-deep/60">Subtotal</dt>
            <dd>{formatNgn(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-deep/60">Delivery</dt>
            <dd>{pickup ? "Pickup" : order.deliveryFee > 0 ? formatNgn(order.deliveryFee) : "Customer pays rider"}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Paid online</dt>
            <dd>{formatNgn(order.total)}</dd>
          </div>
        </dl>

        {pickup ? (
          <div className="mt-4 rounded-xl bg-honey/20 p-3 text-sm">
            <p className="font-medium">Customer will pick up</p>
            {addr?.contactPhone ? <p className="text-deep/75">Contact: {addr.contactPhone}</p> : null}
          </div>
        ) : addr?.formattedAddress || addr?.landmark ? (
          <div className="mt-4 rounded-xl bg-sage/15 p-3 text-sm">
            <p className="font-medium">Delivery address</p>
            <p className="text-deep/75">{addr.formattedAddress ?? addr.landmark}</p>
            {addr.contactPhone ? <p className="text-deep/75">Contact: {addr.contactPhone}</p> : null}
            {order.deliveryFeeAgreed ? (
              <p className="mt-1 text-xs text-deep/55">Customer agreed to pay the delivery fee to the rider.</p>
            ) : null}
          </div>
        ) : null}

        {order.notes ? (
          <p className="mt-3 text-sm text-deep/70">
            <span className="font-medium">Note:</span> {order.notes}
          </p>
        ) : null}
      </div>

      <StatusActionBar order={order} onUpdated={onUpdated} />
    </div>
  );
}
