"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox, ShoppingBag } from "lucide-react";
import { apiClient } from "@/lib/api";
import { asArray } from "@/lib/data";
import { splitOrders } from "@/lib/order-status";
import type { Order } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { useCartActions } from "@/hooks/useCartActions";
import { EmptyState, OfflineState } from "@/components/ui/EmptyState";
import { ColumnLoader } from "@/components/ui/ColumnLoader";
import {
  ArrowPill,
  CtaBanner,
  EditorialHero,
  EditorialPage,
  ProcessSteps,
  SectionIntro,
  StatCard,
} from "@/components/editorial/Editorial";
import { ORDER_STEPS } from "@/components/editorial/content";
import { SwipeDeck } from "@/components/editorial/SwipeDeck";
import { AuthGateSheet } from "@/components/auth/AuthGateSheet";
import { toast } from "@/components/ui/Toast";
import { CurrentCheckoutPanel } from "@/components/orders/CurrentCheckoutPanel";
import { OrderListCard } from "@/components/orders/OrderListCard";
import { useLineEditor } from "@/components/orders/LineEditor";
import { UnderlineTabs } from "@/components/orders/UnderlineTabs";

type Tab = "current" | "ongoing" | "completed";

const tabs: { key: Tab; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
];

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const guestItems = useCartStore((s) => s.guestItems);
  const updateGuestQty = useCartStore((s) => s.updateGuestQty);
  const draft = useCartStore((s) => s.draft);
  const refreshDraft = useCartStore((s) => s.refreshDraft);
  const mergeGuest = useCartStore((s) => s.mergeGuest);
  const orderNote = useCartStore((s) => s.orderNote);
  const { setQty } = useCartActions();
  const editor = useLineEditor({
    onSaved: () => {
      void refreshDraft();
      setNonce((n) => n + 1);
    },
  });
  const [tab, setTab] = useState<Tab>("current");
  const [orders, setOrders] = useState<Order[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [nonce, setNonce] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setState("ready");
      return;
    }
    setState((st) => (st === "ready" ? st : "loading"));
    void Promise.all([
      apiClient.get<Order[] | { data: Order[] }>("/orders", { tab: "ongoing" }),
      apiClient.get<Order[] | { data: Order[] }>("/orders", { tab: "completed" }),
      apiClient.get<Order[] | { data: Order[] }>("/orders", { tab: "cancelled" }),
    ])
      .then(([ongoing, completed, cancelled]) => {
        const merged: Order[] = [
          ...asArray<Order>(ongoing),
          ...asArray<Order>(completed),
          ...asArray<Order>(cancelled),
        ];
        const byId = new Map<string, Order>();
        for (const o of merged) byId.set(o.id, o);
        setOrders([...byId.values()]);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [user, nonce]);

  // After onboarding, continue into checkout when ?checkout=1
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "1") return;
    router.replace("/orders");
    void startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const buckets = useMemo(() => splitOrders(orders), [orders]);

  // Keep statuses fresh: refresh when they come back to the tab, and every
  // 30s while something is in progress (so a delivered order moves to Completed).
  const hasOngoing = buckets.ongoing.length > 0;
  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      if (document.visibilityState === "visible") setNonce((n) => n + 1);
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    const t = hasOngoing ? window.setInterval(refresh, 30_000) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      if (t) window.clearInterval(t);
    };
  }, [user, hasOngoing]);

  const guestTotal = guestItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const showGuestCart = guestItems.length > 0;
  const showDraftOrder =
    !showGuestCart &&
    !!draft &&
    (draft.status === "draft" || draft.status === "pending_payment") &&
    (draft.items?.length ?? 0) > 0;
  const draftFromApi = buckets.draft.find((o) => (o.items?.length ?? 0) > 0) ?? null;
  const activeDraft = showDraftOrder ? draft! : draftFromApi;

  const hasCurrent = showGuestCart || !!activeDraft;
  const loading = state === "loading";
  const checkoutTotal = showGuestCart ? guestTotal : (activeDraft?.total ?? 0);

  async function reorder(id: string) {
    try {
      const order = await apiClient.post<Order>(`/orders/${id}/reorder`);
      toast.success("Added to your draft order.");
      setTab("current");
      window.location.href = `/orders/${order.id}`;
    } catch {
      toast.error("Could not reorder.");
    }
  }

  function onGuestQty(key: string, qty: number) {
    const line = guestItems.find((l) => `${l.itemId}-${l.variantId ?? ""}` === key);
    if (!line) return;
    updateGuestQty(line.itemId, line.variantId, qty);
  }

  // Show the new quantity at once; the server confirms in the background.
  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({});
  const [updatingQty, setUpdatingQty] = useState(0);
  async function onDraftQty(lineId: string, qty: number) {
    if (!activeDraft) return;
    setQtyOverride((m) => ({ ...m, [lineId]: qty }));
    setUpdatingQty((n) => n + 1);
    try {
      await setQty(activeDraft.id, lineId, qty);
      await refreshDraft();
      setNonce((n) => n + 1);
    } finally {
      setUpdatingQty((n) => n - 1);
      setQtyOverride((m) => {
        const next = { ...m };
        delete next[lineId];
        return next;
      });
    }
  }

  /** Change a line's size/options in the details sheet. */
  function editLine(key: string): Promise<void> | void {
    if (showGuestCart) {
      const l = guestItems.find((g) => `${g.itemId}-${g.variantId ?? ""}` === key);
      if (l) return editor.edit({ itemId: l.itemId, variantId: l.variantId, qty: l.qty, image: l.image });
      return;
    }
    const l = activeDraft?.items.find((i) => i.id === key);
    if (l) return editor.edit({ itemId: l.itemId, variantId: l.variantId, qty: l.qty, lineId: l.id, orderId: activeDraft?.id, image: l.item?.images?.[0] });
  }

  async function startCheckout() {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    setPaying(true);
    try {
      let orderId = activeDraft?.id;

      if (guestItems.length) {
        const ok = await mergeGuest();
        orderId = useCartStore.getState().draft?.id;
        if (!ok || !orderId) {
          toast.error("We couldn't save your order. Try again.");
          return;
        }
        if (orderNote.trim()) {
          try {
            await apiClient.patch(`/orders/${orderId}`, { notes: orderNote.trim() });
          } catch {
            /* continue */
          }
        }
      }

      if (!orderId) {
        toast.error("No draft order to pay for.");
        return;
      }

      // Address + user details → final review page calls the payment gateway
      router.push(`/checkout/address?orderId=${orderId}`);
    } finally {
      setPaying(false);
    }
  }

  const currentLines = showGuestCart
    ? guestItems.map((l) => ({
        key: `${l.itemId}-${l.variantId ?? ""}`,
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
        image: l.image,
      }))
    : activeDraft
      ? activeDraft.items
          .filter((l) => qtyOverride[l.id] !== 0)
          .map((l) => ({
          key: l.id,
          name: l.nameSnapshot,
          qty: qtyOverride[l.id] ?? l.qty,
          unitPrice: l.unitPrice,
          image: l.item?.images?.[0],
        }))
      : [];

  return (
    <EditorialPage className="pb-[calc(var(--tab-h)+var(--safe-bottom)+var(--banner-h,0px)+24px)]">
      <EditorialHero
        className="md:pt-4"
        pill={<><ShoppingBag size={13} /> Your treats</>}
        title={
          <>
            My <span className="italic text-tea">sweet</span> orders
          </>
        }
        text="Your current order, live tracking and past deliveries, all in one place."
        actions={
          <>
            <ArrowPill href="/pastries">Order pastries</ArrowPill>
            {hasCurrent ? (
              <button type="button" onClick={() => setTab("current")} className="text-sm font-semibold text-tea">
                View current order
              </button>
            ) : null}
          </>
        }
        media={
          <StatCard
            className="hidden md:block"
            value={user ? buckets.ongoing.length : "4"}
            label={
              user
                ? `order${buckets.ongoing.length === 1 ? "" : "s"} on the way to you`
                : "simple steps from craving to doorstep"
            }
            tags={
              user
                ? [
                    hasCurrent ? "1 order in progress" : "No order in progress",
                    `${buckets.recent.length} completed`,
                    "WhatsApp updates",
                  ]
                : ["Fresh daily", "Lagos delivery", "Secure payment", "WhatsApp updates"]
            }
          />
        }
      />

      <section>
      <UnderlineTabs id="orders-hub" tabs={tabs} value={tab} onChange={setTab} className="mb-6 md:mb-8" />

      {state === "error" && user ? (
        <OfflineState onRetry={() => setNonce((n) => n + 1)} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + state + String(hasCurrent)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="min-h-[30vh]"
          >
            {tab === "current" ? (
              loading && user && !hasCurrent ? (
                <ColumnLoader columns={1} count={1} aspect="h-56 aspect-auto" />
              ) : hasCurrent ? (
                <CurrentCheckoutPanel
                  title="Checkout"
                  lines={currentLines}
                  total={checkoutTotal}
                  onQtyChange={showGuestCart ? onGuestQty : (key, qty) => void onDraftQty(key, qty)}
                  onEdit={editLine}
                  updating={updatingQty > 0}
                  onPayNow={() => void startCheckout()}
                  paying={paying}
                  userHint={user?.fullName || user?.phone || user?.email || null}
                />
              ) : (
                <TabEmpty actionHref="/pastries" actionLabel="Order now" />
              )
            ) : null}

            {tab === "ongoing" ? (
              loading && user ? (
                <ColumnLoader columns={1} count={2} aspect="h-40 aspect-auto" />
              ) : buckets.ongoing.length === 0 ? (
                <TabEmpty actionHref="/pastries" actionLabel="Browse pastries" />
              ) : (
                <>
                <SwipeDeck
                  tone="none"
                  label="Ongoing orders"
                  items={buckets.ongoing.map((order, i) => (
                    <OrderListCard key={order.id} order={order} mode="ongoing" index={i} />
                  ))}
                />
                <div className="hidden gap-3 md:grid md:grid-cols-2 md:gap-4">
                  {buckets.ongoing.map((order, i) => (
                    <OrderListCard key={order.id} order={order} mode="ongoing" index={i} />
                  ))}
                </div>
                </>
              )
            ) : null}

            {tab === "completed" ? (
              loading && user ? (
                <ColumnLoader columns={1} count={3} aspect="h-36 aspect-auto" />
              ) : buckets.recent.length === 0 ? (
                <TabEmpty actionHref="/pastries" actionLabel="Order now" />
              ) : (
                <>
                <SwipeDeck
                  tone="none"
                  label="Completed orders"
                  items={buckets.recent.map((order, i) => (
                    <OrderListCard key={order.id} order={order} mode="completed" index={i} onReorder={() => reorder(order.id)} />
                  ))}
                />
                <div className="hidden gap-3 md:grid md:grid-cols-2 md:gap-4">
                  {buckets.recent.map((order, i) => (
                    <OrderListCard
                      key={order.id}
                      order={order}
                      mode="completed"
                      index={i}
                      onReorder={() => reorder(order.id)}
                    />
                  ))}
                </div>
                </>
              )
            ) : null}
          </motion.div>
        </AnimatePresence>
      )}

      </section>

      {!loading && !hasCurrent && orders.length === 0 ? (
        <>
          <section>
            <SectionIntro
              pill="How it works"
              title={
                <>
                  From craving to <span className="italic text-tea">doorstep</span>
                </>
              }
              text="Ordering takes a couple of minutes. Here's what happens."
            />
            <ProcessSteps steps={ORDER_STEPS} note="Ready to be enjoyed!" />
          </section>
          <CtaBanner
            title="Craving something sweet?"
            text="Fresh, fibre-rich treats baked in small batches in Lagos."
            actions={<ArrowPill href="/pastries" tone="light">Browse pastries</ArrowPill>}
          />
        </>
      ) : null}

      {editor.sheet}

      <AuthGateSheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        returnTo="/orders?checkout=1"
        title="Almost there"
        message="Add your name and number so we can deliver and keep you posted. Your cart stays just as it is."
      />
    </EditorialPage>
  );
}

function TabEmpty({ actionHref, actionLabel }: { actionHref?: string; actionLabel?: string }) {
  return (
    <EmptyState
      compact
      icon={<Inbox size={48} strokeWidth={1.4} />}
      title="Uh-oh! 👀"
      message="Looks like there's nothing here yet."
      actionHref={actionHref}
      actionLabel={actionLabel}
    />
  );
}
