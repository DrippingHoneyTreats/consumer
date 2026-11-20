"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassReveal } from "@/components/brand/GlassReveal";

const SPLASH_KEY = "dht-app-splash-seen";
/** How long the frosted glass rests over the page before gliding apart. */
const CLOSED_MS = 700;
/** Safety net: never keep the page covered longer than this. */
const MAX_MS = 4000;

type Phase = "closed" | "opening" | "done";

/**
 * Wraps the whole app shell. Starts with two frosted-glass panes over the
 * page (same on SSR + first paint), which then glide apart left and right
 * to reveal it. Once per tab session; reduced-motion users get a quick fade.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("closed");
  const reduce = useReducedMotion();

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      /* private mode */
    }
    setPhase("done");
  }, []);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) {
      setPhase("done");
      return;
    }
    const open = window.setTimeout(() => (reduce ? finish() : setPhase("opening")), reduce ? 150 : CLOSED_MS);
    const safety = window.setTimeout(finish, MAX_MS);
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(safety);
    };
  }, [finish, reduce]);

  const covered = phase !== "done";

  return (
    <>
      <AnimatePresence>
        {covered ? (
          <motion.div
            key="glass"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Dripping Honey Treats"
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.3 : 0.2 }}
            className="fixed inset-0 z-[100]"
          >
            <GlassReveal opening={phase === "opening"} onDone={finish} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        className="app-shell"
        aria-hidden={covered || undefined}
        initial={false}
        // The page settles gently into focus as the glass parts.
        animate={phase === "opening" ? { scale: [1.02, 1] } : { scale: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
