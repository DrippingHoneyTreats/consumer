"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Lock, Plus, ShoppingBag } from "lucide-react";
import { apiClient } from "@/lib/api";
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
import { textareaClass } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

/** Local cart for visitors who haven't signed in. Sign-in is only asked for at payment. */
export default function GuestCartPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const guestItems = useCartStore((s) => s.guestItems);
  const updateGuestQty = useCartStore((s) => s.updateGuestQty);
  const orderNote = useCartStore((s) => s.orderNote);
  const setOrderNote = useCartStore((s) => s.setOrderNote);
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
    if (ok && id) {
      if (orderNote.trim()) {
        try {
          await apiClient.patch(`/orders/${id}`, { notes: orderNote.trim() });
        } catch {
          /* note saved locally; checkout can still proceed */
        }
      }
      router.push(`/checkout/address?orderId=${id}`);
    } else toast("We couldn't save your order. Check your connection and try again.");
  }

  return (
    <div className="page-pad pb-[calc(var(--tab-h)+var(--safe-bottom)+160px)]">
      <PageHeader
        eyebrow="Not paid yet"
        title="Current order"
        subtitle="One order card — adjust qty, add a note, then pay."
        backHref="/orders"
      />

      {guestItems.length === 0 ? (
        <EmptyState
          title="No item in this order"
          description="Add something sweet to get started."
          actionHref="/pastries"
          actionLabel="Add an order"
          icon={<ShoppingBag size={28} />}
        />
      ) : (
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          {/* Single order card — products are rows inside, not separate cards */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-card)] ring-1 ring-deep/5"
          >
            <header className="flex items-start justify-between gap-3 border-b border-deep/5 bg-gradient-to-br from-blush-soft/80 via-white to-cream px-4 py-4 md:px-6 md:py-5">
              <div>
                <p className="font-display text-xl text-deep md:text-2xl">Current order</p>
                <p className="mt-0.5 text-xs text-deep/50">
                  {count} item{count === 1 ? "" : "s"} · draft
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-deep ring-1 ring-deep/5">
                  Draft
                </span>
                <p className="mt-2 font-display text-2xl font-semibold text-deep">{formatNgn(subtotal)}</p>
              </div>
            </header>

            <ul>
              <AnimatePresence initial={false}>
                {guestItems.map((line, i) => (
                  <motion.li
                    key={`${line.itemId}-${line.variantId ?? ""}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 md:px-6",
                      i > 0 && "border-t border-deep/5",
                    )}
                  >
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] bg-cream">
                      <Image src={line.image || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="56px" unoptimized />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-deep">{line.name}</p>
                      <p className="text-xs text-deep/50">
                        {formatNgn(line.unitPrice)} each ·{" "}
                        <span className="font-semibold text-deep">{formatNgn(line.unitPrice * line.qty)}</span>
                      </p>
                      {line.note ? <p className="mt-0.5 truncate text-[11px] italic text-tea">“{line.note}”</p> : null}
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
            </ul>

            <div className="border-t border-dashed border-deep/10 px-4 py-4 md:px-6">
              <Link
                href="/pastries"
                className="pressable mb-4 flex items-center justify-center gap-2 rounded-full border border-dashed border-deep/15 py-3 text-sm font-semibold text-tea"
              >
                <Plus size={16} /> Add more pastries
              </Link>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-deep">Note for rider or baker</span>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Write Happy Birthday · call on arrival"
                  className={textareaClass}
                />
              </label>
            </div>

            <footer className="space-y-2 border-t border-deep/5 bg-off-white/60 px-4 py-4 text-sm md:px-6">
              <div className="flex justify-between text-deep/70">
                <span>Subtotal</span>
                <span>{formatNgn(subtotal)}</span>
              </div>
              <div className="flex justify-between text-deep/70">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-dashed border-deep/10 pt-2 font-semibold text-deep">
                <span>Total amount</span>
                <span className="font-display text-xl">{formatNgn(subtotal)}</span>
              </div>
            </footer>
          </motion.article>

          <aside className="hidden space-y-3 lg:sticky lg:top-24 lg:block">
            <div className="rounded-[28px] bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-deep/5">
              <p className="text-xs text-deep/50">Ready when you are</p>
              <p className="mt-1 font-display text-3xl text-deep">{formatNgn(subtotal)}</p>
              <Button
                fullWidth
                variant="dark"
                className="mt-4"
                loading={syncing}
                leftIcon={<Lock size={16} />}
                onClick={() => void proceed()}
              >
                {syncing ? "Saving your order…" : `Proceed to pay · ${formatNgn(subtotal)}`}
              </Button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-deep/55">
                <CreditCard size={12} /> Secure payment · Card, transfer, USSD
              </p>
            </div>
          </aside>

          <StickyActions aboveTabs className="lg:hidden">
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
        </div>
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
