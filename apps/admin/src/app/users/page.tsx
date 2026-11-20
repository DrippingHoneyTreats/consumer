"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { AdminListResponse, User } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/format";
import { OfflineState } from "@/components/ui/EmptyState";
import { Avatar, DataTable, PageHeader, SearchBox, Toolbar } from "@/components/admin/kit";

type Row = User & { createdAt?: string };

export default function CustomersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await apiClient.get<AdminListResponse<Row>>("/admin/users", { role: "CUSTOMER", q: query || undefined, limit: 200 });
      setRows(res.items);
      setTotal(res.total);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader title="Customers" subtitle={`${total} customer${total === 1 ? "" : "s"}. Click one to see their orders, events and saved addresses.`} />
      <Toolbar>
        <p className="text-sm text-deep/55">{query ? `${rows.length} match${rows.length === 1 ? "" : "es"} for “${query}”` : "Newest first"}</p>
        <SearchBox value={q} onChange={setQ} placeholder="Name, phone or email" />
      </Toolbar>

      {state === "error" ? (
        <OfflineState onRetry={() => void load()} />
      ) : (
        <DataTable
          loading={state === "loading"}
          rows={rows}
          rowKey={(u) => u.id}
          href={(u) => `/users/${u.id}`}
          empty={query ? `No customers match “${query}”.` : "No customers yet."}
          columns={[
            {
              key: "name",
              label: "Customer",
              render: (u) => (
                <div className="flex items-center gap-3">
                  <Avatar name={u.fullName} size={34} />
                  <span className="font-medium text-deep">{u.fullName || "No name"}</span>
                </div>
              ),
            },
            {
              key: "phone",
              label: "WhatsApp",
              render: (u) =>
                u.phone ? (
                  <span className="inline-flex items-center gap-1">
                    {u.phone}
                    {u.phoneVerified ? <BadgeCheck size={13} className="text-tea" /> : null}
                  </span>
                ) : (
                  <span className="text-deep/40">—</span>
                ),
            },
            {
              key: "email",
              label: "Email",
              render: (u) =>
                u.email ? (
                  <span className="inline-flex items-center gap-1">
                    {u.email}
                    {u.emailVerified ? <BadgeCheck size={13} className="text-tea" /> : null}
                  </span>
                ) : (
                  <span className="text-deep/40">—</span>
                ),
            },
            { key: "joined", label: "Joined", render: (u) => <span className="whitespace-nowrap text-deep/60">{formatDate(u.createdAt)}</span> },
          ]}
          mobile={(u) => (
            <div className="flex items-center gap-3">
              <Avatar name={u.fullName} size={36} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-deep">{u.fullName || "No name"}</p>
                <p className="truncate text-xs text-deep/55">{u.phone || u.email || "No contact"} · joined {timeAgo(u.createdAt)}</p>
              </div>
            </div>
          )}
        />
      )}
    </>
  );
}
