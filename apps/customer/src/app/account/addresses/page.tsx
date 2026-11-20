"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Home, Inbox, MapPin, Plus, Trash2, Truck } from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { Address } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/layout/PageHeader";
import { InnerPage, PageSection } from "@/components/layout/InnerPage";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { usePending, spinnerClass } from "@/hooks/usePending";

export default function AddressesPage() {
  const user = useAuthStore((s) => s.user);
  const [addresses, setAddresses] = useState<Address[]>([]);

  useEffect(() => {
    if (!user) return;
    void apiClient
      .get<Address[] | { data: Address[] }>("/me/addresses")
      .then((res) => setAddresses(asArray(res)))
      .catch(() => setAddresses([]));
  }, [user]);

  if (!user) {
    return (
      <div className="page-pad">
        <PageHeader title="Addresses" subtitle="Save spots for faster checkout." backHref="/account" />
        <EmptyState
          title="Uh-oh! 👀"
          message="Looks like there's nothing here yet."
          actionHref="/verify?returnTo=/"
          actionLabel="Sign in"
          icon={<Inbox size={56} strokeWidth={1.4} />}
        />
      </div>
    );
  }

  return (
    <InnerPage
      tabbed
      title="Addresses"
      subtitle="Where we drop your treats."
      backHref="/account"
      facts={[
        { icon: MapPin, value: `${addresses.length} saved`, label: "Addresses" },
        { icon: Truck, value: "Lagos only", label: "Where we deliver" },
        { icon: Plus, value: "At checkout", label: "New addresses are added" },
      ]}
      actions={
        <Link href="/pastries" className="block">
          <Button fullWidth variant="dark" leftIcon={<Plus size={16} />}>
            Start an order
          </Button>
        </Link>
      }
    >
      <PageSection title="Saved addresses">

      {addresses.length === 0 ? (
        <EmptyState
          title="Uh-oh! 👀"
          message="Looks like there's nothing here yet."
          actionHref="/pastries"
          actionLabel="Order pastries"
          icon={<Inbox size={56} strokeWidth={1.4} />}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a, i) => {
            const Icon = a.label.toLowerCase() === "work" ? Briefcase : a.label.toLowerCase() === "home" ? Home : MapPin;
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-[22px] bg-[#f7f4ef] p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-tea shadow-sm">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-deep">
                    {a.label}
                    {a.isDefault ? (
                      <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[10px] font-semibold text-tea">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-deep/60">{a.formattedAddress}</p>
                  {a.landmark ? <p className="mt-1 text-xs text-deep/45">Landmark: {a.landmark}</p> : null}
                </div>
                <RemoveAddress
                  label={a.label}
                  onRemove={async () => {
                    try {
                      await apiClient.delete(`/me/addresses/${a.id}`);
                      setAddresses((list) => list.filter((x) => x.id !== a.id));
                      toast.success("Address removed.");
                    } catch {
                      toast.error("Couldn't remove that address. Please try again.");
                    }
                  }}
                />
              </motion.li>
            );
          })}
        </ul>
      )}

      </PageSection>

      <PageSection>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-deep/55">
          <span>New addresses are saved automatically when you check out.</span>
          <Link href="/pastries" className="inline-flex items-center gap-1 font-semibold text-tea md:hidden">
            <Plus size={14} /> Start an order
          </Link>
        </div>
      </PageSection>
    </InnerPage>
  );
}

function RemoveAddress({ label, onRemove }: { label: string; onRemove: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, track] = usePending();
  if (pending) {
    return <span className={`${spinnerClass} mt-1 shrink-0 text-danger`} aria-label="Removing" />;
  }
  if (confirming) {
    return (
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => track(onRemove())}
          className="rounded-full bg-danger px-3 py-1.5 text-xs font-semibold text-white"
        >
          Remove
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-xs font-semibold text-deep/55">
          Keep
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={`Remove ${label} address`}
      onClick={() => setConfirming(true)}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/8 text-danger ring-1 ring-danger/20 transition hover:bg-danger/15"
    >
      <Trash2 size={15} />
    </button>
  );
}
