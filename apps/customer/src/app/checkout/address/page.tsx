"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bike, Briefcase, Check, Clock, Home, Landmark, MapPin, Phone, Search, Store, X } from "lucide-react";
import { ApiRequestError, apiClient, apiUrl } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { Address } from "@/lib/types";
import { InnerPage } from "@/components/layout/InnerPage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { VerifyingInline } from "@/components/ui/Verifying";
import { cn } from "@/lib/cn";
import { CheckoutSteps } from "@/components/layout/CheckoutSteps";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { StickyActions } from "@/components/layout/StickyActions";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { useAuthStore } from "@/store/auth-store";

type PlaceSuggestion = { placeId: string; description: string; mainText?: string; secondaryText?: string };
type PlaceDetails = {
  placeId: string | null;
  formattedAddress: string;
  lat: number;
  lng: number;
  state: string | null;
  inLagos: boolean;
};

const newSessionToken = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
type Fulfillment = "delivery" | "pickup";
type CheckoutOptions = {
  pickup: { enabled: boolean; address: string | null; hours: string | null };
  delivery: { enabled: boolean; feePaidOnArrival: boolean };
};

const NO_PICKUP: CheckoutOptions = {
  pickup: { enabled: false, address: null, hours: null },
  delivery: { enabled: true, feePaidOnArrival: true },
};

