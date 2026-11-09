"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { unwrapData } from "@/lib/data";
import { formatNgn } from "@/lib/format";
import type { Order } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { CheckoutSteps } from "@/components/layout/CheckoutSteps";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { OfflineState } from "@/components/ui/EmptyState";
import { StickyActions } from "@/components/layout/StickyActions";
import { ITEM_PLACEHOLDER } from "@/lib/placeholders";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Lock, MapPin, ShieldCheck, Tag } from "lucide-react";

function ReviewForm() {
  const params = useSearchParams();
  const orderId = params.get("orderId");
  const router = useRouter();
  useRequireAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [promo, setPromo] = useState("");
  const [loading, setLoading] = useState(false);

  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    setFailed(false);
    void apiClient
      .get<Order | { data: Order }>(`/orders/${orderId}`)
      .then((res) => setOrder(unwrapData(res) ?? (res as Order)))
      .catch(() => setFailed(true));
  }, [orderId, nonce]);

  async function applyPromo() {
    if (!orderId || !promo.trim()) return;
    try {
      const res = await apiClient.post<Order | { data: Order }>(`/orders/${orderId}/promo`, {
        code: promo.trim(),
      });
      setOrder(unwrapData(res) ?? (res as Order));
      toast("Promo applied.");
    } catch {
      toast("Promo code did not work.");
    }
  }

  async function payNow() {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await apiClient.post<{ authorizationUrl?: string; url?: string; reference?: string }>(
        "/payments/initiate",
        { orderId },
      );
      const url = res.authorizationUrl ?? res.url;
      const ref = res.reference;
      if (url) {
        window.location.href = url;
      } else if (ref) {
        router.push(`/payment/callback?reference=${encodeURIComponent(ref)}`);
      } else {
        toast("Payment could not start.");
      }
    } catch {
      toast("Payment could not start.");
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
      <div className="page-pad-no-tab space-y-3">
        <div className="skeleton h-10 w-2/3" />
        <div className="skeleton h-40 rounded-[24px]" />
        <div className="skeleton h-32 rounded-[24px]" />
      </div>
    );
  }

  const address = (order.addressSnapshot as { formattedAddress?: string } | null)?.formattedAddress;

  return (
    <div className="page-pad-no-tab min-h-dvh pb-40">
      <PageHeader title="Review & pay" backHref={`/checkout/address?orderId=${orderId}`} />
      <CheckoutSteps current={1} />

      {address ? (
        <Link
          href={`/checkout/address?orderId=${orderId}`}
          className="pressable mb-4 flex items-center gap-3 rounded-[22px] bg-sage-soft p-3.5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-tea">
            <MapPin size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-deep/55">Delivering to</span>
            <span className="block truncate text-sm font-semibold text-deep">{address}</span>
          </span>
          <span className="text-xs font-semibold text-tea">Change</span>
        </Link>
      ) : null}

      <ul className="mb-4 space-y-2 rounded-[24px] border border-deep/5 bg-white p-3 shadow-[var(--shadow-card)]">
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

      <div className="mb-4 flex items-end gap-2">
        <Input
          placeholder="Promo code"
          value={promo}
          onChange={(e) => setPromo(e.target.value)}
          leftAddon={<Tag size={16} className="text-tea" />}
          className="uppercase"
        />
        <Button variant="secondary" className="min-h-13 shrink-0" onClick={() => void applyPromo()}>
          Apply
        </Button>
      </div>

      <div className="space-y-2 rounded-[24px] border border-deep/5 bg-white p-4 text-sm text-deep/70 shadow-[var(--shadow-card)]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatNgn(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>{formatNgn(order.deliveryFee)}</span>
        </div>
        {order.discount > 0 ? (
          <div className="flex justify-between text-tea">
            <span>Discount</span>
            <span>-{formatNgn(order.discount)}</span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-dashed border-deep/10 pt-2 font-semibold text-deep">
          <span>Total</span>
          <span className="font-display text-xl">{formatNgn(order.total)}</span>
        </div>
      </div>

      <StickyActions>
        <Button fullWidth variant="dark" loading={loading} leftIcon={<Lock size={16} />} onClick={() => void payNow()}>
          Pay now · {formatNgn(order.total)}
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-deep/50">
          <ShieldCheck size={12} /> Secure payment · Tap once, don&apos;t pay twice
        </p>
      </StickyActions>
    </div>
  );
}

export default function CheckoutReviewPage() {
  return (
    <Suspense fallback={<div className="skeleton m-4 h-40" />}>
      <ReviewForm />
    </Suspense>
  );
}
