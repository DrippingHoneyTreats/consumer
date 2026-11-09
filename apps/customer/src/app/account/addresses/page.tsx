"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Home, MapPin } from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import type { Address } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

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
        <PageHeader title="Addresses" backHref="/account" />
        <EmptyState
          title="Save delivery addresses"
          description="Sign in to check out faster next time."
          actionHref="/verify?returnTo=/account/addresses"
          actionLabel="Sign in"
          icon={<MapPin size={28} />}
        />
      </div>
    );
  }

  return (
    <div className="page-pad">
      <PageHeader title="Addresses" subtitle="Where we drop your treats." backHref="/account" />
      {addresses.length === 0 ? (
        <EmptyState
          title="No addresses yet"
          description="Add one at checkout when you place your next order."
          actionHref="/pastries"
          actionLabel="Order pastries"
          icon={<MapPin size={28} />}
        />
      ) : (
        <ul className="space-y-3">
          {addresses.map((a, i) => {
            const Icon = a.label.toLowerCase() === "work" ? Briefcase : a.label.toLowerCase() === "home" ? Home : MapPin;
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-[24px] border border-deep/5 bg-white p-3.5 shadow-[var(--shadow-card)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush-soft text-deep">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-deep">
                    {a.label}
                    {a.isDefault ? (
                      <span className="rounded-full bg-sage-soft px-2 py-0.5 text-[10px] font-semibold text-tea">Default</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-sm text-deep/60">{a.formattedAddress}</p>
                  {a.landmark ? <p className="mt-1 text-xs text-deep/45">Landmark: {a.landmark}</p> : null}
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