function FulfillmentForm() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const router = useRouter();
  useRequireAuth();
  const user = useAuthStore((s) => s.user);
  const needsPhone = !!user && !user.phone;

  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [mode, setMode] = useState<Fulfillment>("delivery");
  const [agreeFee, setAgreeFee] = useState(false);
  const [contactPhone, setContactPhone] = useState("+234");
  const phoneOk = contactPhone.replace(/\D/g, "").length >= 10;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selected, setSelected] = useState<PlaceDetails | null>(null);
  const [resolving, setResolving] = useState(false);
  const [landmark, setLandmark] = useState("");
  // One Google "session" per address search keeps autocomplete + details billed as one lookup.
  const [sessionToken, setSessionToken] = useState(newSessionToken);
  const [saved, setSaved] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void apiClient
      .get<CheckoutOptions>("/checkout/options")
      .then(setOptions)
      .catch(() => setOptions(NO_PICKUP));
    void apiClient
      .get<Address[] | { data: Address[] }>("/me/addresses")
      .then((res) => setSaved(asArray(res)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || q === selected?.formattedAddress) {
      setSuggestions([]);
      return;
    }
    const t = window.setTimeout(() => {
      void apiClient
        .get<PlaceSuggestion[] | { data: PlaceSuggestion[] }>("/places/autocomplete", { q, session: sessionToken })
        .then((res) => setSuggestions(asArray(res)))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected, sessionToken]);

  async function choose(s: PlaceSuggestion) {
    setSuggestions([]);
    setQuery(s.description);
    setResolving(true);
    try {
      const d = await apiClient.get<PlaceDetails>("/places/details", { placeId: s.placeId, session: sessionToken });
      setSelected(d);
      setQuery(d.formattedAddress);
      if (!d.inLagos) toast.error(notInLagosMessage(d.state));
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "We couldn't load that address. Please try again.");
    } finally {
      setResolving(false);
    }
  }

  function clearAddress() {
    setSelected(null);
    setQuery("");
    setSuggestions([]);
    setSessionToken(newSessionToken());
  }

  const pickupEnabled = options?.pickup.enabled ?? false;

  async function submit(addressId?: string) {
    if (!orderId) {
      toast.error("Missing order.");
      return;
    }
    if (needsPhone && !phoneOk) {
      toast.error("Add your WhatsApp number so we can send you updates.");
      return;
    }
    if (mode === "delivery" && !agreeFee) {
      toast.error("Please tick the box to agree to pay the delivery fee on arrival.");
      return;
    }
    const phone = needsPhone ? { contactPhone: contactPhone.trim() } : {};
    const body =
      mode === "pickup"
        ? { fulfillment: "pickup", ...phone }
        : addressId
          ? { fulfillment: "delivery", agreeDeliveryFee: true, addressId, ...phone }
          : selected
            ? {
                fulfillment: "delivery",
                agreeDeliveryFee: true,
                placeId: selected.placeId ?? undefined,
                sessionToken,
                formattedAddress: selected.formattedAddress,
                lat: selected.lat,
                lng: selected.lng,
                landmark: landmark.trim() || undefined,
                ...phone,
              }
            : null;
    if (mode === "delivery" && !addressId && selected && !selected.inLagos) {
      toast.error(notInLagosMessage(selected.state));
      return;
    }
    if (!body) {
      toast.error("Enter your delivery address.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post(`/orders/${orderId}/address`, body);
      if (needsPhone) void useAuthStore.getState().refreshMe();
      router.push(`/checkout/review?orderId=${orderId}`);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Could not save. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const outsideLagos = mode === "delivery" && !!selected && !selected.inLagos;
  const canContinue =
    (!needsPhone || phoneOk) && (mode === "pickup" ? pickupEnabled : agreeFee && !!selected && selected.inLagos);

  const choices = [
    { id: "delivery" as const, label: "Delivery", hint: "Pay rider on arrival", icon: Bike },
    ...(pickupEnabled ? [{ id: "pickup" as const, label: "Pickup", hint: "Collect from us", icon: Store }] : []),
  ];

  return (
    <InnerPage
      title="Pickup or delivery?"
      subtitle="Tell us how you'd like to get your treats."
      backHref={orderId ? `/orders/${orderId}` : "/orders"}
      className="min-h-dvh pb-32 md:pb-12"
      facts={[
        { icon: MapPin, value: "Anywhere in Lagos", label: "Where we deliver" },
        { icon: Bike, value: "Paid to the rider", label: "Delivery fee, on arrival" },
        ...(pickupEnabled
          ? [{ icon: Store, value: options?.pickup.hours || "We'll tell you when it's ready", label: "Pickup" }]
          : []),
      ]}
    >
      <CheckoutSteps current={0} />

      <div className={cn("mb-5 grid gap-2.5", choices.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {choices.map((opt) => {
          const active = mode === opt.id;
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setMode(opt.id)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-3 rounded-[22px] border bg-white p-3.5 text-left shadow-[var(--shadow-card)] transition",
                active ? "border-deep ring-2 ring-deep/10" : "border-deep/8",
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
                  active ? "bg-deep text-white" : "bg-sage-soft text-tea",
                )}
              >
                <Icon size={20} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-deep">{opt.label}</span>
                <span className="block text-[11px] text-deep/50">{opt.hint}</span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "pickup" ? (
          <motion.div
            key="pickup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="rounded-[22px] bg-sage-soft p-4"
          >
            <p className="flex items-start gap-2.5 text-sm text-deep">
              <MapPin size={17} className="mt-0.5 shrink-0 text-tea" />
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-deep/50">
                  Pickup location
                </span>
                <span className="mt-0.5 block font-semibold">
                  {options?.pickup.address || "We'll send the pickup address on WhatsApp."}
                </span>
              </span>
            </p>
            {options?.pickup.hours ? (
              <p className="mt-3 flex items-center gap-2.5 text-sm text-deep/70">
                <Clock size={15} className="shrink-0 text-tea" />
                {options.pickup.hours}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-deep/55">
              We&apos;ll message you on WhatsApp the moment your order is ready.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="delivery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <Input
              label="Delivery address"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected) setSelected(null);
              }}
              placeholder="Start typing your street or estate"
              autoComplete="off"
              leftAddon={<Search size={18} className="text-tea" />}
            />
            <AnimatePresence>
              {suggestions.length ? (
                <motion.ul
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-2 overflow-hidden rounded-[20px] border border-deep/5 bg-white shadow-[var(--shadow-card)]"
                >
                  {suggestions.map((s) => (
                    <li key={s.placeId} className="border-b border-deep/5 last:border-0">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-deep transition hover:bg-off-white active:bg-off-white"
                        onClick={() => void choose(s)}
                      >
                        <MapPin size={16} className="shrink-0 text-tea" />
                        {s.placeId.startsWith("typed:") ? (
                          <span>Use “{s.description}”</span>
                        ) : (
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{s.mainText || s.description}</span>
                            {s.secondaryText ? (
                              <span className="block truncate text-xs text-deep/50">{s.secondaryText}</span>
                            ) : null}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>

            <VerifyingInline show={resolving} text="Checking your address on the map…" className="justify-start pl-1" />

            <AnimatePresence>
              {selected ? (
                <motion.div
                  key={selected.formattedAddress}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-3 space-y-3"
                >
                  {outsideLagos ? (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-[20px] border border-danger/35 bg-[#fdecea] p-3.5 text-sm text-[#7a1a12]"
                    >
                      <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="block font-semibold">{notInLagosMessage(selected.state)}</span>
                        <span className="mt-0.5 block text-xs">
                          {pickupEnabled
                            ? "You can't continue with this address. Choose pickup or enter a Lagos address."
                            : "You can't continue with this address. Please enter a Lagos address."}
                        </span>
                      </span>
                    </div>
                  ) : null}
                  <div className="overflow-hidden rounded-[22px] border border-deep/5 bg-white shadow-[var(--shadow-card)]">
                    {selected.lat && selected.lng ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={apiUrl(`/places/map?lat=${selected.lat}&lng=${selected.lng}`)}
                        alt="Map of your delivery address"
                        className="h-40 w-full bg-off-white object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    ) : null}
                    <p className="flex items-start gap-2.5 p-3.5 text-sm text-deep">
                      <MapPin size={17} className={cn("mt-0.5 shrink-0", outsideLagos ? "text-danger" : "text-tea")} />
                      <span>
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-deep/50">
                          Delivering to
                        </span>
                        <span className="mt-0.5 block font-semibold">{selected.formattedAddress}</span>
                      </span>
                      <button
                        type="button"
                        aria-label="Change address"
                        onClick={clearAddress}
                        className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-off-white text-deep/50 transition hover:text-deep"
                      >
                        <X size={15} />
                      </button>
                    </p>
                  </div>
                  {!outsideLagos ? (
                    <Input
                      label="Landmark or directions (optional)"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Blue gate opposite the church"
                      maxLength={200}
                      leftAddon={<Landmark size={18} className="text-tea" />}
                    />
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {saved.length > 0 ? (
              <div className="mt-5 space-y-2">
                <p className="pl-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/45">
                  Saved addresses
                </p>
                {saved.map((a, i) => (
                  <motion.button
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => void submit(a.id)}
                    className="flex w-full items-center gap-3 rounded-[22px] border border-deep/5 bg-white p-3 text-left text-sm shadow-[var(--shadow-card)]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush-soft text-deep">
                      {a.label.toLowerCase() === "work" ? <Briefcase size={18} /> : <Home size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-deep">{a.label}</span>
                      <span className="block truncate text-deep/55">{a.formattedAddress}</span>
                    </span>
                    <span className="text-xs font-semibold text-tea">Use</span>
                  </motion.button>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              role="checkbox"
              aria-checked={agreeFee}
              onClick={() => setAgreeFee((v) => !v)}
              className={cn(
                "mt-5 flex w-full items-start gap-3 rounded-[20px] border p-3.5 text-left transition-colors",
                agreeFee ? "border-tea bg-sage-soft" : "border-honey/60 bg-honey-soft",
              )}
            >
              <motion.span
                animate={{ scale: agreeFee ? [1, 1.18, 1] : 1 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                  agreeFee ? "border-tea bg-tea text-white" : "border-deep/30 bg-white",
                )}
              >
                {agreeFee ? <Check size={13} strokeWidth={3} /> : null}
              </motion.span>
              <span className="text-sm leading-snug text-deep">
                <span className="font-semibold">I agree to pay the delivery fee to the rider</span> when my order
                arrives.
                <span className="mt-0.5 block text-xs text-deep/55">
                  The fee depends on your location and isn&apos;t part of your online payment.
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {needsPhone ? (
        <div className="mt-5">
          <Input
            label="WhatsApp number for order updates"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+234 801 234 5678"
            autoComplete="tel"
            leftAddon={<Phone size={18} className="text-tea" />}
          />
        </div>
      ) : null}

      <StickyActions>
        <Button fullWidth variant="dark" loading={loading} disabled={!canContinue} onClick={() => void submit()}>
          Continue to review
        </Button>
      </StickyActions>
    </InnerPage>
  );
}

function notInLagosMessage(state: string | null) {
  return state && !/lagos/i.test(state)
    ? `Sorry, we don't deliver to ${state} yet.`
    : "Sorry, we don't deliver to that location yet.";
}

export default function CheckoutAddressPage() {
  return (
    <Suspense
      fallback={
        <div className="page-pad-no-tab">
          <PageSkeleton variant="list" />
        </div>
      }
    >
      <FulfillmentForm />
    </Suspense>
  );
}
