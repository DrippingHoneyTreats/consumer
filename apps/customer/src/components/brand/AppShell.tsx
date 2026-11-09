"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoLoader } from "@/components/brand/LogoLoader";

const SPLASH_KEY = "dht-app-splash-seen";
const SPLASH_MS = 5000;

type Phase = "covering" | "done";

/**
 * Wraps the whole app shell. Covers the UI from the first paint so home
 * never flashes before the welcome logo. Once per tab session.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  // Start covered — same on SSR + first client paint (no home flash).
  const [phase, setPhase] = useState<Phase>("covering");

  useEffect(() => {
    let t = 0;
    try {
      if (sessionStorage.getItem(SPLASH_KEY) === "1") {
        setPhase("done");
        return;
      }
      t = window.setTimeout(() => {
        sessionStorage.setItem(SPLASH_KEY, "1");
        setPhase("done");
      }, SPLASH_MS);
    } catch {
      setPhase("done");
    }
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, []);

  const covering = phase === "covering";

  return (
    <>
      <AnimatePresence>
        {covering ? (
          <motion.div
            key="app-splash"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Dripping Honey Treats"
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[linear-gradient(180deg,#fff8f4_0%,var(--off-white)_45%,#f3eee5_100%)]"
          >
            <LogoLoader label="Welcome to Dripping Honey Treats" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className="app-shell"
        aria-hidden={covering || undefined}
        // Keep shell mounted (so home can load) but invisible until splash ends.
        style={covering ? { visibility: "hidden" } : undefined}
      >
        {children}
      </div>
    </>
  );
}
