"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, MapPin, PartyPopper, Users } from "lucide-react";
import { ApiRequestError, apiClient } from "@/lib/api";
import { checkRequired, useFieldErrors } from "@/lib/validate";
import { asArray } from "@/lib/data";
import { EVENT_CITIES, EVENT_PLACEHOLDER } from "@/lib/placeholders";
import type { EventType } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { AuthGateSheet } from "@/components/auth/AuthGateSheet";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader, PageSkeleton } from "@/components/ui/ColumnLoader";
import { InnerPage } from "@/components/layout/InnerPage";
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

/** Notice we need before an event: Ibadan means travel, so 3 weeks; Lagos 3 days. */
const NOTICE_DAYS: Record<string, number> = { Ibadan: 21 };
const DEFAULT_NOTICE_DAYS = 3;
const noticeDays = (city: string) => NOTICE_DAYS[city] ?? DEFAULT_NOTICE_DAYS;

function minEventDate(city: string): string {
  const d = new Date();
  d.setDate(d.getDate() + noticeDays(city));
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
  const f = useFieldErrors();
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
    // Re-check every step: a draft restored after sign-in could be incomplete.
    for (const i of [0, 1, 2]) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }
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
      toast.success("Request sent — we will be in touch.");
      router.push(`/events/${ev.id}`);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "Could not submit. Try again or WhatsApp us.";
      toast.error(msg);
      if (/date|notice/i.test(msg)) {
        setStep(1);
        f.setError("date", msg);
      } else if (/venue/i.test(msg)) {
        setStep(1);
        f.setError("venue", msg);
      } else if (/guest/i.test(msg)) f.setError("guests", msg);
      else if (/type/i.test(msg)) {
        setStep(0);
        f.setError("typeId", msg);
      }
    } finally {
      setLoading(false);
    }
  }

  /** Check the fields on the current step; shows messages under each one. */
  function validateStep(which = step): boolean {
    const checks =
      which === 0
        ? { typeId: typeId ? null : "Please choose the type of event." }
        : which === 1
          ? {
              date: !date
                ? "Please pick the date of your event."
                : date < minEventDate(city)
                  ? `${city} events need at least ${city === "Ibadan" ? "3 weeks" : `${noticeDays(city)} days`} notice. Please pick a later date.`
                  : null,
              venue: checkRequired(venue, "Please enter the venue address.") ?? (venue.trim().length < 5 ? "Add a bit more detail: street and area." : null),
            }
          : {
              guests:
                !guests.trim()
                  ? "How many guests are you expecting?"
                  : !/^\d+$/.test(guests.trim()) || Number(guests) < 1
                    ? "Enter the number of guests, e.g. 50."
                    : Number(guests) > 5000
                      ? "For more than 5,000 guests, please chat with us on WhatsApp."
                      : null,
              budget: budget.trim() && (!/^\d+$/.test(budget.trim()) || Number(budget) < 0) ? "Enter your budget as a number, e.g. 150000." : null,
            };
    const ok = f.validate(checks);
    if (!ok) toast.error("Please fix the highlighted fields.");
    return ok;
  }

  function next() {
    if (validateStep()) setStep((s) => s + 1);
  }
  const showSticky =
    step > 0 || (step === 0 && typesState === "ready" && types.length > 0);

  return (
    <InnerPage
      tabbed
      className={cn(showSticky && "pb-[calc(var(--tab-h)+var(--safe-bottom)+var(--banner-h,0px)+110px)] md:pb-[calc(var(--tab-h)+var(--safe-bottom)+var(--banner-h,0px)+24px)]")}
      eyebrow={`Step ${step + 1} of ${STEPS.length}`}
      title={STEPS[step]}
      subtitle="Tell us about your event and we'll send a quote on WhatsApp."
      facts={[
        { icon: PartyPopper, value: types.find((t) => t.id === typeId)?.name || "Not chosen yet", label: "Event type" },
        {
          icon: CalendarDays,
          value: date ? new Date(`${date}T00:00`).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }) + (time ? ` · ${time}` : "") : "Pick a date",
          label: "When",
        },
        { icon: MapPin, value: venue ? `${venue}, ${city}` : city || "Lagos", label: "Where" },
        { icon: Users, value: `${guests || "–"} guests`, label: "Expected" },
      ]}
      backHref={step === 0 ? "/events" : undefined}
      onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
    >

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
            <div>
            {f.errors.typeId ? (
              <p role="alert" data-invalid="true" className="mb-3 rounded-2xl border border-danger/35 bg-[#fdecea] px-4 py-3 text-sm font-semibold text-[#7a1a12]">
                {f.errors.typeId}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              {types.map((t) => {
                const active = typeId === t.id;
                return (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTypeId(t.id);
                      f.clear("typeId");
                    }}
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
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <Input label="Event title (optional)" placeholder="e.g. Tolu's 30th" value={title} onChange={(e) => setTitle(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Date"
                  type="date"
                  min={minEventDate(city)}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    f.clear("date");
                  }}
                  error={f.errors.date ?? undefined}
                />
                <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <p className="mb-1.5 pl-1 text-sm font-semibold text-deep">City</p>
                <div className="flex flex-wrap gap-2">
                  {EVENT_CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCity(c);
                        f.clear("date");
                        // A date that was fine for Lagos may be too soon for Ibadan.
                        if (date && date < minEventDate(c)) {
                          setDate("");
                          toast.info(`${c} events need at least ${c === "Ibadan" ? "3 weeks" : `${noticeDays(c)} days`} notice. Please pick a later date.`);
                        }
                      }}
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
              <Input
                label="Venue address"
                placeholder="Street, area"
                value={venue}
                onChange={(e) => {
                  setVenue(e.target.value);
                  f.clear("venue");
                }}
                error={f.errors.venue ?? undefined}
              />
              <p className="pl-1 text-xs text-deep/50">
                {city === "Ibadan"
                  ? "We travel to Ibadan for events, so please book at least 3 weeks ahead."
                  : "Events need at least 3 days notice. Pastry delivery stays Lagos-only."}
              </p>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Expected guests"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={guests}
                  onChange={(e) => {
                    setGuests(e.target.value);
                    f.clear("guests");
                  }}
                  error={f.errors.guests ?? undefined}
                />
                <Input
                  label="Budget (₦, optional)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={budget}
                  onChange={(e) => {
                    setBudget(e.target.value);
                    f.clear("budget");
                  }}
                  error={f.errors.budget ?? undefined}
                />
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

      {showSticky ? (
        <StickyActions aboveTabs>
          <div className="flex justify-center gap-2">
            {step > 0 ? (
              <Button variant="tertiary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button variant="dark" className="px-8" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button variant="dark" className="px-8" loading={loading} onClick={() => submit()}>
                Submit request
              </Button>
            )}
          </div>
        </StickyActions>
      ) : null}

      <AuthGateSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        returnTo="/events/book"
        title="Last step"
        message="Add your name and number so we can send your quote. Your details are saved."
      />
    </InnerPage>
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
