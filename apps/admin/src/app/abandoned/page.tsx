"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatNgn, timeAgo, whatsappLink } from "@/lib/format";
import { followUpMessage, STAGE_LABEL } from "@/lib/followup";
import { cn } from "@/lib/cn";
import { OfflineState } from "@/components/ui/EmptyState";
import { DataTable, FilterTabs, PageHeader, SearchBox, StatCard, Toolbar, type Tab } from "@/components/admin/kit";

type Stage = "cart" | "checkout" | "payment";

type Row = {
  id: string;
  orderNo: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt?: string;
  addressSnapshot?: unknown;
  items: { id: string; nameSnapshot: string; qty: number }[];
  user?: { id: string; fullName?: string | null; phone?: string | null; email?: string | null };
  stage: Stage;
  paymentTries: number;
};

const QUIET = [
  { minutes: 30, label: "30 min+" },
  { minutes: 120, label: "2 hours+" },
  { minutes: 1440, label: "1 day+" },
];

export default function UnfinishedOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [quiet, setQuiet] = useState(30);
  const [stage, setStage] = useState<Stage | "all">("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await apiClient.get<{ items: Row[] }>("/admin/abandoned", { quietMinutes: quiet });
      setRows(res.items ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [quiet]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      cart: rows.filter((o) => o.stage === "cart").length,
      checkout: rows.filter((o) => o.stage === "checkout").length,
      payment: rows.filter((o) => o.stage === "payment").length,
    }),
    [rows],
  );
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((o) => stage === "all" || o.stage === stage)
      .filter(
        (o) =>
          !term ||
          [o.orderNo, o.user?.fullName, o.user?.phone, o.user?.email].some((v) => v?.toLowerCase().includes(term)),
      );
  }, [rows, stage, q]);
  const value = shown.reduce((s, o) => s + o.total, 0);

  const tabs: Tab<Stage | "all">[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "cart", label: STAGE_LABEL.cart.label, count: counts.cart },
    { value: "checkout", label: STAGE_LABEL.checkout.label, count: counts.checkout },
    { value: "payment", label: STAGE_LABEL.payment.label, count: counts.payment },
  ];

  return (
    <>
      <PageHeader
        title="Unfinished orders"
        subtitle="Signed-in customers who added treats but didn't pay. Click one to see the cart and send a friendly follow-up. Visitors who never signed in aren't listed."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Waiting to be paid" value={formatNgn(value)} tone="blush" />
        <StatCard label={STAGE_LABEL.cart.label} value={counts.cart} hint={STAGE_LABEL.cart.hint} />
        <StatCard label={STAGE_LABEL.checkout.label} value={counts.checkout} hint={STAGE_LABEL.checkout.hint} />
        <StatCard label={STAGE_LABEL.payment.label} value={counts.payment} hint={STAGE_LABEL.payment.hint} />
      </div>

      <Toolbar>
        <FilterTabs tabs={tabs} value={stage} onChange={setStage} />
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <span className="text-xs font-semibold text-deep/55">Quiet for</span>
          {QUIET.map((x) => (
            <button
              key={x.minutes}
              type="button"
              onClick={() => setQuiet(x.minutes)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                quiet === x.minutes ? "bg-blush text-deep" : "bg-white text-deep/65 ring-1 ring-deep/10",
              )}
            >
              {x.label}
            </button>
          ))}
          <SearchBox value={q} onChange={setQ} placeholder="Name, phone, email or order" />
        </div>
      </Toolbar>

      {state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : (
        <DataTable
          loading={state === "loading"}
          rows={shown}
          rowKey={(o) => o.id}
          href={(o) => `/orders/${o.id}`}
          empty="Nothing unfinished for this filter. Nice."
          columns={[
            {
              key: "customer",
              label: "Customer",
              render: (o) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-deep">{o.user?.fullName || "Customer"}</p>
                  <p className="truncate text-xs text-deep/50">{o.user?.phone || o.user?.email || "No contact"}</p>
                </div>
              ),
            },
            {
              key: "stage",
              label: "Stopped at",
              render: (o) => (
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", STAGE_LABEL[o.stage].tone)}>
                  {STAGE_LABEL[o.stage].label}
                  {o.paymentTries ? ` · ${o.paymentTries}×` : ""}
                </span>
              ),
            },
            {
              key: "items",
              label: "Items",
              className: "max-w-[260px]",
              render: (o) => (
                <span className="line-clamp-1 text-deep/70">{o.items.map((i) => `${i.nameSnapshot}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</span>
              ),
            },
            { key: "active", label: "Last active", render: (o) => <span className="whitespace-nowrap text-deep/60">{timeAgo(o.updatedAt ?? o.createdAt)}</span> },
            { key: "total", label: "Total", align: "right", render: (o) => <span className="font-semibold">{formatNgn(o.total)}</span> },
            {
              key: "wa",
              label: "",
              align: "right",
              render: (o) =>
                o.user?.phone ? (
                  <a
                    href={whatsappLink(o.user.phone, followUpMessage(o).text)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="WhatsApp this customer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage-soft text-deep hover:bg-sage"
                  >
                    <MessageCircle size={15} />
                  </a>
                ) : null,
            },
          ]}
          mobile={(o) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-deep">{o.user?.fullName || "Customer"}</p>
                <p className="truncate text-xs text-deep/55">
                  {o.items.length} item{o.items.length === 1 ? "" : "s"} · {timeAgo(o.updatedAt ?? o.createdAt)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STAGE_LABEL[o.stage].tone)}>{STAGE_LABEL[o.stage].label}</span>
                <p className="mt-1.5 text-sm font-semibold">{formatNgn(o.total)}</p>
              </div>
            </div>
          )}
        />
      )}
    </>
  );
}
