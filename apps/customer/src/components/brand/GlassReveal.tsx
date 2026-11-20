"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";

/**
 * Intro: two frosted-glass panes cover the page (the home screen shows
 * through, softly blurred). A light sheen drifts across the glass, then the
 * panes glide apart to the left and right, revealing the page.
 */

const EASE = [0.65, 0, 0.35, 1] as const;
const OPEN_S = 1.5;

/** Translucent, softly tinted glass; falls back to a light tint if blur isn't supported. */
const GLASS: CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(247,243,238,0.42) 55%, rgba(246,213,208,0.28) 100%)",
  backdropFilter: "blur(22px) saturate(140%)",
  WebkitBackdropFilter: "blur(22px) saturate(140%)",
};

function Pane({ side, opening, onDone }: { side: "left" | "right"; opening: boolean; onDone?: () => void }) {
  const left = side === "left";
  return (
    <motion.div
      aria-hidden
      className="absolute inset-y-0 w-1/2 overflow-hidden will-change-transform"
      style={{ ...GLASS, [left ? "left" : "right"]: 0 }}
      initial={false}
      animate={opening ? { x: left ? "-102%" : "102%" } : { x: "0%" }}
      transition={{ duration: OPEN_S, ease: EASE }}
      onAnimationComplete={opening ? onDone : undefined}
    >
      {/* Bright edge where the panes meet, like the rim of a glass door */}
      <div
        className="absolute inset-y-0 w-px"
        style={{
          [left ? "right" : "left"]: 0,
          background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.95) 80%, transparent)",
          boxShadow: "0 0 18px 2px rgba(255,255,255,0.55)",
        }}
      />
      {/* Slow diagonal sheen gliding across the glass */}
      <motion.div
        className="absolute -inset-y-1/4 w-1/3"
        style={{
          background: "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)",
          filter: "blur(6px)",
        }}
        initial={{ x: "-120%" }}
        animate={{ x: "420%" }}
        transition={{ duration: 2.2, ease: "easeInOut", delay: left ? 0 : 0.25 }}
      />
    </motion.div>
  );
}

export function GlassReveal({ opening, onDone }: { opening: boolean; onDone: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <Pane side="left" opening={opening} onDone={onDone} />
      <Pane side="right" opening={opening} />
    </div>
  );
}
