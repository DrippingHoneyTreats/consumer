"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useCartStore } from "@/store/cart-store";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/ColumnLoader";
import { statusLabel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, X } from "lucide-react";

function CallbackInner() {
  const params = useSearchParams();
  // Flutterwave appends tx_ref / transaction_id / status; Paystack uses reference / trxref.
  const reference = params.get("reference") ?? params.get("tx_ref") ?? params.get("trxref");
  const transactionId = params.get("transaction_id");
  const gatewayStatus = params.get("status");
  const router = useRouter();
  const refreshDraft = useCartStore((s) => s.refreshDraft);
  const [status, setStatus] = useState<string>("pending");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      tries += 1;
      try {
        const res = await apiClient.get<{ status: string; orderId?: string }>(
          `/payments/${reference}/status`,
        );
        if (cancelled) return;
        setStatus(res.status);
        if (res.orderId) setOrderId(res.orderId);
        if (res.status === "success" || res.status === "failed") {
          void refreshDraft();
          return;
        }
      } catch {
        /* retry */
      }
      if (tries < 40) window.setTimeout(poll, 3000);
    };

    void apiClient
      .post<{ status: string; orderId?: string }>("/payments/verify", {
        reference,
        transactionId: transactionId ?? undefined,
        gatewayStatus: gatewayStatus ?? undefined,
      })
      .then((res) => {
        if (cancelled) return;
        setStatus(res.status);
        if (res.orderId) setOrderId(res.orderId);
      })
      .catch(() => {})
      .finally(() => void poll());
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  const success = status === "success";
  const failed = status === "failed";

  return (
    <div className="page-pad-no-tab flex min-h-dvh flex-col px-6">
      <PageHeader title="Payment" backHref="/orders" />
      <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={success ? "ok" : failed ? "fail" : "wait"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
            className="relative mb-6"
          >
            {!success && !failed ? (
              <motion.span
                className="absolute inset-0 rounded-full border-4 border-blush border-t-deep"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <motion.span
                className={cn("absolute inset-0 rounded-full", success ? "bg-sage" : "bg-danger/30")}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.2, repeat: success ? 2 : 0 }}
              />
            )}
            <span
              className={cn(
                "relative flex h-24 w-24 items-center justify-center rounded-full",
                success ? "bg-tea text-white" : failed ? "bg-danger/10 text-danger" : "bg-blush-soft text-deep",
              )}
            >
              {success ? <Check size={44} strokeWidth={3} /> : failed ? <X size={44} strokeWidth={3} /> : <Lock size={34} />}
            </span>
          </motion.div>
        </AnimatePresence>

        <h1 className="font-display text-3xl text-deep">
          {success ? "Payment successful" : failed ? "Payment not completed" : "Confirming your payment…"}
        </h1>
        <p className="mt-2 max-w-xs text-sm text-deep/60">
          {success
            ? "Sharp sharp! Your treats are on the way to the kitchen. We'll update you on WhatsApp."
            : failed
              ? "Your payment didn't go through. You can retry from your order when you're ready."
              : "Hold on a moment, please don't pay twice."}
        </p>
        <p className="mt-1 text-xs text-deep/40">{statusLabel(status)}</p>
        {reference ? <p className="mt-3 rounded-full bg-off-white px-3 py-1 text-[11px] text-deep/50">Ref: {reference}</p> : null}

        <div className="mt-8 w-full max-w-xs space-y-3">
          {orderId ? (
            <Button
              fullWidth
              variant="dark"
              onClick={() => router.push(success ? `/orders/${orderId}/track` : `/orders/${orderId}`)}
            >
              {success ? "Track order" : "View order"}
            </Button>
          ) : (
            <Button fullWidth variant="dark" onClick={() => router.push("/orders")}>
              Go to orders
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="page-pad">
          <PageSkeleton variant="detail" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
