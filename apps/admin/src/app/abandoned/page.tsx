"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle, ShoppingCart } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatNgn, whatsappLink } from "@/lib/format";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { cn } from "@/lib/cn";

type Stage = "cart" | "checkout" | "payment";

type UnfinishedOrder = {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt?: string;
  fulfillment?: "delivery" | "pickup";
  addressSnapshot?: { formattedAddress?: string } | null;
  items: { id: string; nameSnapshot: string; qty: number; unitPrice: number }[];
  user?: { id: string; fullName?: string | null; phone?: string | null; email?: string | null };
  stage: Stage;
  paymentTries: number;
  paymentsFailed: number;
};

const STAGES: Record<Stage, { label: string; hint: string; tone: string }> = {
  cart: { label: "In cart", hint: "Added items, didn't start checkout", tone: "bg-sage-soft text-deep" },
  checkout: { label: "At checkout", hint: "Chose delivery/pickup, didn't pay", tone: "bg-honey-soft text-deep" },
  payment: { label: "Payment stopped", hint: "Opened payment but didn't finish", tone: "bg-[#fdecea] text-[#7a1a12]" },
};

const QUIET = [
  { minutes: 30, label: "30 min+" },
  { minutes: 120, label: "2 hours+" },
  { minutes: 1440, label: "1 day+" },
];

function ago(iso?: string) {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}

function itemsLine(o: UnfinishedOrder) {
  const names = o.items.map((i) => `${i.nameSnapshot}${i.qty > 1 ? ` ×${i.qty}` : ""}`);
  return names.length > 2 ? `${names.slice(0, 2).join(", ")} and ${names.length - 2} more` : names.join(" and ");
}

/** Friendly, non-pushy follow-up, tuned to where they stopped. */
function followUp(o: UnfinishedOrder) {
  const hi = `Hi ${firstName(o.user?.fullName)}, this is Dripping Honey Treats 👋`;
  const items = itemsLine(o);
  const body =
    o.stage === "payment"
      ? `We noticed your payment for ${items} (${formatNgn(o.total)}) didn't go through. Did something go wrong? We're happy to help you complete it, or you can pay by transfer.`
      : o.stage === "checkout"
        ? `You were almost done with your order of ${items} (${formatNgn(o.total)}). Was there anything stopping you? We can help with delivery, sizes or anything else.`
        : `You left ${items} in your order. Would you like us to help you finish it, or answer any questions?`;
  return { hi, body, subject: `Your Dripping Honey Treats order ${o.orderNo}` };
}

export default function AbandonedOrdersPage() {
  const [orders, setOrders] = useState<UnfinishedOrder[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [quiet, setQuiet] = useState(30);
  const [stage, setStage] = useState<Stage | "all">("all");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await apiClient.get<{ items: UnfinishedOrder[] }>("/admin/abandoned", { quietMinutes: quiet });
      setOrders(res.items ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [quiet]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => (stage === "all" ? orders : orders.filter((o) => o.stage === stage)), [orders, stage]);
  const counts = useMemo(
    () => ({
      cart: orders.filter((o) => o.stage === "cart").length,
      checkout: orders.filter((o) => o.stage === "checkout").length,
      payment: orders.filter((o) => o.stage === "payment").length,
    }),
    [orders],
  );
  const value = shown.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-5">
      <AdminPageTitle title="Unfinished orders" />

      <div className="rounded-2xl border border-deep/10 bg-white p-4 md:p-5">
        <h1 className="text-lg font-semibold text-deep">Unfinished orders</h1>
        <p className="mt-1 text-sm text-deep/60">
          Signed-in customers who added treats but didn&apos;t pay. Reach out kindly to ask if anything went wrong.
          Visitors who never signed in aren&apos;t listed: their cart stays on their own device.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-deep/55">Quiet for</span>
          {QUIET.map((q) => (
            <button
              key={q.minutes}
              type="button"
              onClick={() => setQuiet(q.minutes)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                quiet === q.minutes ? "bg-deep text-white" : "bg-off-white text-deep/70 hover:text-deep",
              )}
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStage("all")}
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", stage === "all" ? "bg-blush text-deep" : "bg-off-white text-deep/70")}
          >
            All ({orders.length})
          </button>
          {(Object.keys(STAGES) as Stage[]).map((s) => (
            <button
              key={s}
              type="button"
              title={STAGES[s].hint}
              onClick={() => setStage(s)}
              className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", stage === s ? "bg-blush text-deep" : "bg-off-white text-deep/70")}
            >
              {STAGES[s].label} ({counts[s]})
            </button>
          ))}
        </div>
        {shown.length ? (
          <p className="mt-3 text-xs text-deep/55">
            {shown.length} order{shown.length === 1 ? "" : "s"} · {formatNgn(value)} waiting to be completed
          </p>
        ) : null}
      </div>

      {state === "loading" ? (
        <ColumnLoader columns={1} count={3} aspect="h-40 aspect-auto" />
      ) : state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={40} strokeWidth={1.4} />}
          title="Nothing unfinished"
          message="No customer has left an order unpaid for this long. Nice."
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((o) => {
            const f = followUp(o);
            const phone = o.user?.phone;
            const email = o.user?.email;
            const st = STAGES[o.stage];
            return (
              <li key={o.id} className="rounded-2xl border border-deep/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-deep">{o.user?.fullName || "Customer"}</p>
                    <p className="truncate text-xs text-deep/55">
                      {[phone, email].filter(Boolean).join(" · ") || "No contact details"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn("inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold", st.tone)} title={st.hint}>
                      {st.label}
                    </span>
                    <p className="mt-1 text-xs text-deep/50">Last active {ago(o.updatedAt ?? o.createdAt)}</p>
                  </div>
                </div>

                <ul className="mt-3 space-y-1 border-t border-deep/5 pt-3 text-sm">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3 text-deep/80">
                      <span className="min-w-0 truncate">
                        {i.nameSnapshot} <span className="text-deep/45">×{i.qty}</span>
                      </span>
                      <span className="shrink-0">{formatNgn(i.unitPrice * i.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between border-t border-dashed border-deep/10 pt-2 text-sm">
                  <span className="text-xs text-deep/50">
                    #{o.orderNo}
                    {o.paymentTries ? ` · ${o.paymentTries} payment attempt${o.paymentTries === 1 ? "" : "s"}` : ""}
                    {o.addressSnapshot?.formattedAddress ? ` · ${o.fulfillment === "pickup" ? "Pickup" : "Delivery"}` : ""}
                  </span>
                  <span className="font-semibold text-deep">{formatNgn(o.total)}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {phone ? (
                    <a
                      href={whatsappLink(phone, `${f.hi}\n\n${f.body}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-deep px-3.5 py-2 text-xs font-semibold text-white"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  ) : null}
                  {email ? (
                    <a
                      href={`mailto:${email}?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(`${f.hi}\n\n${f.body}\n\nDripping Honey Treats`)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-deep/20 px-3.5 py-2 text-xs font-semibold text-deep"
                    >
                      <Mail size={14} /> Email
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
