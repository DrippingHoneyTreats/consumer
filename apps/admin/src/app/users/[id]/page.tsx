"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDate, formatNgn, timeAgo, whatsappLink, orderStatusLabel } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { OfflineState } from "@/components/ui/EmptyState";
import { Avatar, DataTable, DetailLayout, Fields, PageHeader, Panel, StatCard } from "@/components/admin/kit";

type Detail = {
  user: {
    id: string;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    phoneVerified?: boolean;
    emailVerified?: boolean;
    role?: string;
    hasPin?: boolean;
    createdAt?: string;
  };
  stats: { orders: number; spent: number; lastOrderAt: string | null };
  orders: { id: string; orderNo: string; status: string; total: number; createdAt: string; items: { qty: number }[]; fulfillment?: string }[];
  events: { id: string; refNo: string; type: string; title?: string | null; date: string; city: string; guests: number; status: string; quoteAmount?: number | null }[];
  addresses: { id: string; label: string; formattedAddress: string; landmark?: string | null }[];
};

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      setData(await apiClient.get<Detail>(`/admin/users/${id}`));
      setState("ready");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "error") return <OfflineState onRetry={() => void load()} />;
  if (!data) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;

  const { user, stats } = data;
  const first = user.fullName?.split(/\s+/)[0] ?? "there";

  return (
    <>
      <PageHeader
        back={{ href: "/users", label: "Customers" }}
        title={user.fullName || "Customer"}
        subtitle={`Customer since ${formatDate(user.createdAt)}`}
      />

      <DetailLayout
        asideFirst
        main={
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Orders" value={stats.orders} />
              <StatCard label="Spent" value={formatNgn(stats.spent)} tone="dark" />
              <StatCard label="Last order" value={<span className="text-lg">{stats.lastOrderAt ? timeAgo(stats.lastOrderAt) : "—"}</span>} />
            </div>

            <Panel title={`Orders (${data.orders.length})`} padded={false}>
              <div className="p-3 md:p-0 [&>div]:rounded-none [&>div]:border-0">
                <DataTable
                  rows={data.orders}
                  rowKey={(o) => o.id}
                  href={(o) => `/orders/${o.id}`}
                  empty="No orders yet."
                  columns={[
                    { key: "no", label: "Order", render: (o) => <span className="font-semibold">{o.orderNo}</span> },
                    { key: "status", label: "Status", render: (o) => <Badge status={o.status}>{orderStatusLabel(o.status, o.fulfillment)}</Badge> },
                    { key: "items", label: "Items", render: (o) => o.items.reduce((s, i) => s + i.qty, 0) },
                    { key: "date", label: "Date", render: (o) => <span className="text-deep/60">{formatDate(o.createdAt)}</span> },
                    { key: "total", label: "Total", align: "right", render: (o) => <span className="font-semibold">{formatNgn(o.total)}</span> },
                  ]}
                  mobile={(o) => (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{o.orderNo}</p>
                        <p className="text-xs text-deep/55">{formatDate(o.createdAt)}</p>
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

            <Panel title={`Event requests (${data.events.length})`} padded={false}>
              <div className="p-3 md:p-0 [&>div]:rounded-none [&>div]:border-0">
                <DataTable
                  rows={data.events}
                  rowKey={(e) => e.id}
                  href={(e) => `/events/${e.id}`}
                  empty="No event requests."
                  columns={[
                    { key: "ref", label: "Ref", render: (e) => <span className="font-semibold">{e.refNo}</span> },
                    { key: "type", label: "Event", render: (e) => e.title || e.type },
                    { key: "date", label: "Date", render: (e) => <span className="text-deep/60">{e.date}</span> },
                    { key: "status", label: "Status", render: (e) => <Badge status={e.status} /> },
                    { key: "quote", label: "Quote", align: "right", render: (e) => (e.quoteAmount ? formatNgn(e.quoteAmount) : "—") },
                  ]}
                />
              </div>
            </Panel>
          </>
        }
        aside={
          <>
            <Panel>
              <div className="flex items-center gap-3">
                <Avatar name={user.fullName} size={52} />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-semibold text-deep">{user.fullName || "No name"}</p>
                  <p className="text-xs text-deep/55">{user.role === "CUSTOMER" ? "Customer" : user.role}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {user.phone ? (
                  <>
                    <a href={whatsappLink(user.phone, `Hi ${first}, this is Dripping Honey Treats 👋`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-deep px-3.5 py-2 text-xs font-semibold text-white">
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                    <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-off-white px-3.5 py-2 text-xs font-semibold text-deep">
                      <Phone size={13} /> Call
                    </a>
                  </>
                ) : null}
                {user.email ? (
                  <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 rounded-full bg-off-white px-3.5 py-2 text-xs font-semibold text-deep">
                    <Mail size={13} /> Email
                  </a>
                ) : null}
              </div>
            </Panel>

            <Panel title="Contact & sign-in">
              <Fields
                items={[
                  {
                    label: "WhatsApp",
                    value: user.phone ? (
                      <span className="inline-flex items-center gap-1">
                        {user.phone} {user.phoneVerified ? <BadgeCheck size={13} className="text-tea" /> : null}
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                  {
                    label: "Email",
                    value: user.email ? (
                      <span className="inline-flex items-center gap-1">
                        {user.email} {user.emailVerified ? <BadgeCheck size={13} className="text-tea" /> : <span className="text-xs text-deep/45">(not verified)</span>}
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Sign-in PIN", value: user.hasPin ? "Set" : "Not set" },
                  { label: "Joined", value: formatDate(user.createdAt) },
                ]}
              />
            </Panel>

            <Panel title={`Saved addresses (${data.addresses.length})`}>
              {data.addresses.length ? (
                <ul className="space-y-3 text-sm">
                  {data.addresses.map((a) => (
                    <li key={a.id} className="flex gap-2">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-tea" />
                      <span>
                        <span className="block font-semibold text-deep">{a.label}</span>
                        <span className="block text-deep/70">{a.formattedAddress}</span>
                        {a.landmark ? <span className="block text-xs text-deep/50">Landmark: {a.landmark}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-deep/55">No saved addresses.</p>
              )}
            </Panel>
          </>
        }
      />
    </>
  );
}
