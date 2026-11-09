"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Lock, Plus, ShoppingBag } from "lucide-react";
import { formatNgn } from "@/lib/format";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { PageHeader } from "@/components/layout/PageHeader";
import { StickyActions } from "@/components/layout/StickyActions";
import { AuthGateSheet } from "@/components/auth/AuthGateSheet";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";

/** Local cart for visitors who haven't signed in. Sign-in is only asked for at payment. */
export default function GuestCartPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const guestItems = useCartStore((s) => s.guestItems);
  const updateGuestQty = useCartStore((s) => s.updateGuestQty);
  const draft = useCartStore((s) => s.draft);
  const mergeGuest = useCartStore((s) => s.mergeGuest);
  const [authOpen, setAuthOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user || guestItems.length || !draft?.id) return;
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    router.replace(checkout ? `/checkout/address?orderId=${draft.id}` : `/orders/${draft.id}`);
  }, [user, guestItems.length, draft?.id, router]);

  const subtotal = guestItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const count = guestItems.reduce((sum, i) => sum + i.qty, 0);

  async function proceed() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setSyncing(true);
    const ok = await mergeGuest();
    setSyncing(false);
    const id = useCartStore.getState().draft?.id;
    if (ok && id) router.push(`/checkout/address?orderId=${id}`);
    else toast("We couldn't save your order. Check your connection and try again.");
  }

  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+150px)]">
      <PageHeader eyebrow="Not paid yet" title="Your order" backHref="/orders" />

      {guestItems.length === 0 ? (
        <EmptyState
          title="No item in this order"
          description="Add something sweet to get started."
          actionHref="/pastries"
          actionLabel="Add an order"
          icon={<ShoppingBag size={28} />}
        />
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between rounded-[24px] bg-hero p-4 shadow-[var(--shadow-card)]"
          >
            <div>
              <p className="text-xs text-deep/60">
                {count} item{count === 1 ? "" : "s"}
              </p>
              <p className="mt-1 font-display text-2xl text-deep">{formatNgn(subtotal)}</p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-deep">Draft</span>
          </motion.section>

          <ul className="mb-4 space-y-2.5">
            <AnimatePresence initial={false}>
              {guestItems.map((line, i) => (
                <motion.li
                  key={`${line.itemId}-${line.variantId ?? ""}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                  exit={{ opacity: 0, x: -40 }}
                  className="flex items-center gap-3 rounded-[22px] border border-deep/5 bg-white p-2.5 shadow-[var(--shadow-card)]"
                >
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px] bg-blush-soft">
                    <Image src={line.image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="64px" unoptimized />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-deep">{line.name}</p>
                    <p className="text-xs text-deep/50">{formatNgn(line.unitPrice)} each</p>
                    {line.note ? <p className="mt-0.5 truncate text-[11px] italic text-tea">“{line.note}”</p> : null}
                    <p className="mt-1 text-sm font-semibold text-deep">{formatNgn(line.unitPrice * line.qty)}</p>
                  </div>
                  <QtyStepper
                    size="sm"
                    value={line.qty}
                    min={0}
                    max={99}
                    onChange={(q) => updateGuestQty(line.itemId, line.variantId, q)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
            <li>
              <Link
                href="/pastries"
                className="pressable flex items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-deep/15 py-3.5 text-sm font-semibold text-tea"
              >
                <Plus size={16} /> Add more pastries
              </Link>
            </li>
          </ul>

          <section className="space-y-2 rounded-[24px] border border-deep/5 bg-white p-4 text-sm shadow-[var(--shadow-card)]">
            <div className="flex justify-between text-deep/70">
              <span>Subtotal</span>
              <span>{formatNgn(subtotal)}</span>
            </div>
            <div className="flex justify-between text-deep/70">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-dashed border-deep/10 pt-2 font-semibold text-deep">
              <span>Total</span>
              <span className="font-display text-lg">{formatNgn(subtotal)}</span>
            </div>
          </section>

          <StickyActions aboveTabs>
            <div className="glass rounded-[26px] border border-white/80 p-3 shadow-[var(--shadow-float)]">
              <Button
                fullWidth
                variant="dark"
                loading={syncing}
                leftIcon={<Lock size={16} />}
                onClick={() => void proceed()}
              >
                {syncing ? "Saving your order…" : `Proceed to pay · ${formatNgn(subtotal)}`}
              </Button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-deep/55">
                <CreditCard size={12} /> Secure payment methods · Card, transfer, USSD
              </p>
            </div>
          </StickyActions>
        </>
      )}

      <AuthGateSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        returnTo="/orders/cart?checkout=1"
        title="Almost there"
        message="Add your name and number so we can deliver and keep you posted. Your cart stays just as it is."
      />
    </div>
  );
}
