"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bike, Store } from "lucide-react";
import { apiClient } from "@/lib/api";
import { playNewOrderBeep } from "@/lib/admin-orders";
import type { AdminListResponse } from "@/lib/types";
import { formatNgn, statusLabel, timeAgo, orderStatusLabel } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { OfflineState } from "@/components/ui/EmptyState";
import { DataTable, FilterTabs, PageHeader, SearchBox, Toolbar, type Tab } from "@/components/admin/kit";

type Row = {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  createdAt: string;
  fulfillment?: "delivery" | "pickup";
  items: { qty: number }[];
  user?: { fullName?: string | null; phone?: string | null };
};

type View = "live" | "new" | "done" | "cancelled" | "all";

const VIEWS: Record<View, { label: string; statuses?: string }> = {
  live: { label: "In progress", statuses: "placed,seen,accepted,preparing,ready_for_delivery,out_for_delivery" },
  new: { label: "New", statuses: "placed,seen" },
  done: { label: "Delivered", statuses: "delivered,completed" },
  cancelled: { label: "Cancelled", statuses: "cancelled,payment_failed" },
  all: { label: "All paid" },
};

function OrdersTable() {
  const params = useSearchParams();
  const router = useRouter();
  const single = params.get("status"); // from the dashboard: one exact status
  const [view, setView] = useState<View>((params.get("view") as View) || "live");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const seen = useRef<Set<string> | null>(null);

  // Search after a short pause in typing.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setState("loading");
      try {
        const res = await apiClient.get<AdminListResponse<Row>>("/admin/orders", {
          limit: 200,
          status: single ?? VIEWS[view].statuses,
          q: query || undefined,
        });
        // Beep when a brand-new order arrives.
        const newOnes = res.items.filter((o) => o.status === "placed");
        if (seen.current && newOnes.some((o) => !seen.current!.has(o.id))) playNewOrderBeep();
        seen.current = new Set(newOnes.map((o) => o.id));
        setRows(res.items);
        setState("ready");
      } catch {
        if (!quiet) setState("error");
      }
    },
    [view, query, single],
  );

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  const tabs: Tab<View>[] = useMemo(
    () => (Object.keys(VIEWS) as View[]).map((v) => ({ value: v, label: VIEWS[v].label })),
    [],
  );

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={single ? `Showing "${statusLabel(single)}" orders.` : "Paid orders. Click an order to see details, update its status or contact the customer."}
      />
      <Toolbar>
        <FilterTabs
          tabs={tabs}
          value={single ? ("" as View) : view}
          onChange={(v) => {
            setView(v);
            if (single) router.replace("/orders");
          }}
        />
        <SearchBox value={q} onChange={setQ} placeholder="Order no., name, phone or email" />
      </Toolbar>

      {state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : (
        <DataTable
          loading={state === "loading"}
          rows={rows}
          rowKey={(o) => o.id}
          href={(o) => `/orders/${o.id}`}
          empty={query ? `No orders match "${query}".` : "No orders here yet."}
          columns={[
            { key: "no", label: "Order", render: (o) => <span className="font-semibold text-deep">{o.orderNo}</span> },
            {
              key: "customer",
              label: "Customer",
              render: (o) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-deep">{o.user?.fullName || "Customer"}</p>
                  {o.user?.phone ? <p className="text-xs text-deep/50">{o.user.phone}</p> : null}
                </div>
              ),
            },
            {
              key: "type",
              label: "Type",
              render: (o) => (
                <span className="inline-flex items-center gap-1.5 text-deep/70">
                  {o.fulfillment === "pickup" ? <Store size={14} /> : <Bike size={14} />}
                  {o.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                </span>
              ),
            },
            { key: "items", label: "Items", render: (o) => o.items.reduce((s, i) => s + i.qty, 0) },
            { key: "status", label: "Status", render: (o) => <Badge status={o.status}>{orderStatusLabel(o.status, o.fulfillment)}</Badge> },
            { key: "when", label: "Placed", render: (o) => <span className="whitespace-nowrap text-deep/60">{timeAgo(o.createdAt)}</span> },
            { key: "total", label: "Total", align: "right", render: (o) => <span className="font-semibold">{formatNgn(o.total)}</span> },
          ]}
          mobile={(o) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-deep">{o.orderNo}</p>
                <p className="truncate text-sm text-deep/70">{o.user?.fullName || "Customer"}</p>
                <p className="text-xs text-deep/50">
                  {o.fulfillment === "pickup" ? "Pickup" : "Delivery"} · {timeAgo(o.createdAt)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <Badge status={o.status}>{orderStatusLabel(o.status, o.fulfillment)}</Badge>
                <p className="mt-1.5 text-sm font-semibold">{formatNgn(o.total)}</p>
              </div>
            </div>
          )}
        />
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersTable />
    </Suspense>
  );
}
