"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { LIVE_ORDER_STATUSES } from "@/lib/admin-nav";
import { fetchAdminOrder, orderCustomerLabel } from "@/lib/admin-orders";
import type { AdminListResponse, AdminOrderRow, Order } from "@/lib/types";
import { formatNgn } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { cn } from "@/lib/cn";
import { OrderDetailPanel } from "@/components/admin/OrderDetailPanel";
import { toast } from "@/components/ui/Toast";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";

export default function AdminLiveOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrderRow | null>(null);
  const [view, setView] = useState<"board" | "list">("board");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AdminListResponse<AdminOrderRow>>("/admin/orders", {
        limit: 100,
        page: 1,
      });
      const live = res.items.filter((o) =>
        (LIVE_ORDER_STATUSES as readonly string[]).includes(o.status),
      );
      setOrders(live);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void (async () => {
      try {
        const o = await fetchAdminOrder(selectedId);
        setDetail(o as AdminOrderRow);
      } catch {
        toast("Could not load order");
      }
    })();
  }, [selectedId]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter)),
    [orders, statusFilter],
  );

  const onOrderUpdated = (order: Order) => {
    setDetail(order as AdminOrderRow);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
    void load();
  };

  const card = (order: AdminOrderRow) => (
    <button
      type="button"
      key={order.id}
      onClick={() => setSelectedId(order.id)}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition hover:border-tea/40",
        selectedId === order.id ? "border-tea bg-sage/10" : "border-deep/10 bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{order.orderNo}</span>
        <Badge status={order.status} />
      </div>
      <p className="mt-1 truncate text-sm">{orderCustomerLabel(order)}</p>
      <p className="text-xs text-deep/55">{formatNgn(order.total)}</p>
    </button>
  );

  return (
    <>
      <AdminPageTitle title="Live orders" />
      <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            view === "board" ? "bg-deep text-white" : "bg-white text-deep",
          )}
          onClick={() => setView("board")}
        >
          Board
        </button>
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold",
            view === "list" ? "bg-deep text-white" : "bg-white text-deep",
          )}
          onClick={() => setView("list")}
        >
          List
        </button>
        {LIVE_ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize",
              statusFilter === s ? "bg-blush text-deep" : "bg-white text-deep/70",
            )}
            onClick={() => setStatusFilter((f) => (f === s ? "all" : s))}
          >
            {s.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          {loading && !orders.length ? (
            <ColumnLoader columns={1} count={6} aspect="h-20 aspect-auto" className="sm:grid-cols-2 xl:grid-cols-3" />
          ) : view === "list" || statusFilter !== "all" ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(card)}</div>
          ) : (
            <>
              <div className="hidden gap-3 lg:grid lg:grid-cols-3 xl:grid-cols-6">
                {LIVE_ORDER_STATUSES.map((status) => (
                  <div key={status}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-deep/50">
                      {status.replaceAll("_", " ")}
                    </p>
                    <div className="flex flex-col gap-2">
                      {orders.filter((o) => o.status === status).map(card)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:hidden">{orders.map(card)}</div>
            </>
          )}
        </div>

        {detail ? (
          <aside className="hidden w-full max-w-md shrink-0 rounded-2xl border border-deep/10 bg-white p-4 lg:block">
            <OrderDetailPanel
              order={detail}
              onUpdated={onOrderUpdated}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        ) : null}
      </div>

      {detail && selectedId ? (
        <div className="fixed inset-0 z-[60] bg-deep/40 p-4 lg:hidden" onClick={() => setSelectedId(null)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-3xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <OrderDetailPanel order={detail} onUpdated={onOrderUpdated} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
