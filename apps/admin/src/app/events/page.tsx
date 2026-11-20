"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import type { AdminListResponse } from "@/lib/types";
import { formatNgn, statusLabel, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { OfflineState } from "@/components/ui/EmptyState";
import { DataTable, FilterTabs, PageHeader, SearchBox, Toolbar, type Tab } from "@/components/admin/kit";
import { EVENT_STATUSES, type AdminEvent } from "@/lib/admin-events";

type View = "open" | (typeof EVENT_STATUSES)[number] | "all";

export default function EventsPage() {
  const [rows, setRows] = useState<AdminEvent[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await apiClient.get<AdminListResponse<AdminEvent>>("/admin/events", { limit: 200 });
      setRows(res.items);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const tabs: Tab<View>[] = [
    { value: "open", label: "Open", count: rows.filter((r) => ["submitted", "reviewing", "quote_sent"].includes(r.status)).length },
    ...EVENT_STATUSES.map((s) => ({ value: s as View, label: statusLabel(s), count: count(s) })),
    { value: "all", label: "All", count: rows.length },
  ];

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (view === "all" || (view === "open" ? ["submitted", "reviewing", "quote_sent"].includes(r.status) : r.status === view)) &&
        (!term || [r.refNo, r.type, r.title, r.city, r.user?.fullName, r.user?.phone].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [rows, view, q]);

  return (
    <>
      <PageHeader title="Events" subtitle="Dessert table and catering requests. Click one to send a quote or update its status." />
      <Toolbar>
        <FilterTabs tabs={tabs} value={view} onChange={setView} />
        <SearchBox value={q} onChange={setQ} placeholder="Ref, type, city or customer" />
      </Toolbar>
      {state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : (
        <DataTable
          loading={state === "loading"}
          rows={shown}
          rowKey={(e) => e.id}
          href={(e) => `/events/${e.id}`}
          empty="No event requests here."
          columns={[
            { key: "ref", label: "Ref", render: (e) => <span className="font-semibold text-deep">{e.refNo}</span> },
            {
              key: "event",
              label: "Event",
              render: (e) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-deep">{e.title || e.type}</p>
                  <p className="text-xs text-deep/50">{e.user?.fullName || "Customer"}</p>
                </div>
              ),
            },
            { key: "date", label: "Date", render: (e) => <span className="whitespace-nowrap">{e.date}{e.time ? ` · ${e.time}` : ""}</span> },
            { key: "where", label: "City", render: (e) => e.city },
            { key: "guests", label: "Guests", render: (e) => e.guests },
            { key: "status", label: "Status", render: (e) => <Badge status={e.status} /> },
            { key: "quote", label: "Quote", align: "right", render: (e) => (e.quoteAmount ? <span className="font-semibold">{formatNgn(e.quoteAmount)}</span> : <span className="text-deep/40">—</span>) },
          ]}
          mobile={(e) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-deep">{e.title || e.type}</p>
                <p className="truncate text-xs text-deep/55">
                  {e.refNo} · {e.date} · {e.city} · {e.guests} guests
                </p>
                <p className="text-xs text-deep/45">Requested {timeAgo(e.createdAt)}</p>
              </div>
              <Badge status={e.status} />
            </div>
          )}
        />
      )}
    </>
  );
}
