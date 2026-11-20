"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bike, Briefcase, Check, Clock, Home, Landmark, MapPin, Pencil, Phone, Search, Store, X } from "lucide-react";
import { ApiRequestError, apiClient, apiUrl } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { Address } from "@/lib/types";
import { InnerPage } from "@/components/layout/InnerPage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { VerifyingInline } from "@/components/ui/Verifying";
import { checkPhone, normalizeNgPhone, useFieldErrors } from "@/lib/validate";
import { cn } from "@/lib/cn";
import { CheckoutSteps } from "@/components/layout/CheckoutSteps";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { StickyActions } from "@/components/layout/StickyActions";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { useAuthStore } from "@/store/auth-store";
import { useLeaveIfPaid } from "@/hooks/useLeaveIfPaid";

type PlaceSuggestion = { placeId: string; description: string; mainText?: string; secondaryText?: string };
type PlaceDetails = {
  placeId: string | null;
  formattedAddress: string;
  lat: number;
  lng: number;
  state: string | null;
  inLagos: boolean;
  provider?: "google" | "osm" | "typed";
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

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selected, setSelected] = useState<PlaceDetails | null>(null);
  const [resolving, setResolving] = useState(false);
  const [landmark, setLandmark] = useState("");
  // Only kept in "Saved addresses" if the customer says so.
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("Home");
  // One Google "session" per address search keeps autocomplete + details billed as one lookup.
  const [sessionToken, setSessionToken] = useState(newSessionToken);
  const [saved, setSaved] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  useLeaveIfPaid(orderId);
  // A saved address the customer picked (only submitted when they press Continue).
  const [savedChoice, setSavedChoice] = useState<string | null>(null);
  const f = useFieldErrors();

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

  // Only the newest search may update the list (older, slower replies are ignored).
  const searchSeq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const seq = ++searchSeq.current;
    if (q.length < 3 || q === selected?.formattedAddress || resolving) {
      setSuggestions([]);
      setSearchingPlaces(false);
      return;
    }
    setSearchingPlaces(true);
    const t = window.setTimeout(() => {
      void apiClient
        .get<PlaceSuggestion[] | { data: PlaceSuggestion[] }>("/places/autocomplete", { q, session: sessionToken })
        .then((res) => {
          if (seq !== searchSeq.current) return;
          // "Use what you typed" is built locally (below) so it always matches the box.
          setSuggestions(asArray<PlaceSuggestion>(res).filter((x) => !x.placeId.startsWith("typed:")));
        })
        .catch(() => {
          if (seq === searchSeq.current) setSuggestions([]);
        })
        .finally(() => {
          if (seq === searchSeq.current) setSearchingPlaces(false);
        });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `resolving` only pauses searching
  }, [query, selected, sessionToken]);

  // Always offer exactly what's in the box right now, as the last option.
  const typedOption = useMemo<PlaceSuggestion | null>(() => {
    const q = query.trim();
    if (q.length < 3 || selected || resolving) return null;
    const description = /lagos|ibadan/i.test(q) ? q : `${q}, Lagos`;
    return { placeId: `typed:${description}`, description, mainText: `Use “${description}”`, secondaryText: "Exactly as you typed it" };
  }, [query, selected, resolving]);
  const placeOptions = typedOption ? [...suggestions, typedOption] : suggestions;
  // Searched, found nothing on the map: say so, and point to the typed option + landmark.
  const noMatches = Boolean(typedOption) && !searchingPlaces && suggestions.length === 0;

  async function choose(s: PlaceSuggestion) {
    setSavedChoice(null);
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

  async function submit(addressId: string | undefined = savedChoice ?? undefined) {
    if (!orderId) {
      toast.error("Missing order.");
      return;
    }
    const delivery = mode === "delivery";
    const ok = f.validate({
      address:
        delivery && !addressId && !selected
          ? query.trim()
            ? "Choose your address from the suggestions below the box."
            : saved.length
              ? "Choose a saved address or type a new one."
              : "Please enter your delivery address."
          : delivery && !addressId && selected && !selected.inLagos
            ? notInLagosMessage(selected.state)
            : null,
      agreeFee: delivery && !agreeFee ? "Please tick this box to agree to pay the delivery fee on arrival." : null,
      contactPhone: needsPhone ? checkPhone(contactPhone) : null,
    });
    if (!ok) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    const phone = needsPhone ? { contactPhone: normalizeNgPhone(contactPhone) } : {};
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
                saveAddress,
                label: saveAddress ? addressLabel : undefined,
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
      const msg = err instanceof ApiRequestError ? err.message : "Could not save. Please try again.";
      toast.error(msg);
      if (err instanceof ApiRequestError && err.code === "NOT_IN_LAGOS") f.setError("address", msg);
      else if (/phone|number|whatsapp/i.test(msg)) f.setError("contactPhone", msg);
      else if (/address/i.test(msg)) f.setError("address", msg);
    } finally {
      setLoading(false);
    }
  }

  const outsideLagos = mode === "delivery" && !!selected && !selected.inLagos;

  const choices = [
    { id: "delivery" as const, label: "Delivery", hint: "Pay rider on arrival", icon: Bike },
    ...(pickupEnabled ? [{ id: "pickup" as const, label: "Pickup", hint: "Collect from us", icon: Store }] : []),
  ];

  return (
    <InnerPage
      title="Pickup or delivery?"
      subtitle="Tell us how you'd like to get your treats."
      backHref={orderId ? `/orders/${orderId}` : "/orders"}
      className="min-h-dvh pb-[calc(140px+var(--safe-bottom))] md:pb-12"
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
              onClick={() => {
                setMode(opt.id);
                f.reset();
              }}
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
                f.clear("address");
                if (selected) setSelected(null);
                if (savedChoice) setSavedChoice(null);
              }}
              error={f.errors.address ?? undefined}
              placeholder="Start typing your street or estate"
              autoComplete="off"
              leftAddon={<Search size={18} className="text-tea" />}
            />
            <AnimatePresence>
              {placeOptions.length ? (
                <motion.ul
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-2 overflow-hidden rounded-[20px] border border-deep/5 bg-white shadow-[var(--shadow-card)]"
                >
                  {placeOptions.map((s) => (
                    <li key={s.placeId} className="border-b border-deep/5 last:border-0">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-deep transition hover:bg-off-white active:bg-off-white"
                        onClick={() => void choose(s)}
                      >
                        {s.placeId.startsWith("typed:") ? (
                          <Pencil size={15} className="shrink-0 text-deep/45" />
                        ) : (
                          <MapPin size={16} className="shrink-0 text-tea" />
                        )}
                        <span className="min-w-0">
                          <span className={cn("block truncate", s.placeId.startsWith("typed:") ? "text-deep/80" : "font-semibold")}>
                            {s.mainText || s.description}
                          </span>
                          {s.secondaryText ? <span className="block truncate text-xs text-deep/50">{s.secondaryText}</span> : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>

            <VerifyingInline show={searchingPlaces} text="Searching addresses…" className="justify-start pl-1" />
            {noMatches ? (
              <p className="mt-2 pl-1 text-xs text-deep/55">
                We couldn&apos;t find that on the map. Try your street name or area (e.g. &ldquo;Admiralty Way&rdquo;), or use it exactly as typed and add a landmark.
              </p>
            ) : null}
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
                      selected.provider === "google" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={apiUrl(`/places/map?lat=${selected.lat}&lng=${selected.lng}`)}
                          alt="Map of your delivery address"
                          className="h-40 w-full bg-off-white object-cover"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      ) : (
                        <iframe
                          title="Map of your delivery address"
                          loading="lazy"
                          className="pointer-events-none h-40 w-full border-0 bg-off-white"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.006},${selected.lat - 0.004},${selected.lng + 0.006},${selected.lat + 0.004}&layer=mapnik&marker=${selected.lat},${selected.lng}`}
                        />
                      )
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
                  {!outsideLagos ? (
                    <div className="rounded-[20px] bg-off-white p-3.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={saveAddress}
                        onClick={() => setSaveAddress((v) => !v)}
                        className="flex w-full items-start gap-3 text-left"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                            saveAddress ? "border-tea bg-tea text-white" : "border-deep/30 bg-white",
                          )}
                        >
                          {saveAddress ? <Check size={13} strokeWidth={3} /> : null}
                        </span>
                        <span className="text-sm leading-snug text-deep">
                          <span className="font-semibold">Save this address for next time</span>
                          <span className="mt-0.5 block text-xs text-deep/55">
                            Optional. You can remove saved addresses any time in your account.
                          </span>
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {saveAddress ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-wrap gap-2 pl-8 pt-3">
                              {["Home", "Work", "Other"].map((l) => (
                                <button
                                  key={l}
                                  type="button"
                                  aria-pressed={addressLabel === l}
                                  onClick={() => setAddressLabel(l)}
                                  className={cn(
                                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                                    addressLabel === l ? "bg-deep text-white" : "bg-white text-deep ring-1 ring-deep/10",
                                  )}
                                >
                                  {l}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {saved.length > 0 ? (
              <div className="mt-5 space-y-2">
                <p className="flex items-center justify-between pl-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/45">
                  Saved addresses
                  <Link href="/account/addresses" className="normal-case tracking-normal text-tea">
                    Manage
                  </Link>
                </p>
                {saved.map((a, i) => (
                  <motion.button
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      // Select only. Nothing is submitted until they press Continue.
                      setSavedChoice((cur) => (cur === a.id ? null : a.id));
                      setSelected(null);
                      setQuery("");
                      setSuggestions([]);
                      f.clear("address");
                    }}
                    aria-pressed={savedChoice === a.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[22px] border bg-white p-3 text-left text-sm shadow-[var(--shadow-card)] transition-colors",
                      savedChoice === a.id ? "border-deep ring-2 ring-deep/10" : "border-deep/5",
                    )}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush-soft text-deep">
                      {a.label.toLowerCase() === "work" ? <Briefcase size={18} /> : <Home size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-deep">{a.label}</span>
                      <span className="block truncate text-deep/55">{a.formattedAddress}</span>
                    </span>
                    {savedChoice === a.id ? (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-deep text-white" aria-label="Selected">
                        <Check size={15} strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-deep/15 px-3 py-1 text-xs font-semibold text-deep/70">Select</span>
                    )}
                  </motion.button>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              role="checkbox"
              aria-checked={agreeFee}
              aria-invalid={f.errors.agreeFee ? true : undefined}
              onClick={() => {
                setAgreeFee((v) => !v);
                f.clear("agreeFee");
              }}
              className={cn(
                "mt-5 flex w-full items-start gap-3 rounded-[20px] border p-3.5 text-left transition-colors",
                agreeFee
                  ? "border-tea bg-sage-soft"
                  : f.errors.agreeFee
                    ? "border-danger/70 bg-[#fdecea] ring-4 ring-danger/10"
                    : "border-honey/60 bg-honey-soft",
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
            {f.errors.agreeFee ? (
              <p role="alert" className="mt-1.5 pl-1 text-xs font-semibold text-danger">
                {f.errors.agreeFee}
              </p>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {needsPhone ? (
        <div className="mt-5">
          <Input
            label="WhatsApp number for order updates"
            type="tel"
            value={contactPhone}
            onChange={(e) => {
              setContactPhone(e.target.value);
              f.clear("contactPhone");
            }}
            error={f.errors.contactPhone ?? undefined}
            placeholder="0803 123 4567"
            autoComplete="tel"
            leftAddon={<Phone size={18} className="text-tea" />}
          />
        </div>
      ) : null}

      <StickyActions>
        <Button fullWidth variant="dark" loading={loading} onClick={() => submit()}>
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
