"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { formatNgn } from "@/lib/format";
import type { Address } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { asArray } from "@/lib/data";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { CheckoutSteps } from "@/components/layout/CheckoutSteps";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { StickyActions } from "@/components/layout/StickyActions";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { AnimatePresence, motion } from "framer-motion";
import { Bike, Briefcase, ChevronRight, Home, MapPin, Search } from "lucide-react";

type PlaceSuggestion = { placeId: string; description: string };

function AddressForm() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const router = useRouter();
  useRequireAuth();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selected, setSelected] = useState<{ formatted: string; lat: number; lng: number } | null>(
    null,
  );
  const [saved, setSaved] = useState<Address[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void apiClient
      .get<Address[] | { data: Address[] }>("/me/addresses")
      .then((res) => setSaved(asArray(res)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
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
  }, [query]);

  async function quote(lat: number, lng: number) {
    try {
      const res = await apiClient.post<{ fee: number } | { data: { fee: number } }>(
        "/delivery/quote",
        { lat, lng, orderId },
      );
      const data = unwrapData(res) ?? (res as { fee: number });
      setDeliveryFee(data.fee ?? (data as { deliveryFee?: number }).deliveryFee ?? null);
    } catch {
      setDeliveryFee(null);
    }
  }

  async function saveAndContinue(addressId?: string) {
    if (!orderId) {
      toast("Missing order.");
      return;
    }
    setLoading(true);
    try {
      const body = addressId
        ? { addressId }
        : selected
          ? {
              formattedAddress: selected.formatted,
              lat: selected.lat,
              lng: selected.lng,
            }
          : null;
      if (!body) {
        toast("Pick a delivery address.");
        return;
      }
      await apiClient.post(`/orders/${orderId}/address`, body);
      router.push(`/checkout/review?orderId=${orderId}`);
    } catch {
      toast("Could not save address.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-pad-no-tab min-h-dvh pb-32">
      <PageHeader title="Where should we deliver?" backHref={orderId ? `/orders/${orderId}` : "/orders"} />
      <CheckoutSteps current={0} />

      <Input
        label="Search address"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Street, area, Lagos…"
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
                    setSelected({ formatted: s.description, lat: 0, lng: 0 });
                    setQuery(s.description);
                    setSuggestions([]);
                    void quote(0, 0);
                  }}
                >
                  <MapPin size={16} className="shrink-0 text-tea" />
                  {s.description}
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deliveryFee != null ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-3 rounded-[20px] bg-sage-soft p-3.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-tea">
              <Bike size={18} />
            </span>
            <p className={cn("text-sm text-deep")}>
              Delivery fee: <strong>{formatNgn(deliveryFee)}</strong>
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {saved.length > 0 ? (
        <div className="mt-6 space-y-2">
          <p className="pl-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-deep/45">Saved addresses</p>
          {saved.map((a, i) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                void quote(a.lat, a.lng);
                void saveAndContinue(a.id);
              }}
              className="flex w-full items-center gap-3 rounded-[22px] border border-deep/5 bg-white p-3 text-left text-sm shadow-[var(--shadow-card)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush-soft text-deep">
                {a.label.toLowerCase() === "work" ? <Briefcase size={18} /> : <Home size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-deep">{a.label}</span>
                <span className="block truncate text-deep/55">{a.formattedAddress}</span>
              </span>
              <ChevronRight size={18} className="text-deep/25" />
            </motion.button>
          ))}
        </div>
      ) : null}

      <StickyActions>
        <Button fullWidth variant="dark" loading={loading} disabled={!selected} onClick={() => void saveAndContinue()}>
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
      <AddressForm />
    </Suspense>
  );
}
