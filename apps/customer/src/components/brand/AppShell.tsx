"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CurtainIntro } from "@/components/brand/CurtainIntro";

const SPLASH_KEY = "dht-app-splash-seen";
/** Short beat with the curtains closed (lets the first screen render behind them). */
const CLOSED_MS = 450;
/** Safety net: never keep the app covered longer than this. */
const MAX_MS = 4000;

type Phase = "closed" | "opening" | "done";

/**
 * Wraps the whole app shell. Starts with theatre curtains closed (same on
 * SSR + first client paint, so home never flashes), then opens them to
 * reveal the app with a gentle "walking into the room" zoom. Once per tab
 * session; reduced-motion users get a quick fade instead.
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
    const open = window.setTimeout(() => setPhase(reduce ? "done" : "opening"), reduce ? 150 : CLOSED_MS);
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
            key="curtain"
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to Dripping Honey Treats"
            initial={false}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.3 : 0.15 }}
            className="fixed inset-0 z-[100]"
            // Solid until the drapes start moving, so nothing peeks through on first paint.
            style={{ background: phase === "closed" ? "#2c4532" : "transparent" }}
          >
            <CurtainIntro opening={phase === "opening"} onDone={finish} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        className="app-shell"
        aria-hidden={covered || undefined}
        // Hidden while closed; visible behind the drapes as they open.
        style={phase === "closed" ? { visibility: "hidden" } : undefined}
        initial={false}
        animate={phase === "opening" ? { scale: [1.06, 1], opacity: [0.75, 1] } : { scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
