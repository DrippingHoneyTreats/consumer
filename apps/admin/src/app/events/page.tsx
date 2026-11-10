"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { AdminListResponse, EventRequest } from "@/lib/types";
import { formatNgn } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, selectClass } from "@/components/ui/Input";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { AdminTable } from "@/components/admin/AdminTable";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

const STATUSES = ["submitted", "reviewing", "quote_sent", "confirmed", "completed", "cancelled"];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<EventRequest | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [quoteLink, setQuoteLink] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<AdminListResponse<EventRequest>>("/admin/events", {
        page: 1,
        limit: 50,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setEvents(res.items);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Load failed");
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveQuote = async () => {
    if (!selected) return;
    try {
      await apiClient.patch(`/admin/events/${selected.id}`, {
        status: newStatus || undefined,
        quoteAmount: quoteAmount ? Math.round(Number(quoteAmount) * 100) : undefined,
        quoteNote: quoteNote.trim() || undefined,
        quoteLink: quoteLink.trim() || undefined,
      });
      toast("Event updated");
      setSelected(null);
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <>
      <AdminPageTitle title="Events" />
      <select
        className={cn(selectClass, "mb-4 max-w-xs")}
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replaceAll("_", " ")}
          </option>
        ))}
      </select>

      <AdminTable
        columns={[
          { key: "ref", label: "Ref" },
          { key: "type", label: "Type" },
          { key: "city", label: "City" },
          { key: "date", label: "Date" },
          { key: "status", label: "Status" },
          { key: "actions", label: "" },
        ]}
        rows={events.map((ev) => ({
          id: ev.id,
          cells: [
            ev.refNo,
            ev.type,
            ev.city,
            `${ev.date} ${ev.time}`,
            <Badge key="st" status={ev.status} />,
            <Button
              key="open"
              variant="ghost"
              onClick={() => {
                setSelected(ev);
                setNewStatus(ev.status);
                setQuoteAmount(ev.quoteAmount ? String(ev.quoteAmount / 100) : "");
                setQuoteNote(ev.quoteNote ?? "");
                setQuoteLink(ev.quoteLink ?? "");
              }}
            >
              Manage
            </Button>,
          ],
        }))}
      />

      {selected ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-deep/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5">
            <p className="font-display text-lg font-semibold">{selected.refNo}</p>
            <p className="text-sm text-deep/60">
              {selected.guests} guests · {selected.venueAddress}
            </p>
            {selected.quoteAmount ? (
              <p className="mt-2 text-sm">Current quote: {formatNgn(selected.quoteAmount)}</p>
            ) : null}
            <label className="mt-4 block text-sm">
              <span className="font-medium">Status</span>
              <select
                className={cn(selectClass, "mt-1")}
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid gap-2">
              <Input label="Quote (₦)" type="number" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
              <Input label="Quote note" value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} />
              <Input label="Quote link" value={quoteLink} onChange={(e) => setQuoteLink(e.target.value)} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void saveQuote()}>Save</Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
