"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock, PackageX, Plus, ShoppingBag, ShoppingCart, TrendingUp, UserPlus, Users } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatNgn, greetingForNow, statusLabel, timeAgo, orderStatusLabel } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/Badge";
import { OfflineState } from "@/components/ui/EmptyState";
import { DataTable, DetailLayout, PageHeader, Panel, StatCard } from "@/components/admin/kit";

type Summary = {
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number; days: { date: string; orders: number; revenue: number }[] };
  live: { total: number; byStatus: Record<string, number> };
  unfinished: { count: number; value: number };
  events: { open: number; byStatus: Record<string, number> };
  customers: { total: number; newThisWeek: number };
  soldOut: { id: string; name: string }[];
  recentOrders: {
    id: string;
    orderNo: string;
    status: string;
    total: number;
    createdAt: string;
    fulfillment?: string;
    user?: { fullName?: string | null };
  }[];
};

const LIVE_ORDER = ["placed", "seen", "accepted", "preparing", "ready_for_delivery", "out_for_delivery"];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      setData(await apiClient.get<Summary>("/admin/summary"));
      setState("ready");
    } catch {
      setState((s) => (s === "ready" ? s : "error"));
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  const greeting = greetingForNow(user?.fullName);
  const maxDay = Math.max(1, ...(data?.week.days.map((d) => d.revenue) ?? [1]));

  return (
    <>
      <PageHeader
        title={greeting}
        subtitle="Here's how Dripping Honey Treats is doing today."
        actions={
          <>
            <Link href="/orders" className="inline-flex h-10 items-center gap-2 rounded-full bg-deep px-4 text-sm font-semibold text-white">
              <ShoppingBag size={15} /> Live orders
            </Link>
            <Link href="/catalogue/new" className="inline-flex h-10 items-center gap-2 rounded-full border border-deep/20 bg-white px-4 text-sm font-semibold text-deep">
              <Plus size={15} /> Add product
            </Link>
          </>
        }
      />

      {state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            <StatCard
              tone="dark"
              label="Today's sales"
              icon={<TrendingUp size={16} />}
              value={data ? formatNgn(data.today.revenue) : "…"}
              hint={data ? `${data.today.orders} paid order${data.today.orders === 1 ? "" : "s"}` : " "}
            />
            <StatCard
              label="Live orders"
              icon={<Clock size={16} />}
              href="/orders"
              value={data?.live.total ?? "…"}
              hint={data?.live.byStatus.placed ? `${data.live.byStatus.placed} new, not yet accepted` : "Being prepared or delivered"}
              tone={data?.live.byStatus.placed ? "honey" : "light"}
            />
            <StatCard
              label="Unfinished"
              icon={<ShoppingCart size={16} />}
              href="/abandoned"
              value={data?.unfinished.count ?? "…"}
              hint={data ? `${formatNgn(data.unfinished.value)} waiting to be paid` : " "}
              tone={data?.unfinished.count ? "blush" : "light"}
            />
            <StatCard
              label="Open events"
              icon={<CalendarDays size={16} />}
              href="/events"
              value={data?.events.open ?? "…"}
              hint={data?.events.byStatus.submitted ? `${data.events.byStatus.submitted} new requests` : "Requests and quotes in progress"}
            />
          </div>

          <DetailLayout
            main={
              <>
                <Panel title="Sales, last 7 days" actions={data ? <span className="text-xs font-semibold text-deep/55">{formatNgn(data.week.revenue)} · {data.week.orders} orders</span> : null}>
                  <div className="flex h-44 items-end gap-2 md:gap-3">
                    {(data?.week.days ?? Array.from({ length: 7 }, (_, i) => ({ date: String(i), orders: 0, revenue: 0 }))).map((d) => {
                      const day = data ? new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-NG", { weekday: "short" }) : "";
                      return (
                        <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                          <span className="text-[10px] font-semibold text-deep/50 opacity-0 transition group-hover:opacity-100">
                            {d.revenue ? formatNgn(d.revenue) : ""}
                          </span>
                          <div
                            className="w-full rounded-t-lg bg-sage transition-all group-hover:bg-tea"
                            style={{ height: `${Math.max(4, (d.revenue / maxDay) * 100)}%` }}
                            title={`${d.orders} orders · ${formatNgn(d.revenue)}`}
                          />
                          <span className="text-[11px] font-semibold text-deep/55">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                <Panel
                  title="Recent orders"
                  padded={false}
                  actions={
                    <Link href="/orders" className="text-xs font-semibold text-tea hover:text-deep">
                      View all
                    </Link>
                  }
                >
                  <div className="p-3 md:p-0 [&>div]:rounded-none [&>div]:border-0">
                    <DataTable
                      loading={state === "loading"}
                      rows={data?.recentOrders ?? []}
                      rowKey={(o) => o.id}
                      href={(o) => `/orders/${o.id}`}
                      empty="No paid orders yet."
                      columns={[
                        { key: "no", label: "Order", render: (o) => <span className="font-semibold text-deep">{o.orderNo}</span> },
                        { key: "customer", label: "Customer", render: (o) => o.user?.fullName || "Customer" },
                        { key: "status", label: "Status", render: (o) => <Badge status={o.status}>{orderStatusLabel(o.status, o.fulfillment)}</Badge> },
                        { key: "when", label: "Placed", render: (o) => <span className="text-deep/60">{timeAgo(o.createdAt)}</span> },
                        { key: "total", label: "Total", align: "right", render: (o) => <span className="font-semibold">{formatNgn(o.total)}</span> },
                      ]}
                      mobile={(o) => (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-deep">{o.orderNo}</p>
                            <p className="truncate text-xs text-deep/55">{o.user?.fullName || "Customer"} · {timeAgo(o.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <Badge status={o.status}>{orderStatusLabel(o.status, o.fulfillment)}</Badge>
                            <p className="mt-1 text-sm font-semibold">{formatNgn(o.total)}</p>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </Panel>
              </>
            }
            aside={
              <>
                <Panel title="Orders in progress">
                  <ul className="space-y-2 text-sm">
                    {LIVE_ORDER.map((s) => (
                      <li key={s}>
                        <Link href={`/orders?status=${s}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-off-white">
                          <span className="text-deep/75">{statusLabel(s)}</span>
                          <span className="min-w-7 rounded-full bg-off-white px-2 py-0.5 text-center text-xs font-bold text-deep">
                            {data?.live.byStatus[s] ?? 0}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Customers">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sage-soft text-tea">
                      <Users size={18} />
                    </span>
                    <div>
                      <p className="font-display text-2xl font-semibold text-deep">{data?.customers.total ?? "…"}</p>
                      <p className="text-xs text-deep/55">{data ? `${data.customers.newThisWeek} joined this week` : " "}</p>
                    </div>
                  </div>
                  <Link href="/users" className="mt-3 inline-block text-xs font-semibold text-tea hover:text-deep">
                    View customers
                  </Link>
                </Panel>

                <Panel title="Sold out">
                  {data && data.soldOut.length === 0 ? (
                    <p className="text-sm text-deep/55">Everything is in stock.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {(data?.soldOut ?? []).slice(0, 6).map((i) => (
                        <li key={i.id}>
                          <Link href={`/catalogue/${i.id}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-off-white">
                            <PackageX size={15} className="shrink-0 text-danger" />
                            <span className="truncate text-deep">{i.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title="Quick actions">
                  <div className="grid gap-2">
                    {[
                      { href: "/catalogue/new", label: "Add a product", icon: Plus },
                      { href: "/abandoned", label: "Follow up unfinished orders", icon: ShoppingCart },
                      { href: "/staff", label: "Invite staff", icon: UserPlus },
                    ].map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href} className="flex items-center gap-2.5 rounded-xl border border-deep/10 px-3 py-2.5 text-sm font-medium text-deep hover:border-deep/30">
                        <Icon size={15} className="text-tea" /> {label}
                      </Link>
                    ))}
                  </div>
                </Panel>
              </>
            }
          />
        </>
      )}
    </>
  );
}
