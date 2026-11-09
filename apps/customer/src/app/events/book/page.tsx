"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, PartyPopper } from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import { EVENT_CITIES, EVENT_PLACEHOLDER } from "@/lib/placeholders";
import type { EventType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { AuthGateSheet } from "@/components/auth/AuthGateSheet";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader, PageSkeleton } from "@/components/ui/ColumnLoader";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyActions } from "@/components/layout/StickyActions";
import { Input, textareaClass } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

const STEPS = ["Event type", "When & where", "Final details"];
const DRAFT_KEY = "dht-event-draft";

function servedCity(city?: string | null): string {
  return city && EVENT_CITIES.includes(city) ? city : EVENT_CITIES[0];
}

function minEventDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

function BookEventForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<EventType[]>([]);
  const [typeId, setTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [city, setCity] = useState(() => servedCity(params.get("city")));
  const [venue, setVenue] = useState("");
  const [guests, setGuests] = useState("50");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [typesState, setTypesState] = useState<"loading" | "ready" | "error">("loading");
  const [authOpen, setAuthOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const loadTypes = useCallback(() => {
    setTypesState("loading");
    void apiClient
      .get<EventType[] | { data: EventType[] }>("/events/types")
      .then((res) => {
        setTypes(asArray(res));
        setTypesState("ready");
      })
      .catch(() => setTypesState("error"));
  }, []);

  useEffect(() => {
    loadTypes();
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    sessionStorage.removeItem(DRAFT_KEY);
    try {
      const d = JSON.parse(saved) as Record<string, string>;
      setTypeId(d.typeId ?? "");
      setTitle(d.title ?? "");
      setDate(d.date ?? "");
      setTime(d.time ?? "");
      setCity(servedCity(d.city));
      setVenue(d.venue ?? "");
      setGuests(d.guests ?? "50");
      setBudget(d.budget ?? "");
      setNotes(d.notes ?? "");
      setStep(STEPS.length - 1);
    } catch {
      /* ignore a corrupt draft */
    }
  }, [loadTypes]);

  async function submit() {
    if (!user) {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ typeId, title, date, time, city, venue, guests, budget, notes }),
      );
      setAuthOpen(true);
      return;
    }
    setLoading(true);
    try {
      const ev = await apiClient.post<{ id: string }>("/events", {
        typeId,
        title: title || undefined,
        date,
        time,
        city,
        venueAddress: venue,
        guests: Number(guests) || 1,
        budget: budget ? Number(budget) * 100 : undefined,
        services: [],
        notes: notes || undefined,
      });
      toast("Request sent — we will be in touch.");
      router.push(`/events/${ev.id}`);
    } catch {
      toast("Could not submit. Try again or WhatsApp us.");
    } finally {
      setLoading(false);
    }
  }

  const canContinue = step === 0 ? !!typeId : step === 1 ? !!date && !!venue : true;

  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+110px)]">
      <PageHeader
        eyebrow={`Step ${step + 1} of ${STEPS.length}`}
        title={STEPS[step]}
        backHref={step === 0 ? "/events" : undefined}
      />

      <div className="mb-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-deep/10">
            <motion.div
              initial={false}
              animate={{ width: i <= step ? "100%" : "0%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-deep"
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && typesState === "loading" ? (
            <ColumnLoader columns={3} count={4} aspect="aspect-[4/5]" />
          ) : step === 0 && typesState === "error" ? (
            <OfflineState onRetry={loadTypes} />
          ) : step === 0 && types.length === 0 ? (
            <EmptyState
              icon={<PartyPopper size={28} />}
              title="Event packages coming soon"
              description="Chat with us on WhatsApp and we'll plan it together."
            />
          ) : step === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {types.map((t) => {
                const active = typeId === t.id;
                return (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    key={t.id}
                    type="button"
                    onClick={() => setTypeId(t.id)}
                    className={cn(
                      "relative overflow-hidden rounded-[24px] border-2 bg-white p-2 text-left shadow-[var(--shadow-card)] transition-colors",
                      active ? "border-deep" : "border-transparent",
                    )}
                  >
                    <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-blush-soft">
                      <Image src={t.image || EVENT_PLACEHOLDER} alt="" fill className="object-cover" sizes="200px" unoptimized />
                    </span>
                    <span className="block px-1 pb-1 pt-2.5 text-sm font-semibold text-deep">{t.name}</span>
                    <AnimatePresence>
                      {active ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-deep text-white"
                        >
                          <Check size={15} />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <Input label="Event title (optional)" placeholder="e.g. Tolu's 30th" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date" type="date" min={minEventDate()} value={date} onChange={(e) => setDate(e.target.value)} />
                <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <p className="mb-1.5 pl-1 text-sm font-semibold text-deep">City</p>
                <div className="flex flex-wrap gap-2">
                  {EVENT_CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCity(c)}
                      className={cn(
                        "rounded-full px-4 py-2 text-xs font-semibold transition",
                        city === c ? "bg-deep text-white" : "bg-white text-deep ring-1 ring-deep/10",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Venue address" placeholder="Street, area" value={venue} onChange={(e) => setVenue(e.target.value)} />
              <p className="pl-1 text-xs text-deep/50">
                {city === "Ibadan"
                  ? "We travel to Ibadan for events when booked early — at least 3 days notice."
                  : "Events need at least 3 days notice. Pastry delivery stays Lagos-only."}
              </p>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Expected guests" type="number" inputMode="numeric" value={guests} onChange={(e) => setGuests(e.target.value)} />
                <Input label="Budget (₦, optional)" type="number" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <label className="block text-sm">
                <span className="mb-1.5 block pl-1 font-semibold text-deep">Special requests</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className={textareaClass}
                  placeholder="Theme, dietary needs, setup time…"
                />
              </label>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <StickyActions aboveTabs>
        <div className="glass flex gap-2 rounded-[30px] border border-white/80 p-2 shadow-[var(--shadow-float)]">
          {step > 0 ? (
            <Button variant="tertiary" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button fullWidth variant="dark" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button fullWidth variant="dark" loading={loading} onClick={() => void submit()}>
              Submit request
            </Button>
          )}
        </div>
      </StickyActions>

      <AuthGateSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        returnTo="/events/book"
        title="Last step"
        message="Add your name and number so we can send your quote. Your details are saved."
      />
    </div>
  );
}

export default function BookEventPage() {
  return (
    <Suspense
      fallback={
        <div className="page-pad">
          <PageSkeleton variant="grid" />
        </div>
      }
    >
      <BookEventForm />
    </Suspense>
  );
}
