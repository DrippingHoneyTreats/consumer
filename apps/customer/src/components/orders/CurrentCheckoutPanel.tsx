"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CreditCard, Lock, MapPin, ShieldCheck, Trash2, Truck } from "lucide-react";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Button } from "@/components/ui/Button";

export type CurrentOrderLine = {
  key: string;
  name: string;
  qty: number;
  unitPrice: number;
  image?: string;
};

type Props = {
  title?: string;
  lines: CurrentOrderLine[];
  total: number;
  onQtyChange: (key: string, qty: number) => void;
  onPayNow: () => void;
  paying?: boolean;
  userHint?: string | null;
};

const headsUp = [
  {
    icon: CreditCard,
    title: "Pay your way",
    body: "Card, bank transfer, or USSD — you’ll pick this on the secure payment page.",
  },
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    body: "Payments are protected. We never store your full card details.",
  },
  {
    icon: Truck,
    title: "Doorstep delivery",
    body: "Fresh treats delivered within Lagos — address comes next.",
  },
  {
    icon: MapPin,
    title: "Lagos coverage",
    body: "We deliver across Lagos. Fee is calculated once you set your address.",
  },
];

export function CurrentCheckoutPanel({
  title = "Checkout",
  lines,
  total,
  onQtyChange,
  onPayNow,
  paying,
  userHint,
}: Props) {
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-start lg:gap-10">
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl text-deep md:text-3xl">{title}</h2>
            <p className="mt-1 text-sm text-deep/50">
              {count} item{count === 1 ? "" : "s"} · not paid yet
            </p>
          </div>
          <span className="rounded-full bg-honey-soft px-2.5 py-1 text-[11px] font-bold text-deep">Draft</span>
        </div>

        <div className="mb-2 hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-deep/10 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-deep/35 md:grid">
          <span>Product</span>
          <span className="w-28 text-center">Quantity</span>
          <span className="w-24 text-right">Total</span>
        </div>

        <ul className="divide-y divide-deep/10">
          {lines.map((line) => (
            <li key={line.key} className="flex flex-wrap items-center gap-3 py-4 md:grid md:grid-cols-[1fr_auto_auto] md:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-cream md:h-16 md:w-16">
                  <Image
                    src={line.image || ITEM_PLACEHOLDER}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-deep md:text-base">{line.name}</p>
                  <p className="text-xs text-deep/45">{formatNgn(line.unitPrice)} each</p>
                </div>
              </div>

              <div className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-center">
                <QtyStepper size="sm" value={line.qty} min={0} max={99} onChange={(q) => onQtyChange(line.key, q)} />
                <button
                  type="button"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => onQtyChange(line.key, 0)}
                  className="pressable flex h-9 w-9 items-center justify-center rounded-full text-deep/30 hover:bg-blush-soft hover:text-blush-deep md:ml-1"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <p className="ml-auto w-24 text-right text-sm font-semibold text-deep md:ml-0">
                {formatNgn(line.unitPrice * line.qty)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1.5 border-t border-deep/10 pt-4 text-sm md:ml-auto md:max-w-xs">
          <div className="flex justify-between text-deep/60">
            <span>Subtotal</span>
            <span>{formatNgn(total)}</span>
          </div>
          <div className="flex justify-between text-deep/60">
            <span>Delivery</span>
            <span>At checkout</span>
          </div>
          <div className="flex items-baseline justify-between pt-1 font-semibold text-deep">
            <span>Total</span>
            <span className="font-display text-2xl">{formatNgn(total)}</span>
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] bg-off-white p-5 md:p-6"
        >
          <h3 className="text-lg font-semibold text-deep">Before you checkout</h3>
          <p className="mt-1 text-xs text-deep/50">A quick heads-up</p>

          {userHint ? (
            <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs text-deep/65 ring-1 ring-deep/5">
              Ordering as <span className="font-semibold text-deep">{userHint}</span>
            </p>
          ) : (
            <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs text-deep/65 ring-1 ring-deep/5">
              *User is not logged in or not registered with the platform yet.
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {headsUp.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-tea">
                    <Icon size={18} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-deep">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-deep/55">{item.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <Button
            fullWidth
            variant="dark"
            className="mt-5"
            loading={paying}
            leftIcon={<Lock size={16} />}
            onClick={onPayNow}
          >
            {paying ? "Preparing…" : `Continue · ${formatNgn(total)}`}
          </Button>
          <p className="mt-2 text-center text-[11px] text-deep/45">
            Next: delivery address, then secure payment
          </p>
        </motion.div>
      </aside>
    </div>
  );
}
