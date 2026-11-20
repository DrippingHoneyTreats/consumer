"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

type Props = {
  order: Order;
  onUpdated: (order: Order) => void;
};

export function StatusActionBar({ order, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [riderName, setRiderName] = useState(order.delivery?.riderName ?? "");
  const [riderPhone, setRiderPhone] = useState(order.delivery?.riderPhone ?? "");
  const [etaMinutes, setEtaMinutes] = useState(String(order.delivery?.etaMinutes ?? 30));

  const patchStatus = async (status: string, note?: string) => {
    setLoading(true);
    try {
      const updated = await apiClient.patch<Order>(`/admin/orders/${order.id}/status`, {
        status,
        note,
      });
      onUpdated(updated);
      toast.success("Order updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const submitDelivery = async () => {
    if (!riderName.trim() || !riderPhone.trim()) {
      toast.error("Rider name and phone are required");
      return;
    }
    const eta = Number(etaMinutes);
    if (!Number.isFinite(eta) || eta < 1) {
      toast.error("Enter a valid ETA in minutes");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post(`/admin/orders/${order.id}/delivery`, {
        riderName: riderName.trim(),
        riderPhone: riderPhone.trim(),
        etaMinutes: eta,
      });
      const refreshed = await apiClient.get<Order>(`/admin/orders/${order.id}`);
      onUpdated(refreshed);
      setDeliveryOpen(false);
      toast.success("Rider assigned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delivery update failed");
    } finally {
      setLoading(false);
    }
  };

  const canCancel = ["placed", "seen", "accepted"].includes(order.status);

  return (
    <div className="mt-3 flex flex-col gap-3">
      {["delivered", "completed", "cancelled", "payment_failed"].includes(order.status) ? (
        <p className="rounded-xl bg-off-white px-3 py-2.5 text-sm text-deep/65">
          {order.status === "cancelled" ? "This order was cancelled." : "This order is finished. No further steps."}
        </p>
      ) : null}
      <div className="grid gap-2 [&>button]:w-full">
        {order.status === "seen" || order.status === "placed" ? (
          <Button loading={loading} onClick={() => patchStatus("accepted")}>
            Accept
          </Button>
        ) : null}
        {order.status === "accepted" ? (
          <Button loading={loading} onClick={() => patchStatus("preparing")}>
            Preparing
          </Button>
        ) : null}
        {order.status === "preparing" ? (
          <Button loading={loading} onClick={() => patchStatus("ready_for_delivery")}>
            {order.fulfillment === "pickup" ? "Ready for pickup" : "Ready"}
          </Button>
        ) : null}
        {order.status === "ready_for_delivery" && order.fulfillment === "pickup" ? (
          <Button loading={loading} onClick={() => patchStatus("delivered", "Picked up by customer")}>
            Picked up
          </Button>
        ) : null}
        {order.status === "ready_for_delivery" && order.fulfillment !== "pickup" ? (
          <Button loading={loading} onClick={() => setDeliveryOpen(true)}>
            Out for delivery
          </Button>
        ) : null}
        {order.status === "out_for_delivery" ? (
          <Button loading={loading} onClick={() => patchStatus("delivered")}>
            Delivered
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="danger" loading={loading} onClick={() => setRejectOpen(true)}>
            Reject
          </Button>
        ) : null}
      </div>

      {deliveryOpen ? (
        <div className="rounded-2xl border border-deep/10 bg-off-white/80 p-4">
          <p className="mb-3 text-sm font-semibold text-deep">Delivery details</p>
          <div className="grid gap-3">
            <Input label="Rider name" value={riderName} onChange={(e) => setRiderName(e.target.value)} />
            <Input label="Rider phone" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)} />
            <Input
              label="ETA (minutes)"
              type="number"
              min={1}
              value={etaMinutes}
              onChange={(e) => setEtaMinutes(e.target.value)}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={loading} onClick={() => submitDelivery()}>
              Dispatch
            </Button>
            <Button variant="ghost" onClick={() => setDeliveryOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {rejectOpen ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4">
          <Input
            label="Reason for rejection"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Out of stock, closed kitchen…"
          />
          <div className="mt-3 flex gap-2">
            <Button
              variant="danger"
              loading={loading}
              onClick={() => patchStatus("cancelled", rejectReason.trim() || "Rejected by admin")}
            >
              Confirm reject
            </Button>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
