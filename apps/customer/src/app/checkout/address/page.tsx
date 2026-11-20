"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bike, Briefcase, Check, Clock, Home, MapPin, Phone, Search, Store } from "lucide-react";
import { ApiRequestError, apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { Address } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { CheckoutSteps } from "@/components/layout/CheckoutSteps";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { StickyActions } from "@/components/layout/StickyActions";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { useAuthStore } from "@/store/auth-store";

type PlaceSuggestion = { placeId: string; description: string };
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
  const [selected, setSelected] = useState<string | null>(null);
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
    if (q.length < 3 || q === selected) {
      setSuggestions([]);
      return;
    }
    const t = window.setTimeout(() => {
      void apiClient
        .get<PlaceSuggestion[] | { data: PlaceSuggestion[] }>("/places/autocomplete", { q })
        .then((res) => setSuggestions(asArray(res)))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected]);

  const pickupEnabled = options?.pickup.enabled ?? false;

  async function submit(addressId?: string) {
    if (!orderId) {
      toast("Missing order.");
      return;
    }
    if (needsPhone && !phoneOk) {
      toast("Add your WhatsApp number so we can send you updates.");
      return;
    }
    if (mode === "delivery" && !agreeFee) {
      toast("Please tick the box to agree to pay the delivery fee on arrival.");
      return;
    }
    const phone = needsPhone ? { contactPhone: contactPhone.trim() } : {};
    const body =
      mode === "pickup"
        ? { fulfillment: "pickup", ...phone }
        : addressId
          ? { fulfillment: "delivery", agreeDeliveryFee: true, addressId, ...phone }
          : selected
            ? { fulfillment: "delivery", agreeDeliveryFee: true, formattedAddress: selected, lat: 0, lng: 0, ...phone }
            : null;
    if (!body) {
      toast("Enter your delivery address.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post(`/orders/${orderId}/address`, body);
      if (needsPhone) void useAuthStore.getState().refreshMe();
      router.push(`/checkout/review?orderId=${orderId}`);
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : "Could not save. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canContinue = (!needsPhone || phoneOk) && (mode === "pickup" ? pickupEnabled : agreeFee && !!selected);

  const choices = [
    { id: "delivery" as const, label: "Delivery", hint: "Pay rider on arrival", icon: Bike },
    ...(pickupEnabled ? [{ id: "pickup" as const, label: "Pickup", hint: "Collect from us", icon: Store }] : []),
  ];

  return (
    <div className="page-pad-no-tab min-h-dvh pb-32">
      <PageHeader title="Pickup or delivery?" backHref={orderId ? `/orders/${orderId}` : "/orders"} />
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
                setSelected(null);
              }}
              placeholder="House number, street, area, Lagos"
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
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-deep transition active:bg-off-white"
                        onClick={() => {
                          setSelected(s.description);
                          setQuery(s.description);
                          setSuggestions([]);
                        }}
                      >
                        <MapPin size={16} className="shrink-0 text-tea" />
                        Use “{s.description}”
                      </button>
                    </li>
                  ))}
                </motion.ul>
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
    </div>
  );
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
