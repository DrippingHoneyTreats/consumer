"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Home, Inbox, MapPin, Plus } from "lucide-react";
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
        <PageHeader title="Addresses" subtitle="Save spots for faster checkout." backHref="/account" />
        <EmptyState
          title="Uh-oh! 👀"
          message="Looks like there's nothing here yet."
          actionHref="/verify?returnTo=/account/addresses"
          actionLabel="Sign in"
          icon={<Inbox size={56} strokeWidth={1.4} />}
        />
      </div>
    );
  }

  return (
    <div className="page-pad space-y-5">
      <PageHeader title="Addresses" subtitle="Where we drop your treats." backHref="/account" />

      {addresses.length === 0 ? (
        <EmptyState
          title="Uh-oh! 👀"
          message="Looks like there's nothing here yet."
          actionHref="/pastries"
          actionLabel="Order pastries"
          icon={<Inbox size={56} strokeWidth={1.4} />}
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
                className="flex items-start gap-3 rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-deep/5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center text-tea">
                  <Icon size={22} strokeWidth={1.7} />
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
              </motion.li>
            );
          })}
        </ul>
      )}

      <p className="rounded-[22px] bg-off-white px-4 py-3 text-center text-xs text-deep/55">
        New addresses are saved automatically when you check out.
      </p>

      <Link
        href="/pastries"
        className="pressable flex items-center justify-center gap-2 rounded-full bg-deep py-3.5 text-sm font-semibold text-white"
      >
        <Plus size={16} /> Order & add address at checkout
      </Link>
    </div>
  );
}
