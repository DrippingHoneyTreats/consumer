"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, Check, Clock, FileText, MapPin, MessageCircle, Users, Wallet } from "lucide-react";
import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { formatNgn, statusLabel, contactLink } from "@/lib/format";
import type { EventRequest } from "@/lib/types";
import { InnerPage, PageSection } from "@/components/layout/InnerPage";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

const TIMELINE = ["submitted", "reviewing", "quote_sent", "confirmed", "completed"];

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRequest | null>(null);

  useEffect(() => {
    void apiClient
      .get<EventRequest | { data: EventRequest }>(`/events/${id}`)
      .then((res) => setEvent(unwrapData(res) ?? (res as EventRequest)))
      .catch(() => toast.error("Could not load this event."));
  }, [id]);

  async function cancel() {
    if (!confirm("Cancel this event request?")) return;
    try {
      await apiClient.post(`/events/${id}/cancel`);
      toast.success("Request cancelled.");
      const res = await apiClient.get<EventRequest>(`/events/${id}`);
      setEvent(res);
    } catch {
      toast.error("Could not cancel.");
    }
  }

  if (!event) {
    return (
      <div className="page-pad">
        <PageSkeleton variant="detail" />
      </div>
    );
  }

  const current = TIMELINE.indexOf(event.status);
  const cancelled = event.status === "cancelled";

  const details = [
    { icon: CalendarDays, label: "Date", value: event.date },
    { icon: Clock, label: "Time", value: event.time || "—" },
    { icon: MapPin, label: "Venue", value: `${event.venueAddress}${event.city ? `, ${event.city}` : ""}` },
    { icon: Users, label: "Guests", value: String(event.guests) },
    ...(event.budget ? [{ icon: Wallet, label: "Budget", value: formatNgn(event.budget) }] : []),
  ];

  const buttons = (
    <>
      {event.quoteLink ? (
        <a href={event.quoteLink} className="block">
          <Button fullWidth variant="dark" leftIcon={<FileText size={16} />}>
            View quote
          </Button>
        </a>
      ) : null}
      <a href={contactLink(`Hi DHT, about event ${event.refNo}`)} className="block">
        <Button fullWidth variant={event.quoteLink ? "tertiary" : "dark"} leftIcon={<MessageCircle size={16} />}>
          Chat on WhatsApp
        </Button>
      </a>
      {!["cancelled", "completed", "confirmed"].includes(event.status) ? (
        <Button variant="ghost" fullWidth className="text-danger" onClick={() => void cancel()}>
          Cancel request
        </Button>
      ) : null}
    </>
  );

  return (
    <InnerPage
      tabbed
      eyebrow="Event booking"
      title={event.title || event.type || "Event"}
      subtitle={`Ref ${event.refNo}`}
      backHref="/events"
      help={false}
      hero={
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-white/70">{event.quoteAmount ? "Your quote" : "Quote"}</p>
            <p className="font-display text-2xl">{event.quoteAmount ? formatNgn(event.quoteAmount) : "Coming soon"}</p>
          </div>
          <Badge status={event.status} className="bg-white/85" />
        </div>
      }
      facts={details.map(({ icon, label, value }) => ({ icon, label, value }))}
      actions={buttons}
    >
      {!cancelled ? (
        <PageSection title="Progress">
          <div className="flex items-start justify-between">
            {TIMELINE.map((s, i) => {
              const done = i <= current;
              return (
                <div key={s} className="relative flex flex-1 flex-col items-center text-center">
                  {i > 0 ? (
                    <span className="absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 bg-deep/10">
                      <motion.span
                        initial={{ width: 0 }}
                        animate={{ width: done ? "100%" : 0 }}
                        transition={{ delay: 0.2 + i * 0.12, duration: 0.35 }}
                        className="block h-full bg-tea"
                      />
                    </span>
                  ) : null}
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                      done ? "bg-tea text-white" : "bg-off-white text-deep/35",
                      i === current && "bg-blush text-deep ring-4 ring-blush/40",
                    )}
                  >
                    {done && i !== current ? <Check size={14} /> : i + 1}
                  </motion.span>
                  <span className={cn("mt-1.5 text-[10px] font-semibold leading-tight md:text-xs", done ? "text-deep" : "text-deep/35")}>
                    {statusLabel(s)}
                  </span>
                </div>
              );
            })}
          </div>
        </PageSection>
      ) : null}

      <PageSection title="Quote">
        {event.quoteAmount ? (
          <div>
            <p className="font-display text-3xl text-deep">{formatNgn(event.quoteAmount)}</p>
            {event.quoteNote ? <p className="mt-1 text-sm text-deep/65">{event.quoteNote}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-deep/65">We&apos;re reviewing your request and will send a quote on WhatsApp shortly.</p>
        )}
      </PageSection>

      <PageSection className="md:hidden">
        <div className="grid gap-2 sm:grid-cols-2">{buttons}</div>
      </PageSection>
    </InnerPage>
  );
}
