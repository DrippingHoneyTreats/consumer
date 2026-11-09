"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { ToastHost } from "@/components/ui/Toast";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { AppShell } from "@/components/brand/AppShell";
import { TabBar } from "@/components/nav/TabBar";
import { CartBanner } from "@/components/nav/CartBanner";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const userId = useAuthStore((s) => s.user?.id);
  const hydrated = useAuthStore((s) => s.hydrated);
  const mergeGuest = useCartStore((s) => s.mergeGuest);
  const setDraft = useCartStore((s) => s.setDraft);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (userId) void mergeGuest();
    else if (hydrated) setDraft(null);
  }, [userId, hydrated, mergeGuest, setDraft]);

  return (
    <MotionConfig reducedMotion="user">
      <AppShell>
        <main id="app-scroll" className="app-scroll">
          <div className="app-frame">{children}</div>
        </main>
        <CartBanner />
        <TabBar />
      </AppShell>
      <PwaRegister />
      <ToastHost />
    </MotionConfig>
  );
}
