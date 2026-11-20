"use client";

import { Suspense, useEffect, useState } from "react";
import { loadFlutterwave, payWithFlutterwave, type InlineCheckout, type InlineOutcome } from "@/lib/flutterwave";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiRequestError, apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { formatNgn } from "@/lib/format";
import type { Order } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { deliveryLineLabel } from "@/lib/order-status";
import { Input, textareaClass } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { CheckoutSteps } from "@/components/layout/CheckoutSteps";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { OfflineState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { StickyActions } from "@/components/layout/StickyActions";
import { InnerPage, PageSection } from "@/components/layout/InnerPage";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import { useCartStore } from "@/store/cart-store";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Bike, Lock, MapPin, ShieldCheck, ShoppingBag, Store, Tag } from "lucide-react";

const PAY_FALLBACK = "Cannot proceed with payment, try again.";

function ReviewForm() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const router = useRouter();
  useRequireAuth();
  const orderNote = useCartStore((s) => s.orderNote);
  const setOrderNote = useCartStore((s) => s.setOrderNote);
  const [order, setOrder] = useState<Order | null>(null);
  const [promo, setPromo] = useState("");
  const [loading, setLoading] = useState(false);

  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Warm up Flutterwave's script so the popup opens instantly when they tap Pay.
  useEffect(() => {
    void loadFlutterwave().catch(() => {});
  }, []);

  useEffect(() => {
    if (!orderId) return;
    setFailed(false);
    void apiClient
      .get<Order | { data: Order }>(`/orders/${orderId}`)
      .then((res) => {
        const o = unwrapData(res) ?? (res as Order);
        setOrder(o);
        if (o.notes && !orderNote) setOrderNote(o.notes);
      })
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, nonce]);

  const [promoError, setPromoError] = useState<string | null>(null);

  async function applyPromo() {
    if (!orderId) return;
    if (!promo.trim()) {
      setPromoError("Enter a promo code first.");
      return;
    }
    try {
      const res = await apiClient.post<Order | { data: Order }>(`/orders/${orderId}/promo`, {
        code: promo.trim(),
      });
      setOrder(unwrapData(res) ?? (res as Order));
      setPromoError(null);
      toast.success("Promo applied.");
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "That promo code didn't work.";
      setPromoError(msg);
      toast.error(msg);
    }
  }

  async function payNow() {
    if (!orderId) return;
    setLoading(true);
    try {
      if (orderNote.trim()) {
        try {
          await apiClient.patch(`/orders/${orderId}`, { notes: orderNote.trim() });
        } catch {
          /* continue to payment */
        }
      }
      const res = await apiClient.post<{
        authorizationUrl?: string;
        url?: string;
        reference?: string;
        inline?: InlineCheckout | null;
      }>("/payments/initiate", { orderId });
      const url = res.authorizationUrl ?? res.url;
      const ref = res.reference;

      // Preferred: Flutterwave's popup right here on the page.
      if (res.inline?.provider === "flutterwave" && ref) {
        let outcome: InlineOutcome | null = null;
        try {
          setLoading(false);
          outcome = await payWithFlutterwave(res.inline);
        } catch (e) {
          // Popup couldn't load (ad blocker, slow network): use Flutterwave's own page instead.
          console.warn("[pay] inline unavailable, redirecting", e);
          if (url) {
            window.location.href = url;
            return;
          }
          throw e;
        }
        if (outcome.kind === "finished") {
          const q = new URLSearchParams({ reference: ref, status: outcome.status });
          if (outcome.transactionId) q.set("transaction_id", outcome.transactionId);
          router.push(`/payment/callback?${q.toString()}`);
          return;
        }
        // Closed without finishing. Ask the server (a bank transfer may still have gone through),
        // which also unlocks the order so they can try again.
        const check = await apiClient
          .post<{ status: string }>("/payments/verify", { reference: ref, gatewayStatus: "cancelled" })
          .catch(() => null);
        if (check?.status === "success") {
          router.push(`/payment/callback?reference=${encodeURIComponent(ref)}`);
          return;
        }
        toast.info("Payment cancelled. Your order is saved. Tap Pay now when you're ready.");
        return;
      }

      if (url) {
        window.location.href = url;
      } else if (ref) {
        router.push(`/payment/callback?reference=${encodeURIComponent(ref)}`);
      } else {
        toast.error(PAY_FALLBACK);
      }
    } catch (err) {
      // Show the exact reason; only fall back when there isn't one.
      const reason = err instanceof Error ? err.message.trim() : "";
      toast.error(reason && reason !== "Request failed" ? reason : PAY_FALLBACK);
    } finally {
      setLoading(false);
    }
  }

  if (!order && failed) {
    return (
      <div className="page-pad-no-tab">
        <PageHeader title="Review & pay" backHref={orderId ? `/orders/${orderId}` : "/orders"} />
        <OfflineState onRetry={() => setNonce((n) => n + 1)} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-pad-no-tab">
        <PageSkeleton variant="detail" />
      </div>
    );
  }

  const snap = order.addressSnapshot as { formattedAddress?: string; landmark?: string | null } | null;
  const address = snap?.formattedAddress;
  const pickup = order.fulfillment === "pickup";

  const itemCount = order.items.reduce((n, l) => n + l.qty, 0);
  const payButton = (
    <Button fullWidth variant="dark" loading={loading} leftIcon={<Lock size={16} />} onClick={() => payNow()}>
      Pay now · {formatNgn(order.total)}
    </Button>
  );
  const payNote = (
    <p className="flex items-center justify-center gap-1.5 text-[11px] text-deep/50">
      <ShieldCheck size={12} /> Secure payment · Tap once, don&apos;t pay twice
    </p>
  );

  return (
    <InnerPage
      title="Review & pay"
      subtitle="Check your order, then pay securely."
      backHref={`/checkout/address?orderId=${orderId}`}
      className="min-h-dvh pb-[calc(170px+var(--safe-bottom))] md:pb-12"
      hero={
        <div>
          <p className="text-xs text-white/70">Total to pay now</p>
          <p className="font-display text-3xl">{formatNgn(order.total)}</p>
        </div>
      }
      facts={[
        {
          icon: pickup ? Store : MapPin,
          value: address || (pickup ? "Pickup" : "No address yet"),
          label: pickup ? "Pickup from" : "Delivering to",
        },
        { icon: ShoppingBag, value: `${itemCount} item${itemCount === 1 ? "" : "s"}`, label: "In this order" },
        ...(!pickup ? [{ icon: Bike, value: "Paid to rider", label: "Delivery fee, on arrival" }] : []),
      ]}
      actions={
        <>
          {payButton}
          {payNote}
        </>
      }
    >
      <CheckoutSteps current={1} />

      {address ? (
        <PageSection
          title={pickup ? "Pickup" : "Delivering to"}
          action={
            <Link href={`/checkout/address?orderId=${orderId}`} className="text-xs font-bold text-tea">
              Change
            </Link>
          }
        >
          <p className="flex items-start gap-3 text-sm text-deep">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-tea">
              <MapPin size={18} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">{address}</span>
              {!pickup && snap?.landmark ? <span className="mt-0.5 block text-xs text-deep/55">Landmark: {snap.landmark}</span> : null}
            </span>
          </p>
        </PageSection>
      ) : null}

      <PageSection title={`Items (${itemCount})`}>
        <ul className="space-y-3">
          {order.items.map((line, i) => (
            <motion.li
              key={line.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 text-sm"
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-blush-soft">
                <Image src={line.item?.images?.[0] || ITEM_PLACEHOLDER} alt="" fill className="object-cover" sizes="44px" unoptimized />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-deep">
                {line.nameSnapshot} <span className="text-deep/45">× {line.qty}</span>
              </span>
              <span className="font-semibold text-deep">{formatNgn(line.unitPrice * line.qty)}</span>
            </motion.li>
          ))}
        </ul>
      </PageSection>

      <PageSection title={pickup ? "Note for the baker" : "Note for rider or baker"}>
        <textarea
          value={orderNote}
          onChange={(e) => setOrderNote(e.target.value)}
          rows={2}
          aria-label="Order note"
          placeholder="e.g. Write Happy Birthday · call on arrival"
          className={textareaClass}
        />
      </PageSection>

      <PageSection title="Promo code">
        <div className="flex items-start gap-2 sm:max-w-md">
          <Input
            placeholder="Enter code"
            aria-label="Promo code"
            value={promo}
            onChange={(e) => {
              setPromo(e.target.value);
              setPromoError(null);
            }}
            error={promoError ?? undefined}
            leftAddon={<Tag size={16} className="text-tea" />}
            className="uppercase"
          />
          <Button variant="secondary" className="min-h-13 shrink-0" onClick={() => applyPromo()}>
            Apply
          </Button>
        </div>
      </PageSection>

      <PageSection title="Summary">
        <dl className="space-y-2 text-sm text-deep/70">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatNgn(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Delivery</dt>
            <dd className="text-right">{deliveryLineLabel(order)}</dd>
          </div>
          {order.discount > 0 ? (
            <div className="flex justify-between text-tea">
              <dt>Discount</dt>
              <dd>-{formatNgn(order.discount)}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between border-t border-dashed border-deep/10 pt-3 font-semibold text-deep">
            <dt>Total to pay now</dt>
            <dd className="font-display text-2xl">{formatNgn(order.total)}</dd>
          </div>
        </dl>
        {!pickup ? <p className="mt-2 text-xs text-deep/50">+ delivery fee, paid to the rider when your order arrives.</p> : null}
      </PageSection>

      <StickyActions mobileOnly>
        {payButton}
        <div className="mt-2">{payNote}</div>
      </StickyActions>
    </InnerPage>
  );
}

export default function CheckoutReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="page-pad-no-tab">
          <PageSkeleton variant="detail" />
        </div>
      }
    >
      <ReviewForm />
    </Suspense>
  );
}
