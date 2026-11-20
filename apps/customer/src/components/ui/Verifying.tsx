"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const SWEET_LINES = ["Hold tight…", "Whisking things up…", "Almost there…", "Adding a drizzle of honey…"];

/** Three bouncing honey drops. */
function HoneyDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-end gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-2 w-2 rounded-full bg-honey"
          animate={{ y: [0, -6, 0], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/**
 * Full-screen "Verifying…" overlay. Pass `done` to flip it into a
 * celebratory tick just before navigating away.
 */
export function VerifyingOverlay({ open, text = "Verifying…", done = false }: { open: boolean; text?: string; done?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [line, setLine] = useState(0);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open || done) return;
    setLine(0);
    const t = window.setInterval(() => setLine((n) => (n + 1) % SWEET_LINES.length), 1600);
    return () => clearInterval(t);
  }, [open, done]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="verifying"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-cream/70 px-6 backdrop-blur-md"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.9, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="flex w-full max-w-xs flex-col items-center rounded-[32px] bg-white px-6 py-8 text-center shadow-[var(--shadow-float)] ring-1 ring-deep/5"
          >
            <div className="relative flex h-20 w-20 items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                {done ? (
                  <motion.span
                    key="done"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-deep text-white"
                  >
                    <Check size={36} strokeWidth={3} />
                  </motion.span>
                ) : (
                  <motion.span key="spin" exit={{ scale: 0.6, opacity: 0 }} className="absolute inset-0">
                    <motion.span
                      className="absolute inset-0 rounded-full border-[5px] border-sage-soft border-t-deep"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">🍯</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <p className="mt-5 font-display text-2xl text-deep">{done ? "Verified!" : text}</p>
            <div className="mt-2 h-5 text-sm text-deep/55">
              {done ? (
                <span>Sweet, you&apos;re in.</span>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={line}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="block"
                  >
                    {SWEET_LINES[line]}
                  </motion.span>
                </AnimatePresence>
              )}
            </div>
            {!done ? <HoneyDots className="mt-4" /> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Small "Verifying…" line to place under a field. */
export function VerifyingInline({ show, text = "Verifying…", className }: { show: boolean; text?: string; className?: string }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.p
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          role="status"
          aria-live="polite"
          className={cn("flex items-center justify-center gap-2 pt-3 text-sm font-semibold text-tea", className)}
        >
          <HoneyDots />
          {text}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
