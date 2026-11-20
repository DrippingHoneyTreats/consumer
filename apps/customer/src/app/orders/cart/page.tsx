"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Bike, CreditCard, Lock, Plus, ShoppingBag } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatNgn } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { InnerPage, PageSection } from "@/components/layout/InnerPage";
import { StickyActions } from "@/components/layout/StickyActions";
import { AuthGateSheet } from "@/components/auth/AuthGateSheet";
import { CartLineRow } from "@/components/orders/CartLineRow";
import { useLineEditor } from "@/components/orders/LineEditor";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { textareaClass } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

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
  const editor = useLineEditor();
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
    } else toast.error("We couldn't save your order. Check your connection and try again.");
  }

  const payButton = (
    <Button fullWidth variant="dark" loading={syncing} leftIcon={<Lock size={16} />} onClick={() => void proceed()}>
      {syncing ? "Saving your order…" : `Proceed to pay · ${formatNgn(subtotal)}`}
    </Button>
  );

  return (
    <InnerPage
      tabbed
      className="pb-[calc(var(--tab-h)+var(--safe-bottom)+160px)] md:pb-[calc(var(--tab-h)+var(--safe-bottom)+32px)]"
      eyebrow="Not paid yet"
      title="Current order"
      subtitle="Adjust quantities, add a note, then pay."
      backHref="/orders"
      hero={
        guestItems.length ? (
          <div>
            <p className="text-xs text-white/70">Order total</p>
            <AnimatedNumber value={subtotal} className="block font-display text-3xl" />
          </div>
        ) : null
      }
      facts={[
        { icon: ShoppingBag, value: `${count} item${count === 1 ? "" : "s"}`, label: "In your order" },
        { icon: Bike, value: "Pickup or delivery", label: "Choose at checkout" },
        { icon: CreditCard, value: "Card, transfer, USSD", label: "Secure payment" },
      ]}
      actions={
        guestItems.length ? (
          <>
            {payButton}
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-deep/55">
              <Lock size={11} /> You&apos;ll sign in before paying
            </p>
          </>
        ) : null
      }
    >
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
          <PageSection
            title={`Items (${count})`}
            action={
              <Link href="/pastries" className="flex items-center gap-1 text-xs font-bold text-tea">
                <Plus size={13} /> Add more
              </Link>
            }
          >
            <ul className="-mx-4 sm:-mx-5 md:-mx-6">
              <AnimatePresence initial={false}>
                {guestItems.map((line) => (
                  <CartLineRow
                    key={`${line.itemId}-${line.variantId ?? ""}`}
                    image={line.image}
                    name={line.name}
                    unitPrice={line.unitPrice}
                    qty={line.qty}
                    note={line.note}
                    onRemove={() => updateGuestQty(line.itemId, line.variantId, 0)}
                    onEdit={() => void editor.edit({ itemId: line.itemId, variantId: line.variantId, qty: line.qty, image: line.image })}
                    editLabel={line.variantId ? "Change size" : "Edit"}
                  >
                    <QtyStepper
                      size="sm"
                      value={line.qty}
                      min={0}
                      max={99}
                      onChange={(q) => updateGuestQty(line.itemId, line.variantId, q)}
                    />
                  </CartLineRow>
                ))}
              </AnimatePresence>
            </ul>
          </PageSection>

          <PageSection title="Note for rider or baker">
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              rows={2}
              aria-label="Note for rider or baker"
              placeholder="e.g. Write Happy Birthday · call on arrival"
              className={textareaClass}
            />
          </PageSection>

          <PageSection title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between text-deep/70">
                <dt>Subtotal</dt>
                <dd>{formatNgn(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-deep/70">
                <dt>Delivery</dt>
                <dd className="text-right">Pickup, or pay rider on arrival</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-dashed border-deep/10 pt-3 font-semibold text-deep">
                <dt>Total</dt>
                <dd>
                  <AnimatedNumber value={subtotal} className="font-display text-2xl" />
                </dd>
              </div>
            </dl>
          </PageSection>

          <StickyActions aboveTabs mobileOnly>
            <div className="glass rounded-[26px] border border-white/80 p-3 shadow-[var(--shadow-float)]">
              {payButton}
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-deep/55">
                <CreditCard size={12} /> Secure payment methods · Card, transfer, USSD
              </p>
            </div>
          </StickyActions>
        </>
      )}

      {editor.sheet}

      <AuthGateSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        returnTo="/orders/cart?checkout=1"
        title="Almost there"
        message="Add your name and number so we can deliver and keep you posted. Your cart stays just as it is."
      />
    </InnerPage>
  );
}
