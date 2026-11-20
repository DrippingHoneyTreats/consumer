"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Mail, MapPin, MessageCircle, Phone, Users, Wallet } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDateTime, formatNgn, statusLabel, whatsappLink } from "@/lib/format";
import { cn } from "@/lib/cn";
import { checkLink, useFieldErrors } from "@/lib/validate";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, textareaClass } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { OfflineState } from "@/components/ui/EmptyState";
import { Avatar, DetailLayout, Fields, PageHeader, Panel } from "@/components/admin/kit";
import { EVENT_STATUSES, type AdminEvent } from "@/lib/admin-events";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const f = useFieldErrors();
  const [ev, setEv] = useState<AdminEvent | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [form, setForm] = useState({ status: "", amount: "", note: "", link: "" });

  const load = useCallback(async () => {
    try {
      const e = await apiClient.get<AdminEvent>(`/admin/events/${id}`);
      setEv(e);
      setForm({ status: e.status, amount: e.quoteAmount ? String(e.quoteAmount / 100) : "", note: e.quoteNote ?? "", link: e.quoteLink ?? "" });
      setState("ready");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!ev) return;
    const amount = form.amount.trim();
    const ok = f.validate({
      amount: amount && (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) ? "Enter the quote in naira, e.g. 150000." : null,
      link: checkLink(form.link),
    });
    if (!ok) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    try {
      const saved = await apiClient.patch<AdminEvent>(`/admin/events/${ev.id}`, {
        status: form.status || undefined,
        quoteAmount: amount ? Math.round(Number(amount) * 100) : undefined,
        quoteNote: form.note.trim() || undefined,
        quoteLink: form.link.trim() || undefined,
      });
      setEv({ ...ev, ...saved });
      toast.success("Event updated. The customer has been notified.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the event.");
    }
  }

  if (state === "error") return <OfflineState onRetry={() => void load()} />;
  if (!ev) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;

  const phone = ev.user?.phone;
  const msg = `Hi ${ev.user?.fullName?.split(/\s+/)[0] ?? "there"}, this is Dripping Honey Treats about your event request ${ev.refNo} 🎉`;

  return (
    <>
      <PageHeader back={{ href: "/events", label: "Events" }} title={ev.title || ev.type} meta={<Badge status={ev.status} />} subtitle={`${ev.refNo} · requested ${formatDateTime(ev.createdAt)}`} />

      <DetailLayout
        asideFirst
        main={
          <>
            <Panel title="Event details">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: CalendarDays, label: "When", value: `${ev.date}${ev.time ? ` · ${ev.time}` : ""}` },
                  { icon: MapPin, label: "Where", value: [ev.venueAddress, ev.city].filter(Boolean).join(", ") },
                  { icon: Users, label: "Guests", value: String(ev.guests) },
                  { icon: Wallet, label: "Budget", value: ev.budget ? formatNgn(ev.budget) : "Not given" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-3 rounded-xl bg-off-white p-3">
                    <Icon size={18} className="mt-0.5 shrink-0 text-tea" />
                    <div className="min-w-0">
                      <p className="text-xs text-deep/55">{label}</p>
                      <p className="font-medium text-deep [overflow-wrap:anywhere]">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Fields items={[{ label: "Type", value: ev.type }, { label: "Reference", value: ev.refNo }]} />
            </Panel>

            <Panel title="Special requests">
              {ev.notes ? <p className="whitespace-pre-line text-sm text-deep/80">{ev.notes}</p> : <p className="text-sm text-deep/55">No special requests.</p>}
            </Panel>

            {ev.quoteAmount ? (
              <Panel title="Current quote">
                <p className="font-display text-3xl font-semibold text-deep">{formatNgn(ev.quoteAmount)}</p>
                {ev.quoteNote ? <p className="mt-2 text-sm text-deep/70">{ev.quoteNote}</p> : null}
                {ev.quoteLink ? (
                  <a href={ev.quoteLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-tea">
                    Open quote document
                  </a>
                ) : null}
              </Panel>
            ) : null}
          </>
        }
        aside={
          <>
            <Panel title="Quote & status">
              <div className="grid gap-4">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-deep">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={form.status === s}
                        onClick={() => setForm({ ...form, status: s })}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          form.status === s ? "bg-deep text-white" : "bg-off-white text-deep/70 hover:text-deep",
                        )}
                      >
                        {statusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  label="Quote (₦)"
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => {
                    setForm({ ...form, amount: e.target.value });
                    f.clear("amount");
                  }}
                  error={f.errors.amount ?? undefined}
                  placeholder="150000"
                />
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-deep">Note to customer</span>
                  <textarea className={textareaClass} rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What's included, deposit, setup time…" />
                </label>
                <Input
                  label="Quote link (optional)"
                  placeholder="https://…"
                  value={form.link}
                  onChange={(e) => {
                    setForm({ ...form, link: e.target.value });
                    f.clear("link");
                  }}
                  error={f.errors.link ?? undefined}
                />
                <Button variant="dark" onClick={() => save()}>
                  Save & notify customer
                </Button>
              </div>
            </Panel>

            <Panel
              title="Customer"
              actions={
                ev.user?.id ? (
                  <Link href={`/users/${ev.user.id}`} className="text-xs font-semibold text-tea hover:text-deep">
                    Profile
                  </Link>
                ) : null
              }
            >
              <div className="flex items-center gap-3">
                <Avatar name={ev.user?.fullName} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-deep">{ev.user?.fullName || "Customer"}</p>
                  <p className="truncate text-xs text-deep/55">{[phone, ev.user?.email].filter(Boolean).join(" · ") || "No contact details"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {phone ? (
                  <>
                    <a href={whatsappLink(phone, msg)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1.5 text-xs font-semibold text-deep">
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                    <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-full bg-off-white px-3 py-1.5 text-xs font-semibold text-deep">
                      <Phone size={13} /> Call
                    </a>
                  </>
                ) : null}
                {ev.user?.email ? (
                  <a href={`mailto:${ev.user.email}`} className="inline-flex items-center gap-1.5 rounded-full bg-off-white px-3 py-1.5 text-xs font-semibold text-deep">
                    <Mail size={13} /> Email
                  </a>
                ) : null}
              </div>
            </Panel>
          </>
        }
      />
    </>
  );
}
