"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, type PanInfo } from "framer-motion";
import { Hand } from "lucide-react";
import { cn } from "@/lib/cn";

const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 450;

/** How the deck dresses each card. "none" = the card brings its own background. */
type Tone = "light" | "dark" | "none";

const TONES: Record<Tone, string> = {
  light: "rounded-[24px] bg-white p-5 shadow-[0_18px_36px_-22px_rgba(44,66,50,0.5)] ring-1 ring-deep/5",
  dark: "rounded-[22px] border border-white/12 bg-[#34503c] p-5 shadow-[0_18px_36px_-20px_rgba(0,0,0,0.5)]",
  none: "",
};

/**
 * A stacked deck of cards. Swipe the top card left/right (or tap the dots,
 * or use the arrow keys) to send it to the back and reveal the next one.
 * Phones only by default (pages show a grid from md up); `all` shows it everywhere.
 */
export function SwipeDeck({
  items,
  tone = "light",
  label = "Cards",
  all = false,
  className,
}: {
  items: ReactNode[];
  tone?: Tone;
  label?: string;
  /** Show on every screen size (default: phones only). */
  all?: boolean;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  // A swipe shouldn't also count as a tap on a link inside the card.
  const dragged = useRef(false);
  const n = items.length;
  if (!n) return null;

  const go = (step: number) => {
    setTouched(true);
    setIndex((i) => (i + step + n) % n);
  };

  function onDragEnd(_: unknown, info: PanInfo) {
    window.setTimeout(() => (dragged.current = false), 50);
    if (Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
      go(info.offset.x < 0 ? 1 : -1);
    }
  }

  const dark = tone === "dark";

  return (
    <div
      className={cn(!all && "md:hidden", "outline-none", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      {/* Every card shares one grid cell, so the deck is as tall as its tallest card. */}
      <div className="relative grid px-2 pb-6 pt-1">
        {items.map((node, i) => {
          const depth = (i - index + n) % n;
          const top = depth === 0;
          const shown = Math.min(depth, 2);
          return (
            <motion.div
              key={i}
              className={cn("[grid-area:1/1] select-none", top ? "cursor-grab active:cursor-grabbing" : "pointer-events-none")}
              style={{ zIndex: n - depth, touchAction: "pan-y" }}
              drag={top && n > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.85}
              onDragStart={() => (dragged.current = true)}
              onDragEnd={onDragEnd}
              onClickCapture={(e) => {
                if (dragged.current) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              whileDrag={{ scale: 1.02 }}
              initial={false}
              animate={{
                x: 0,
                y: shown * 14,
                scale: 1 - shown * 0.05,
                rotate: [0, -3, 3][shown],
                opacity: depth > 2 ? 0 : 1,
              }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              aria-hidden={!top}
            >
              <div className={cn("h-full", TONES[tone])}>{node}</div>
            </motion.div>
          );
        })}
      </div>

      {n > 1 ? (
        <div className="mt-1 flex flex-col items-center gap-2 px-2">
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show card ${i + 1}`}
                aria-current={i === index}
                onClick={() => {
                  setTouched(true);
                  setIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5" : "w-1.5",
                  dark ? (i === index ? "bg-honey" : "bg-white/30") : i === index ? "bg-deep" : "bg-deep/20",
                )}
              />
            ))}
          </div>
          <p className={cn("flex items-center gap-1.5 text-[11px] italic", dark ? "text-white/55" : "text-deep/45")}>
            <motion.span
              aria-hidden
              animate={touched ? { x: 0 } : { x: [0, -5, 5, 0] }}
              transition={{ duration: 1.6, repeat: touched ? 0 : Infinity }}
              className="inline-flex"
            >
              <Hand size={11} />
            </motion.span>
            Swipe right or left{touched ? ` · ${index + 1} of ${n}` : " to see more"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
