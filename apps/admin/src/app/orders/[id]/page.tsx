"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Bike, Mail, MapPin, MessageCircle, Phone, Store } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { Order } from "@/lib/types";
import { formatDateTime, formatNgn, timeAgo, whatsappLink, orderStatusLabel } from "@/lib/format";
import { followUpMessage, STAGE_LABEL, stageOf } from "@/lib/followup";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { OfflineState } from "@/components/ui/EmptyState";
import { StatusActionBar } from "@/components/admin/StatusActionBar";
import { Avatar, DetailLayout, Fields, PageHeader, Panel } from "@/components/admin/kit";

type Detail = Order & {
  user?: { id: string; fullName?: string | null; phone?: string | null; email?: string | null };
  statusLogs?: { status: string; note?: string | null; createdAt: string }[];
  payments?: { reference: string; provider: string; amount: number; status: string; createdAt: string }[];
  updatedAt?: string;
  paidAt?: string | null;
  promoCode?: string | null;
};

const UNPAID = ["draft", "pending_payment"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Detail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      setOrder(await apiClient.get<Detail>(`/admin/orders/${id}`));
      setState("ready");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "error") return <OfflineState onRetry={() => void load()} />;
  if (!order) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-deep/10" />
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="h-80 animate-pulse rounded-2xl bg-white" />
          <div className="h-80 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  const unpaid = UNPAID.includes(order.status);
  const pickup = order.fulfillment === "pickup";
  const addr = (order.addressSnapshot ?? null) as Record<string, string | number | null> | null;
  const phone = order.user?.phone ?? (addr?.contactPhone as string | undefined) ?? null;
  const email = order.user?.email ?? null;
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
  const stage = unpaid ? stageOf({ ...order, paymentTries: order.payments?.length ?? 0 }) : null;
  const msg = unpaid
    ? followUpMessage({ ...order, paymentTries: order.payments?.length ?? 0 })
    : { text: `Hi ${order.user?.fullName?.split(/\s+/)[0] ?? "there"}, this is Dripping Honey Treats about your order ${order.orderNo}.`, subject: `Your order ${order.orderNo}` };

  return (
    <>
      <PageHeader
        back={unpaid ? { href: "/abandoned", label: "Unfinished orders" } : { href: "/orders", label: "Orders" }}
        title={`Order ${order.orderNo}`}
        meta={
          stage ? (
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", STAGE_LABEL[stage].tone)}>{STAGE_LABEL[stage].label}</span>
          ) : (
            <Badge status={order.status}>{orderStatusLabel(order.status, order.fulfillment)}</Badge>
          )
        }
        subtitle={
          unpaid
            ? `Not paid · last active ${timeAgo(order.updatedAt ?? order.createdAt)}`
            : `Placed ${formatDateTime(order.createdAt)} · ${itemCount} item${itemCount === 1 ? "" : "s"} · ${pickup ? "Pickup" : "Delivery"}`
        }
      />

      <DetailLayout
        asideFirst
        main={
          <>
            <Panel title={`Items (${itemCount})`} padded={false}>
              <ul className="divide-y divide-deep/5">
                {order.items.map((line) => (
                  <li key={line.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-cream">
                      <Image src={line.item?.images?.[0] || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="48px" unoptimized />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-deep">{line.nameSnapshot}</p>
                      <p className="text-xs text-deep/55">
                        {formatNgn(line.unitPrice)} × {line.qty}
                        {line.note ? <span className="italic"> · “{line.note}”</span> : null}
                      </p>
                    </div>
                    <p className="font-semibold text-deep">{formatNgn(line.unitPrice * line.qty)}</p>
                  </li>
                ))}
              </ul>
              <div className="border-t border-deep/10 bg-off-white/50 px-4 py-4 md:px-5">
                <Fields
                  items={[
                    { label: "Subtotal", value: formatNgn(order.subtotal) },
                    { label: "Delivery", value: pickup ? "Pickup" : order.deliveryFee > 0 ? formatNgn(order.deliveryFee) : "Paid to rider on arrival" },
                    ...(order.discount > 0 ? [{ label: `Discount${order.promoCode ? ` (${order.promoCode})` : ""}`, value: `−${formatNgn(order.discount)}` }] : []),
                    { label: unpaid ? "Total (not paid)" : "Paid online", value: <span className="font-display text-lg">{formatNgn(order.total)}</span> },
                  ]}
                />
              </div>
            </Panel>

            {order.notes ? (
              <Panel title="Customer note">
                <p className="text-sm text-deep/80">“{order.notes}”</p>
              </Panel>
            ) : null}

            <Panel title="Timeline">
              {order.statusLogs?.length ? (
                <ol className="relative space-y-4 border-l-2 border-deep/10 pl-5">
                  {[...order.statusLogs].reverse().map((l, i) => (
                    <li key={`${l.status}-${l.createdAt}-${i}`} className="relative">
                      <span className={cn("absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white", i === 0 ? "bg-tea" : "bg-deep/25")} />
                      <p className="text-sm font-semibold text-deep">{orderStatusLabel(l.status, order.fulfillment)}</p>
                      <p className="text-xs text-deep/55">{formatDateTime(l.createdAt)}</p>
                      {l.note ? <p className="mt-0.5 text-sm text-deep/70">{l.note}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-deep/55">No status changes yet.</p>
              )}
            </Panel>

            <Panel title="Payments">
              {order.payments?.length ? (
                <ul className="divide-y divide-deep/5 text-sm">
                  {order.payments.map((p) => (
                    <li key={p.reference} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-deep/70">{p.reference}</p>
                        <p className="text-xs text-deep/50">
                          {p.provider} · {formatDateTime(p.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatNgn(p.amount)}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            p.status === "success" ? "bg-tea/15 text-deep" : p.status === "failed" ? "bg-danger/10 text-danger" : "bg-off-white text-deep/70",
                          )}
                        >
                          {p.status === "success" ? "Paid" : p.status === "failed" ? "Failed" : "Pending"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-deep/55">No payment attempts yet.</p>
              )}
            </Panel>
          </>
        }
        aside={
          <>
            <Panel title={unpaid ? "Follow up" : "Status"}>
              {unpaid ? (
                <>
                  <p className="text-sm text-deep/70">
                    {stage ? STAGE_LABEL[stage].hint : null}. Send a friendly message to ask if anything went wrong.
                  </p>
                  <div className="mt-3 grid gap-2">
                    {phone ? (
                      <a href={whatsappLink(phone, msg.text)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-deep px-4 py-2.5 text-sm font-semibold text-white">
                        <MessageCircle size={15} /> WhatsApp customer
                      </a>
                    ) : null}
                    {email ? (
                      <a
                        href={`mailto:${email}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(`${msg.text}\n\nDripping Honey Treats`)}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-deep/20 px-4 py-2.5 text-sm font-semibold text-deep"
                      >
                        <Mail size={15} /> Email customer
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <Badge status={order.status}>{orderStatusLabel(order.status, order.fulfillment)}</Badge>
                    {order.paidAt ? <span className="text-xs text-deep/50">Paid {timeAgo(order.paidAt)}</span> : null}
                  </div>
                  <StatusActionBar order={order} onUpdated={() => void load()} />
                </>
              )}
            </Panel>

            <Panel
              title="Customer"
              actions={
                order.user?.id ? (
                  <Link href={`/users/${order.user.id}`} className="text-xs font-semibold text-tea hover:text-deep">
                    Profile
                  </Link>
                ) : null
              }
            >
              <div className="flex items-center gap-3">
                <Avatar name={order.user?.fullName} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-deep">{order.user?.fullName || "Customer"}</p>
                  <p className="truncate text-xs text-deep/55">{[phone, email].filter(Boolean).join(" · ") || "No contact details"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {phone ? (
                  <>
                    <a href={whatsappLink(phone, msg.text)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1.5 text-xs font-semibold text-deep">
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                    <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-off-white px-3 py-1.5 text-xs font-semibold text-deep">
                      <Phone size={13} /> Call
                    </a>
                  </>
                ) : null}
                {email ? (
                  <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 rounded-full bg-off-white px-3 py-1.5 text-xs font-semibold text-deep">
                    <Mail size={13} /> Email
                  </a>
                ) : null}
              </div>
            </Panel>

            <Panel title={pickup ? "Pickup" : "Delivery"}>
              {addr ? (
                <div className="space-y-3 text-sm">
                  <p className="flex items-start gap-2 text-deep">
                    {pickup ? <Store size={16} className="mt-0.5 shrink-0 text-tea" /> : <MapPin size={16} className="mt-0.5 shrink-0 text-tea" />}
                    <span>{String(addr.formattedAddress ?? (pickup ? "Customer collects" : "—"))}</span>
                  </p>
                  {addr.landmark ? <p className="text-deep/70">Landmark: {String(addr.landmark)}</p> : null}
                  {addr.contactPhone ? <p className="text-deep/70">Contact: {String(addr.contactPhone)}</p> : null}
                  {!pickup && order.deliveryFeeAgreed ? (
                    <p className="rounded-xl bg-honey-soft px-3 py-2 text-xs text-deep">Customer agreed to pay the delivery fee to the rider.</p>
                  ) : null}
                  {!pickup && order.delivery?.riderName ? (
                    <div className="rounded-xl bg-sage-soft px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-deep">
                        <Bike size={13} /> {order.delivery.riderName}
                      </p>
                      <p className="text-xs text-deep/70">
                        {order.delivery.riderPhone}
                        {order.delivery.etaMinutes ? ` · ETA ~${order.delivery.etaMinutes} min` : ""}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-deep/55">The customer hasn&apos;t chosen pickup or delivery yet.</p>
              )}
            </Panel>
          </>
        }
      />
    </>
  );
}
